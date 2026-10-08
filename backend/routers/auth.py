from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserResponse
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])


async def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    user = db.query(User).filter(User.id == token).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    return db.query(User).filter(User.id == token).first()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/dev-login")
def dev_login(payload: dict, db: Session = Depends(get_db)):
    """Dev-only login endpoint. Accepts {email: '...'} JSON body."""
    email = payload.get("email", "")
    if not email:
        raise HTTPException(400, "email is required")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, full_name=email.split('@')[0].replace('.', ' ').title(), role="student")
        db.add(user)
        db.commit()
        db.refresh(user)
    return {
        "token": user.id,
        "user": {"id": user.id, "email": user.email, "role": user.role, "full_name": user.full_name}
    }


@router.post("/google")
def google_auth(payload: dict, db: Session = Depends(get_db)):
    """Google OAuth placeholder for prototype."""
    token = payload.get("token", "")
    # In production this verifies the Google ID token
    # For prototype: derive email from token or use placeholder
    email = payload.get("email", f"google_{token[:8]}@campus.edu")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=payload.get("name", "Campus Student"),
            role="student",
            google_id=token,
            profile_photo=payload.get("picture")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"token": user.id, "user": {"id": user.id, "email": user.email, "role": user.role, "full_name": user.full_name}}
