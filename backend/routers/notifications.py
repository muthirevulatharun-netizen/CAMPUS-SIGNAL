from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Notification
from routers.auth import get_current_user, get_optional_user
from models import User
from typing import Optional

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if not current_user:
        return []
    notifs = db.query(Notification).filter(
        Notification.recipient_user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "complaint_id": n.complaint_id,
            "issue_group_id": n.issue_group_id,
            "created_at": n.created_at.isoformat() if n.created_at else None
        }
        for n in notifs
    ]


@router.patch("/{id}/read")
def mark_read(id: str, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marked as read"}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    if current_user:
        db.query(Notification).filter(
            Notification.recipient_user_id == current_user.id,
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()
    return {"message": "All marked as read"}
