from io import BytesIO
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import File, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from datetime import date, datetime, time, timedelta
from typing import List, Optional
import logging
from database import get_db
from models import Complaint, ComplaintAttachment, StatusHistory, User, Sector, Notification, StaffAssignment, AdminAction
from schemas import ComplaintAssignment, ComplaintCreate, ComplaintPriorityUpdate, ComplaintResponse, StatusUpdate
from services.classifier import classify
from services.grouping import process_complaint_grouping
from services.priority_engine import calculate_priority_score, get_priority_label
from routers.auth import get_current_user, require_roles
import uuid

router = APIRouter(prefix="/complaints", tags=["complaints"])
logger = logging.getLogger(__name__)
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
IMAGE_FORMATS = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}


def gen_id():
    return str(uuid.uuid4())


@router.post("/classify")
def classify_complaint(payload: dict):
    """Classify a complaint text without saving it."""
    title = payload.get("title", "")
    description = payload.get("description", "")
    result = classify(title, description)
    return result


@router.post("", response_model=ComplaintResponse, status_code=201)
def create_complaint(
    complaint: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student"))
):
    student = current_user
    classification = classify(complaint.title, complaint.description)
    sector = db.query(Sector).filter(Sector.name == classification['sector']).first()
    if not sector:
        raise HTTPException(status_code=500, detail="The detected service sector is not configured")

    base_score = calculate_priority_score(
        severity="medium", frequency=1, affected_users=1, recent_increase=1, location_spread=1
    )
    priority_label = get_priority_label(base_score)

    year = datetime.now().year
    count = db.query(Complaint).count()
    complaint_number = f"CS-{year}-{1000 + count + 1:04d}"

    new_complaint = Complaint(
        id=gen_id(),
        complaint_number=complaint_number,
        student_id=student.id,
        title=complaint.title,
        description=complaint.description,
        location=complaint.location,
        category=classification['category'],
        sector_id=sector.id,
        priority=priority_label,
        priority_score=round(base_score, 1),
        severity=priority_label,
        status="submitted"
    )
    db.add(new_complaint)
    db.flush()

    assignment_load = (
        db.query(Complaint.assigned_staff_id.label("staff_id"), func.count(Complaint.id).label("load"))
        .filter(Complaint.status.notin_(["resolved", "closed"]))
        .group_by(Complaint.assigned_staff_id)
        .subquery()
    )
    assignment = (
        db.query(StaffAssignment)
        .join(User, StaffAssignment.staff_user_id == User.id)
        .outerjoin(assignment_load, assignment_load.c.staff_id == StaffAssignment.staff_user_id)
        .filter(StaffAssignment.sector_id == sector.id, User.is_active.is_(True), User.role == "staff")
        .order_by(func.coalesce(assignment_load.c.load, 0), StaffAssignment.created_at)
        .first()
    )
    if assignment:
        new_complaint.assigned_staff_id = assignment.staff_user_id
        new_complaint.status = "assigned"
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

    history = StatusHistory(
        id=gen_id(),
        complaint_id=new_complaint.id,
        old_status="",
        new_status="submitted",
        changed_by=student.id,
        comment="Complaint submitted via Campus Signal"
    )
    db.add(history)
    if new_complaint.status != "submitted":
        db.add(StatusHistory(
            id=gen_id(),
            complaint_id=new_complaint.id,
            old_status="submitted",
            new_status="assigned",
            changed_by=student.id,
            comment="Automatically assigned to the responsible sector staff",
        ))
    process_complaint_grouping(db, new_complaint)
    db.commit()

    return db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector),
        joinedload(Complaint.assigned_staff),
        joinedload(Complaint.status_history)
    ).filter(Complaint.id == new_complaint.id).first()


