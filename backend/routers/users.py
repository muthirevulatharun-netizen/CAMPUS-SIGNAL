from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Sector, StaffAssignment, Complaint
from routers.auth import get_current_user, require_roles
from schemas import StaffAssignmentCreate, StaffCreate, UserUpdate
from audit import record_admin_action
import uuid

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    users = db.query(User).filter(User.is_active == True).all()
    return [
        {
            "id": u.id, "full_name": u.full_name, "email": u.email,
            "role": u.role, "department": u.department,
            "is_active": u.is_active, "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]


@router.get("/me")
def get_current_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "department": current_user.department,
        "is_active": current_user.is_active,
        "phone": current_user.phone,
        "profile_photo": current_user.profile_photo,
    }


@router.get("/staff")
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
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
        pending_count = db.query(Complaint).filter(
            Complaint.assigned_staff_id == s.id,
            Complaint.status.notin_(["resolved", "closed"]),
        ).count()
        resolved_complaints = db.query(Complaint).filter(
            Complaint.assigned_staff_id == s.id,
            Complaint.resolved_at.isnot(None),
        ).all()
        resolution_hours = [
            (complaint.resolved_at - complaint.created_at).total_seconds() / 3600
            for complaint in resolved_complaints
            if complaint.created_at and complaint.resolved_at
        ]

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
            "pending_complaints": pending_count,
            "average_resolution_hours": round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else 0,
        })
    return result


@router.post("/staff", status_code=201)
def create_staff(
    payload: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    email = str(payload.email).lower()
    if db.query(User.id).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    staff = User(
        full_name=payload.full_name.strip(),
        email=email,
        role="staff",
        department=payload.department,
    )
    db.add(staff)
    db.flush()
    record_admin_action(db, current_user.id, "staff_created", f"Created staff account for {staff.full_name}")
    db.commit()
    return {
        "id": staff.id,
        "full_name": staff.full_name,
        "email": staff.email,
        "role": staff.role,
        "department": staff.department,
        "is_active": staff.is_active,
        "sectors": [],
        "assigned_complaints": 0,
        "resolved_complaints": 0,
        "pending_complaints": 0,
        "average_resolution_hours": 0,
    }


@router.get("/{id}")
def get_user(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.id != id:
        raise HTTPException(status_code=403, detail="You can only view your own profile")
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id, "full_name": user.full_name, "email": user.email,
        "role": user.role, "department": user.department, "is_active": user.is_active,
        "phone": user.phone, "profile_photo": user.profile_photo
    }


@router.patch("/{id}")
def update_user(
    id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = payload.model_dump(exclude_unset=True)
    if "role" in updates:
        raise HTTPException(
            status_code=403,
            detail="User roles cannot be changed through this endpoint",
        )
    new_email = updates.get("email")
    if new_email and new_email != user.email:
        duplicate = db.query(User.id).filter(User.email == str(new_email), User.id != user.id).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="That email is already assigned to another user")
        updates["email"] = str(new_email)
    changes = ", ".join(f"{key}: {getattr(user, key)} → {value}" for key, value in updates.items())
    for key, value in updates.items():
        setattr(user, key, value)
    record_admin_action(db, current_user.id, "user_updated", f"Updated {user.email}: {changes or 'no changes'}")
    db.commit()
    return {"message": "Updated"}


@router.post("/staff/assign")
def assign_staff_to_sector(
    payload: StaffAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    staff_id = payload.staff_user_id
    sector_id = payload.sector_id
    staff = db.query(User).filter(
        User.id == staff_id, User.role == "staff", User.is_active.is_(True)
    ).first()
    sector = db.query(Sector).filter(Sector.id == sector_id, Sector.is_active.is_(True)).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Active staff user not found")
    if not sector:
        raise HTTPException(status_code=404, detail="Active sector not found")
    existing = db.query(StaffAssignment).filter(
        StaffAssignment.staff_user_id == staff_id,
        StaffAssignment.sector_id == sector_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Staff member is already assigned to this sector")
    db.add(StaffAssignment(
        id=str(uuid.uuid4()),
        staff_user_id=staff_id,
        sector_id=sector_id
    ))
    record_admin_action(
        db,
        current_user.id,
        "staff_assignment",
        f"Assigned {staff.full_name} to sector {sector.name}",
    )
    db.commit()
    return {"message": "Assigned", "staff_user_id": staff_id, "sector_id": sector_id}
