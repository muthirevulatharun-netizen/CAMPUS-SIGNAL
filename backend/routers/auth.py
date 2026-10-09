from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field, ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db, settings
from models import User
from schemas import UserResponse
from services.admin_provisioning import normalize_email

router = APIRouter(prefix="/auth", tags=["auth"])
ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 12
JWT_SECRET = settings.JWT_SECRET or token_urlsafe(32)


class DevLoginRequest(BaseModel):
    email: EmailStr


class GoogleLoginRequest(BaseModel):
    token: str = Field(min_length=1)


class VerifiedGoogleClaims(BaseModel):
    aud: str
    email: EmailStr
    email_verified: bool
    sub: str = Field(min_length=1)
    name: Optional[str] = None
    picture: Optional[str] = None


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
        claims = VerifiedGoogleClaims.model_validate(response.json())
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=401, detail="Google returned an invalid token response") from exc
    email = normalize_email(str(claims.email))
    if claims.aud != settings.GOOGLE_CLIENT_ID or not claims.email_verified:
        raise HTTPException(status_code=401, detail="Google account could not be verified")

    google_id = claims.sub
    google_user = db.query(User).filter(User.google_id == google_id).first()
    matching_email_users = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == email)
        .all()
    )
    if len(matching_email_users) > 1:
        raise HTTPException(status_code=409, detail="Multiple accounts use this email; contact an administrator")
    email_user = matching_email_users[0] if matching_email_users else None
    if google_user and email_user and google_user.id != email_user.id:
        raise HTTPException(status_code=409, detail="Google identity is linked to a different account")

    user = google_user or email_user
    if user and not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive")
    if not user:
        user = User(
            email=email,
            full_name=claims.name or email.split("@")[0],
            role="student",
            google_id=google_id,
            profile_photo=claims.picture,
        )
        db.add(user)
    else:
        if email_user and email_user.google_id and email_user.google_id != google_id:
            raise HTTPException(status_code=409, detail="This email is linked to a different Google account")
        user.email = email
        user.google_id = google_id
        user.full_name = claims.name or user.full_name
        user.profile_photo = claims.picture or user.profile_photo

    admin_email = normalize_email(settings.ADMIN_EMAIL)
    if admin_email and email == admin_email:
        user.role = "admin"

    try:
        db.flush()
        result = _login_response(user)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Account could not be linked safely; please sign in again") from exc
    return result
