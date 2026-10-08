from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models import IssueGroup, Complaint, ComplaintGroupMember
from schemas import IssueGroupResponse
from services.grouping import process_complaint_grouping

router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=List[IssueGroupResponse])
def get_issues(db: Session = Depends(get_db)):
    return db.query(IssueGroup).options(
        joinedload(IssueGroup.sector)
    ).order_by(IssueGroup.complaint_count.desc()).all()


@router.get("/{id}")
def get_issue(id: str, db: Session = Depends(get_db)):
    issue = db.query(IssueGroup).options(
        joinedload(IssueGroup.sector)
    ).filter(IssueGroup.id == id).first()
    if not issue:
        return None

    # Get related complaints
    members = db.query(ComplaintGroupMember).filter(
        ComplaintGroupMember.issue_group_id == id
    ).order_by(ComplaintGroupMember.similarity_score.desc()).limit(10).all()

    complaint_ids = [m.complaint_id for m in members]
    related = db.query(Complaint).options(
        joinedload(Complaint.student),
        joinedload(Complaint.sector)
    ).filter(Complaint.id.in_(complaint_ids)).all()

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
def detect_issues(db: Session = Depends(get_db)):
    """Re-run issue detection across all recent complaints."""
    from datetime import datetime, timedelta
    recent = db.query(Complaint).filter(
        Complaint.created_at >= datetime.utcnow() - timedelta(days=7)
    ).all()

    processed = 0
    for c in recent:
        try:
            process_complaint_grouping(db, c)
            processed += 1
        except Exception:
            pass

    db.commit()
    groups = db.query(IssueGroup).filter(IssueGroup.status == "active").count()
    return {"message": f"Processed {processed} complaints", "active_groups": groups}


@router.patch("/{id}/status")
def update_issue_status(id: str, payload: dict, db: Session = Depends(get_db)):
    issue = db.query(IssueGroup).filter(IssueGroup.id == id).first()
    if not issue:
        return {"error": "Not found"}
    issue.status = payload.get("status", issue.status)
    db.commit()
    return {"message": "Updated"}


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
