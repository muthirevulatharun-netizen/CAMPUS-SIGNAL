from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Sector, StaffAssignment, Complaint
from routers.auth import get_optional_user
from typing import Optional

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_active == True).all()
    return [
        {
            "id": u.id, "full_name": u.full_name, "email": u.email,
            "role": u.role, "department": u.department,
            "is_active": u.is_active, "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]


@router.get("/staff")
def list_staff(db: Session = Depends(get_db)):
    staff = db.query(User).filter(User.role == "staff", User.is_active == True).all()
    result = []
    for s in staff:
        assignments = db.query(StaffAssignment).filter(StaffAssignment.staff_user_id == s.id).all()
        sectors = []
        for a in assignments:
            sector = db.query(Sector).filter(Sector.id == a.sector_id).first()
            if sector:
                sectors.append({"id": sector.id, "name": sector.name, "icon": sector.icon, "color": sector.color})

        assigned_count = db.query(Complaint).filter(Complaint.assigned_staff_id == s.id).count()
        resolved_count = db.query(Complaint).filter(
            Complaint.assigned_staff_id == s.id,
            Complaint.status.in_(["resolved", "closed"])
        ).count()

        result.append({
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "role": s.role,
            "department": s.department,
            "is_active": s.is_active,
            "sectors": sectors,
            "assigned_complaints": assigned_count,
            "resolved_complaints": resolved_count,
        })
    return result


@router.get("/{id}")
def get_user(id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        return None
    return {
        "id": user.id, "full_name": user.full_name, "email": user.email,
        "role": user.role, "department": user.department, "is_active": user.is_active,
        "phone": user.phone, "profile_photo": user.profile_photo
    }


@router.patch("/{id}")
def update_user(id: str, payload: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        return {"error": "Not found"}
    for key, val in payload.items():
        if hasattr(user, key) and key not in ("id", "google_id"):
            setattr(user, key, val)
    db.commit()
    return {"message": "Updated"}


@router.post("/staff/assign")
def assign_staff_to_sector(payload: dict, db: Session = Depends(get_db)):
    import uuid
    staff_id = payload.get("staff_user_id")
    sector_id = payload.get("sector_id")
    existing = db.query(StaffAssignment).filter(
        StaffAssignment.staff_user_id == staff_id,
        StaffAssignment.sector_id == sector_id
    ).first()
    if not existing:
        sa = StaffAssignment(
            id=str(uuid.uuid4()),
            staff_user_id=staff_id,
            sector_id=sector_id
        )
        db.add(sa)
        db.commit()
    return {"message": "Assigned"}