@router.get("", response_model=List[ComplaintResponse])
def get_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    sector_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    assigned_staff_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):
    query = db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector),
        joinedload(Complaint.assigned_staff)
    )

    if current_user.role == "student":
        query = query.filter(Complaint.student_id == current_user.id)
    elif current_user.role == "staff":
        sector_ids = [
            row.sector_id for row in
            db.query(StaffAssignment).filter(StaffAssignment.staff_user_id == current_user.id).all()
        ]
        if not sector_ids:
            return []
        query = query.filter(Complaint.sector_id.in_(sector_ids))

    if sector_id:
        query = query.filter(Complaint.sector_id == sector_id)
    if category:
        query = query.filter(Complaint.category == category)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if status:
        query = query.filter(Complaint.status == status)
    if location:
        query = query.filter(Complaint.location == location)
    if assigned_staff_id:
        query = query.filter(Complaint.assigned_staff_id == assigned_staff_id)
    if date_from:
        query = query.filter(Complaint.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        query = query.filter(Complaint.created_at < datetime.combine(date_to + timedelta(days=1), time.min))
    if search:
        query = query.filter(
            Complaint.title.ilike(f"%{search}%") |
            Complaint.description.ilike(f"%{search}%") |
            Complaint.location.ilike(f"%{search}%")
        )

    return query.order_by(Complaint.created_at.desc()).limit(limit).all()


@router.get("/options")
def get_complaint_filter_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    categories = [
        value for (value,) in
        db.query(Complaint.category).filter(Complaint.category.isnot(None)).distinct().order_by(Complaint.category).all()
    ]
    locations = [
        value for (value,) in
        db.query(Complaint.location).filter(Complaint.location.isnot(None)).distinct().order_by(Complaint.location).all()
    ]
    staff = db.query(User).filter(
        User.role == "staff",
        User.is_active.is_(True),
    ).order_by(User.full_name).all()
    return {
        "categories": categories,
        "locations": locations,
        "staff": [{"id": user.id, "full_name": user.full_name} for user in staff],
    }


@router.get("/{id}", response_model=ComplaintResponse)
def get_complaint(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector),
        joinedload(Complaint.assigned_staff),
        joinedload(Complaint.status_history)
    ).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(404, "Complaint not found")
    _ensure_complaint_access(db, current_user, complaint)
    return complaint


