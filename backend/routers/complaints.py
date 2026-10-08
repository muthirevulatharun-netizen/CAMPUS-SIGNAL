from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from models import Complaint, StatusHistory, User, Sector, Notification, StaffAssignment, IssueGroup, ComplaintGroupMember
from schemas import ComplaintCreate, ComplaintResponse
from services.classifier import classify
from services.grouping import process_complaint_grouping
from services.priority_engine import calculate_priority_score, get_priority_label
from routers.auth import get_current_user, get_optional_user
import random
from datetime import datetime
import uuid

router = APIRouter(prefix="/complaints", tags=["complaints"])


def gen_id():
    return str(uuid.uuid4())


@router.post("/classify")
def classify_complaint(payload: dict):
    """Classify a complaint text without saving it."""
    title = payload.get("title", "")
    description = payload.get("description", "")
    result = classify(title, description)
    return result


@router.post("", response_model=ComplaintResponse)
def create_complaint(
    complaint: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    # Use current user or fallback to first student
    if current_user:
        student = current_user
    else:
        student = db.query(User).filter(User.role == "student").first()
    if not student:
        raise HTTPException(400, "No student user found")

    # Classify
    classification = classify(complaint.title, complaint.description)
    sector = db.query(Sector).filter(Sector.name == classification['sector']).first()
    if not sector:
        sector = db.query(Sector).first()

    # Priority scoring
    base_score = calculate_priority_score(severity=50, frequency=30, affected_users=10, recent_increase=20, location_spread=20)
    priority_label = get_priority_label(base_score)

    # Complaint number
    year = datetime.now().year
    count = db.query(Complaint).count()
    complaint_number = f"CS-{year}-{1000 + count + 1:04d}"

    new_complaint = Complaint(
        id=gen_id(),
        complaint_number=complaint_number,
        student_id=student.id,
        title=complaint.title,
        description=complaint.description,
        location=complaint.location or "Campus",
        category=classification['category'],
        sector_id=sector.id,
        priority=priority_label,
        priority_score=round(base_score, 1),
        severity=priority_label,
        status="submitted"
    )
    db.add(new_complaint)
    db.flush()

    # Auto-assign staff
    assignment = db.query(StaffAssignment).filter(StaffAssignment.sector_id == sector.id).first()
    if assignment:
        new_complaint.assigned_staff_id = assignment.staff_user_id
        new_complaint.status = "assigned"
        # Notify staff
        staff_user = db.query(User).filter(User.id == assignment.staff_user_id).first()
        if staff_user:
            notification = Notification(
                id=gen_id(),
                recipient_user_id=staff_user.id,
                complaint_id=new_complaint.id,
                title=f"{'🔴' if priority_label in ('high','critical') else '🟡'} New Complaint Assigned",
                message=f"{new_complaint.title} — {new_complaint.location}. Priority: {priority_label.upper()}.",
                type="NEW_COMPLAINT"
            )
            db.add(notification)

    # Status history
    history = StatusHistory(
        id=gen_id(),
        complaint_id=new_complaint.id,
        old_status="",
        new_status=new_complaint.status,
        changed_by=student.id,
        comment="Complaint submitted via Campus Signal"
    )
    db.add(history)
    db.commit()
    db.refresh(new_complaint)

    # Process grouping
    try:
        group = process_complaint_grouping(db, new_complaint)
        if group and group.priority != new_complaint.priority:
            old_p = new_complaint.priority
            new_complaint.priority = group.priority
            new_complaint.priority_score = group.complaint_count * 10.0
            db.commit()
            db.refresh(new_complaint)
    except Exception:
        pass

    return db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector),
        joinedload(Complaint.assigned_staff),
        joinedload(Complaint.status_history)
    ).filter(Complaint.id == new_complaint.id).first()


@router.get("", response_model=List[ComplaintResponse])
def get_complaints(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    sector_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100)
):
    query = db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector),
        joinedload(Complaint.assigned_staff)
    )

    # Role-based filtering
    if current_user:
        if current_user.role == "student":
            query = query.filter(Complaint.student_id == current_user.id)
        elif current_user.role == "staff":
            # Get staff's sectors
            assignments = db.query(StaffAssignment).filter(StaffAssignment.staff_user_id == current_user.id).all()
            sector_ids = [a.sector_id for a in assignments]
            if sector_ids:
                query = query.filter(Complaint.sector_id.in_(sector_ids))

    # Optional filters
    if sector_id:
        query = query.filter(Complaint.sector_id == sector_id)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if status:
        query = query.filter(Complaint.status == status)
    if search:
        query = query.filter(
            Complaint.title.ilike(f"%{search}%") |
            Complaint.description.ilike(f"%{search}%") |
            Complaint.location.ilike(f"%{search}%")
        )

    return query.order_by(Complaint.created_at.desc()).limit(limit).all()


@router.get("/{id}", response_model=ComplaintResponse)
def get_complaint(id: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector),
        joinedload(Complaint.assigned_staff),
        joinedload(Complaint.status_history)
    ).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(404, "Complaint not found")
    return complaint


@router.patch("/{id}/status")
def update_status(
    id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(404, "Complaint not found")

    new_status = payload.get("status")
    comment = payload.get("comment", f"Status changed to {new_status}")
    if not new_status:
        raise HTTPException(400, "status is required")

    old_status = complaint.status
    complaint.status = new_status
    complaint.updated_at = datetime.utcnow()

    if new_status == "resolved":
        complaint.resolved_at = datetime.utcnow()

    changer = current_user or db.query(User).first()
    history = StatusHistory(
        id=gen_id(),
        complaint_id=id,
        old_status=old_status,
        new_status=new_status,
        changed_by=changer.id if changer else complaint.student_id,
        comment=comment
    )
    db.add(history)

    # Notify student
    notification = Notification(
        id=gen_id(),
        recipient_user_id=complaint.student_id,
        complaint_id=complaint.id,
        title=f"Complaint Update: {complaint.complaint_number}",
        message=f"Your complaint '{complaint.title}' status changed to {new_status.replace('_', ' ').title()}.",
        type="STATUS_CHANGED"
    )
    db.add(notification)
    db.commit()

    return {"message": "Status updated", "new_status": new_status}


@router.patch("/{id}/assign")
def assign_complaint(
    id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(404, "Complaint not found")

    staff_id = payload.get("staff_id")
    staff = db.query(User).filter(User.id == staff_id, User.role == "staff").first()
    if not staff:
        raise HTTPException(404, "Staff not found")

    old_staff = complaint.assigned_staff_id
    complaint.assigned_staff_id = staff_id
    if complaint.status == "submitted":
        complaint.status = "assigned"

    # Notify new staff
    notification = Notification(
        id=gen_id(),
        recipient_user_id=staff_id,
        complaint_id=complaint.id,
        title=f"Complaint Assigned to You",
        message=f"You have been assigned: '{complaint.title}'. Priority: {complaint.priority.upper()}.",
        type="ASSIGNMENT"
    )
    db.add(notification)
    db.commit()
    return {"message": "Assigned successfully"}
