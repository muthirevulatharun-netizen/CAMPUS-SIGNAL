from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db, settings
from models import User
from schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 12
JWT_SECRET = settings.JWT_SECRET or token_urlsafe(32)


class DevLoginRequest(BaseModel):
    email: EmailStr


class GoogleLoginRequest(BaseModel):
    token: str = Field(min_length=1)


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)
    return jwt.encode({"sub": user.id, "exp": expires_at}, JWT_SECRET, algorithm=ALGORITHM)


def _user_from_authorization(authorization: Optional[str], db: Session) -> Optional[User]:
    if not authorization:
        return None
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account is inactive or unavailable")
    return user


async def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _user_from_authorization(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_roles(*roles: str):
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action")
        return current_user

    return role_dependency


def _login_response(user: User):
    user.last_login = datetime.utcnow()
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
        },
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/dev-login")
def dev_login(payload: DevLoginRequest, db: Session = Depends(get_db)):
    if not settings.ALLOW_DEV_LOGIN:
        raise HTTPException(status_code=403, detail="Development login is disabled")
    email = str(payload.email).lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, full_name=email.split("@")[0].replace(".", " ").title(), role="student")
        db.add(user)
        db.flush()
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive")
    response = _login_response(user)
    db.commit()
    return response


@router.post("/google")
def google_auth(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    try:
        response = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.token},
            timeout=5.0,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Google sign-in verification is unavailable") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Google ID token is invalid or expired")
    try:
        claims = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Google returned an invalid token response") from exc
    email = claims.get("email")
    email_verified = claims.get("email_verified") in (True, "true")
    if claims.get("aud") != settings.GOOGLE_CLIENT_ID or not email or not email_verified:
        raise HTTPException(status_code=401, detail="Google account could not be verified")

    email = email.lower()
    google_id = claims.get("sub")
    if not google_id:
        raise HTTPException(status_code=401, detail="Google account identifier is missing")
    user = db.query(User).filter(or_(User.google_id == google_id, User.email == email)).first()
    if user and not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive")
    if not user:
        user = User(
            email=email,
            full_name=claims.get("name") or email.split("@")[0],
            role="student",
            google_id=google_id,
            profile_photo=claims.get("picture"),
        )
        db.add(user)
    else:
        user.google_id = google_id
        user.full_name = claims.get("name") or user.full_name
        user.profile_photo = claims.get("picture") or user.profile_photo
    result = _login_response(user)
    db.commit()
    return result
