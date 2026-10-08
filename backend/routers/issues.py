from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models import AdminAction, IssueGroup, Complaint, ComplaintGroupMember, Notification, StaffAssignment, StatusHistory, User
from schemas import IssueAssignment, IssueGroupResponse, IssueStatusUpdate
from routers.auth import get_current_user, require_roles
from services.grouping import process_complaint_grouping
from audit import record_admin_action
import uuid
from datetime import datetime

router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=List[IssueGroupResponse])
def get_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(IssueGroup).options(
        joinedload(IssueGroup.sector)
    )
    if current_user.role == "staff":
        sector_ids = db.query(StaffAssignment.sector_id).filter(
            StaffAssignment.staff_user_id == current_user.id
        )
        query = query.filter(IssueGroup.sector_id.in_(sector_ids))
    elif current_user.role == "student":
        visible_groups = (
            db.query(ComplaintGroupMember.issue_group_id)
            .join(Complaint, Complaint.id == ComplaintGroupMember.complaint_id)
            .filter(Complaint.student_id == current_user.id)
        )
        query = query.filter(IssueGroup.id.in_(visible_groups))
    return query.order_by(IssueGroup.complaint_count.desc()).all()


@router.get("/{id}")
def get_issue(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(IssueGroup).options(
        joinedload(IssueGroup.sector)
    ).filter(IssueGroup.id == id)
    if current_user.role == "staff":
        query = query.filter(IssueGroup.sector_id.in_(
            db.query(StaffAssignment.sector_id).filter(StaffAssignment.staff_user_id == current_user.id)
        ))
    elif current_user.role == "student":
        query = query.filter(IssueGroup.id.in_(
            db.query(ComplaintGroupMember.issue_group_id)
            .join(Complaint, Complaint.id == ComplaintGroupMember.complaint_id)
            .filter(
                Complaint.student_id == current_user.id,
                ComplaintGroupMember.issue_group_id == id,
            )
        ))
    issue = query.first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue group not found")

    # Get related complaints
    members = db.query(ComplaintGroupMember).filter(
        ComplaintGroupMember.issue_group_id == id
    ).order_by(ComplaintGroupMember.similarity_score.desc()).limit(10).all()

    complaint_ids = [m.complaint_id for m in members]
    related_query = db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector)
    ).filter(Complaint.id.in_(complaint_ids))
    if current_user.role == "student":
        related_query = related_query.filter(Complaint.student_id == current_user.id)
    elif current_user.role == "staff":
        related_query = related_query.filter(Complaint.sector_id.in_(
            db.query(StaffAssignment.sector_id).filter(StaffAssignment.staff_user_id == current_user.id)
        ))
    related = related_query.all()

    # Priority explanation
    explanation = _build_explanation(issue)

    return {
        "id": issue.id,
        "title": issue.title,
        "description": issue.description,
        "sector_id": issue.sector_id,
        "sector": {"id": issue.sector.id, "name": issue.sector.name, "icon": issue.sector.icon, "color": issue.sector.color} if issue.sector else None,
        "category": issue.category,
        "complaint_count": issue.complaint_count,
        "affected_users": issue.affected_users,
        "affected_locations": issue.affected_locations or [],
        "trend_percentage": issue.trend_percentage,
        "priority": issue.priority,
        "first_detected": issue.first_detected.isoformat() if issue.first_detected else None,
        "last_updated": issue.last_updated.isoformat() if issue.last_updated else None,
        "status": issue.status,
        "priority_explanation": explanation,
        "related_complaints": [
            {
                "id": c.id,
                "complaint_number": c.complaint_number,
                "title": c.title,
                "priority": c.priority,
                "status": c.status,
                "location": c.location,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in related
        ]
    }


@router.post("/detect")
def detect_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Re-run issue detection across all recent complaints."""
    from datetime import datetime, timedelta
    recent = db.query(Complaint).filter(
        Complaint.created_at >= datetime.utcnow() - timedelta(days=7)
    ).all()

    processed = 0
    for c in recent:
        process_complaint_grouping(db, c)
        processed += 1

    db.commit()
    groups = db.query(IssueGroup).filter(IssueGroup.status == "active").count()
    return {"message": f"Processed {processed} complaints", "active_groups": groups}


@router.patch("/{id}/assign")
def assign_issue_group(
    id: str,
    payload: IssueAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(IssueGroup).filter(IssueGroup.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue group not found")
    staff = db.query(User).filter(
        User.id == payload.staff_id,
        User.role == "staff",
        User.is_active.is_(True),
        User.id.in_(
            db.query(StaffAssignment.staff_user_id).filter(StaffAssignment.sector_id == issue.sector_id)
        ),
    ).first()
    if not staff:
        raise HTTPException(status_code=400, detail="Select active staff assigned to this issue's sector")
    complaints = (
        db.query(Complaint)
        .join(ComplaintGroupMember, ComplaintGroupMember.complaint_id == Complaint.id)
        .filter(ComplaintGroupMember.issue_group_id == issue.id)
        .all()
    )
    if not complaints:
        raise HTTPException(status_code=409, detail="This signal has no related complaints to assign")

    for complaint in complaints:
        previous_status = complaint.status
        complaint.assigned_staff_id = staff.id
        if complaint.status == "submitted":
            complaint.status = "assigned"
        complaint.updated_at = datetime.utcnow()
        db.add(StatusHistory(
            id=str(uuid.uuid4()),
            complaint_id=complaint.id,
            old_status=previous_status,
            new_status=complaint.status,
            changed_by=current_user.id,
            comment=f"Signal assigned to {staff.full_name}",
        ))
        db.add(Notification(
            recipient_user_id=staff.id,
            complaint_id=complaint.id,
            issue_group_id=issue.id,
            title=f"Signal assigned: {issue.title}",
            message=f"{complaint.complaint_number}: {complaint.title}",
            type="ASSIGNMENT",
        ))
    record_admin_action(
        db,
        current_user.id,
        "signal_assignment",
        f"Assigned signal {issue.title} and {len(complaints)} related complaints to {staff.full_name}",
    )
    db.commit()
    return {"message": "Signal assigned", "staff_id": staff.id, "complaints_assigned": len(complaints)}


@router.post("/{id}/notify")
def notify_issue_team(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(IssueGroup).filter(IssueGroup.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue group not found")
    recipients = {
        staff_id
        for (staff_id,) in (
            db.query(StaffAssignment.staff_user_id)
            .join(User, User.id == StaffAssignment.staff_user_id)
            .filter(
                StaffAssignment.sector_id == issue.sector_id,
                User.role == "staff",
                User.is_active.is_(True),
            )
            .all()
        )
    }
    if not recipients:
        raise HTTPException(status_code=409, detail="No active staff are assigned to this signal's sector")
    for recipient_id in recipients:
        db.add(Notification(
            recipient_user_id=recipient_id,
            issue_group_id=issue.id,
            title=f"Admin alert: {issue.title}",
            message=(
                f"{issue.complaint_count} related reports across {len(issue.affected_locations or [])} "
                f"locations. Priority: {issue.priority.upper()}."
            ),
            type="ADMIN_ALERT",
        ))
    record_admin_action(
        db,
        current_user.id,
        "team_notified",
        f"Notified {len(recipients)} staff members about signal {issue.title}",
    )
    db.commit()
    return {"message": "Sector team notified", "recipients": len(recipients)}


@router.patch("/{id}/status")
def update_issue_status(
    id: str,
    payload: IssueStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(IssueGroup).filter(IssueGroup.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue group not found")
    previous_status = issue.status
    issue.status = payload.status
    db.add(AdminAction(
        id=str(uuid.uuid4()),
        admin_id=current_user.id,
        action="issue_status_changed",
        description=f"Changed issue group {issue.title} from {previous_status} to {payload.status}",
    ))
    db.commit()
    return {"message": "Updated", "status": issue.status}


def _build_explanation(issue: IssueGroup) -> str:
    parts = []
    if issue.complaint_count >= 30:
        parts.append(f"{issue.complaint_count} related reports were detected")
    elif issue.complaint_count >= 10:
        parts.append(f"{issue.complaint_count} related complaints found")

    locs = issue.affected_locations or []
    if len(locs) >= 3:
        parts.append(f"affecting {len(locs)} campus locations")
    elif len(locs) > 0:
        parts.append(f"at {', '.join(locs[:2])}")

    if issue.trend_percentage and issue.trend_percentage > 200:
        mult = round(issue.trend_percentage / 100 + 1, 1)
        parts.append(f"reports increased {mult}x this week")
    elif issue.trend_percentage and issue.trend_percentage > 50:
        parts.append("complaints are trending upward")

    if issue.affected_users and issue.affected_users > 20:
        parts.append(f"{issue.affected_users} students are impacted")

    if not parts:
        return f"This issue group has {issue.complaint_count} related complaints requiring attention."

    priority_label = (issue.priority or "medium").upper()
    return f"{priority_label} priority because {', '.join(parts)}."
