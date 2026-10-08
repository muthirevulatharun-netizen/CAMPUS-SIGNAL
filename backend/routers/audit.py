from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import AdminAction, Complaint, User
from routers.auth import require_roles

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def list_admin_actions(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    records = (
        db.query(AdminAction, User.full_name, Complaint.complaint_number)
        .join(User, User.id == AdminAction.admin_id)
        .outerjoin(Complaint, Complaint.id == AdminAction.complaint_id)
        .order_by(AdminAction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": action.id,
            "admin_id": action.admin_id,
            "admin_name": admin_name,
            "complaint_id": action.complaint_id,
            "complaint_number": complaint_number,
            "action": action.action,
            "description": action.description,
            "created_at": action.created_at.isoformat() if action.created_at else None,
        }
        for action, admin_name, complaint_number in records
    ]