@router.patch("/{id}/status")
def update_status(
    id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(404, "Complaint not found")

    _ensure_complaint_access(db, current_user, complaint)
    new_status = payload.status
    if current_user.role == "student":
        if new_status != "closed" or complaint.status != "resolved":
            raise HTTPException(status_code=403, detail="Students can only close their own resolved complaints")
    elif current_user.role == "staff" and new_status not in ("acknowledged", "investigating", "action_taken", "resolved"):
        raise HTTPException(status_code=403, detail="Staff cannot set this complaint status")

    old_status = complaint.status
    complaint.status = new_status
    complaint.updated_at = datetime.utcnow()

    if new_status == "resolved":
        complaint.resolved_at = datetime.utcnow()

    history = StatusHistory(
        id=gen_id(),
        complaint_id=id,
        old_status=old_status,
        new_status=new_status,
        changed_by=current_user.id,
        comment=payload.comment or f"Status changed to {new_status.replace('_', ' ')}"
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
    if current_user.role == "admin":
        db.add(AdminAction(
            id=gen_id(),
            admin_id=current_user.id,
            complaint_id=complaint.id,
            action="status_changed",
            description=f"Changed status from {old_status} to {new_status}",
        ))
    db.commit()

    return {"message": "Status updated", "new_status": new_status}


@router.patch("/{id}/assign")
def assign_complaint(
    id: str,
    payload: ComplaintAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(404, "Complaint not found")

    staff_id = payload.staff_id
    staff = db.query(User).filter(
        User.id == staff_id,
        User.role == "staff",
        User.is_active.is_(True),
        User.id.in_(
            db.query(StaffAssignment.staff_user_id).filter(StaffAssignment.sector_id == complaint.sector_id)
        ),
    ).first()
    if not staff:
        raise HTTPException(status_code=400, detail="Select active staff assigned to this complaint's sector")

    old_staff = complaint.assigned_staff_id
    complaint.assigned_staff_id = staff_id
    old_status = complaint.status
    if complaint.status == "submitted":
        complaint.status = "assigned"
    complaint.updated_at = datetime.utcnow()

    notification = Notification(
        id=gen_id(),
        recipient_user_id=staff_id,
        complaint_id=complaint.id,
        title=f"Complaint Assigned to You",
        message=f"You have been assigned: '{complaint.title}'. Priority: {complaint.priority.upper()}.",
        type="ASSIGNMENT"
    )
    db.add(notification)
    db.add(StatusHistory(
        id=gen_id(),
        complaint_id=complaint.id,
        old_status=old_status,
        new_status=complaint.status,
        changed_by=current_user.id,
        comment=f"Assigned to {staff.full_name}" if not old_staff else f"Reassigned to {staff.full_name}",
    ))
    db.add(AdminAction(
        id=gen_id(),
        admin_id=current_user.id,
        complaint_id=complaint.id,
        action="reassignment" if old_staff else "assignment",
        description=f"Assigned complaint to {staff.full_name}",
    ))
    db.commit()
    return {"message": "Assigned successfully"}


@router.patch("/{id}/priority")
def update_priority(
    id: str,
    payload: ComplaintPriorityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    previous_priority = complaint.priority
    complaint.priority = payload.priority
    complaint.updated_at = datetime.utcnow()
    db.add(AdminAction(
        id=gen_id(),
        admin_id=current_user.id,
        complaint_id=complaint.id,
        action="priority_changed",
        description=f"Changed priority from {previous_priority} to {payload.priority}: {payload.reason}",
    ))
    db.add(Notification(
        id=gen_id(),
        recipient_user_id=complaint.student_id,
        complaint_id=complaint.id,
        title=f"Priority updated: {complaint.complaint_number}",
        message=f"Your complaint priority changed to {payload.priority.upper()}.",
        type="PRIORITY_CHANGED",
    ))
    db.commit()
    return {"message": "Priority updated", "priority": complaint.priority}


@router.post("/{id}/attachments", status_code=201)
async def upload_attachment(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    _ensure_complaint_access(db, current_user, complaint)
    if current_user.role == "student" and complaint.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only attach evidence to your own complaints")

    contents = await file.read(MAX_ATTACHMENT_SIZE + 1)
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded image is empty")
    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(status_code=413, detail="Images must be 5 MB or smaller")
    try:
        image = Image.open(BytesIO(contents))
        image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=415, detail="Upload a valid JPEG, PNG, or WebP image") from exc
    format_details = IMAGE_FORMATS.get(image.format or "")
    if not format_details:
        raise HTTPException(status_code=415, detail="Upload a valid JPEG, PNG, or WebP image")
    content_type, extension = format_details
    if file.content_type and file.content_type != content_type:
        raise HTTPException(status_code=415, detail="The image content type does not match the file")

    uploaded_name = (file.filename or "image").replace("\\", "/").split("/")[-1]
    display_name = "".join(char for char in uploaded_name if char.isprintable())[:255] or "image"
    stored_name = f"{uuid.uuid4().hex}{extension}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_path = UPLOAD_DIR / stored_name
    try:
        stored_path.write_bytes(contents)
        attachment = ComplaintAttachment(
            id=gen_id(),
            complaint_id=complaint.id,
            uploader_id=current_user.id,
            stored_name=stored_name,
            display_name=display_name,
            content_type=content_type,
            file_size=len(contents),
        )
        db.add(attachment)
        db.commit()
    except OSError as exc:
        db.rollback()
        stored_path.unlink(missing_ok=True)
        logger.exception("Unable to store complaint attachment")
        raise HTTPException(status_code=500, detail="Unable to store the uploaded image") from exc
    except Exception:
        db.rollback()
        stored_path.unlink(missing_ok=True)
        raise
    return {
        "id": attachment.id,
        "display_name": attachment.display_name,
        "content_type": attachment.content_type,
        "file_size": attachment.file_size,
        "created_at": attachment.created_at.isoformat() if attachment.created_at else None,
    }


@router.get("/{id}/attachments")
def list_attachments(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    _ensure_complaint_access(db, current_user, complaint)
    attachments = db.query(ComplaintAttachment).filter(
        ComplaintAttachment.complaint_id == complaint.id
    ).order_by(ComplaintAttachment.created_at.asc()).all()
    return [
        {
            "id": attachment.id,
            "display_name": attachment.display_name,
            "content_type": attachment.content_type,
            "file_size": attachment.file_size,
            "created_at": attachment.created_at.isoformat() if attachment.created_at else None,
        }
        for attachment in attachments
    ]


@router.get("/{id}/attachments/{attachment_id}")
def get_attachment(
    id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    _ensure_complaint_access(db, current_user, complaint)
    attachment = db.query(ComplaintAttachment).filter(
        ComplaintAttachment.id == attachment_id,
        ComplaintAttachment.complaint_id == complaint.id,
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    stored_path = UPLOAD_DIR / attachment.stored_name
    if not stored_path.is_file():
        raise HTTPException(status_code=404, detail="Attachment file is no longer available")
    return FileResponse(
        stored_path,
        media_type=attachment.content_type,
        filename=attachment.display_name,
        content_disposition_type="inline",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


def _ensure_complaint_access(db: Session, user: User, complaint: Complaint) -> None:
    if user.role == "admin":
        return
    if user.role == "student" and complaint.student_id == user.id:
        return
    if user.role == "staff":
        assigned_sector = db.query(StaffAssignment.id).filter(
            StaffAssignment.staff_user_id == user.id,
            StaffAssignment.sector_id == complaint.sector_id,
        ).first()
        if assigned_sector:
            return
    raise HTTPException(status_code=403, detail="You do not have access to this complaint")
