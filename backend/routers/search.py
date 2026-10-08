from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Complaint, IssueGroup, StaffAssignment, User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    pattern = f"%{q}%"
    complaints = (
        db.query(Complaint)
        .options(joinedload(Complaint.sector), joinedload(Complaint.assigned_staff))
        .filter(
            Complaint.title.ilike(pattern)
            | Complaint.description.ilike(pattern)
            | Complaint.location.ilike(pattern)
            | Complaint.category.ilike(pattern)
        )
        .order_by(Complaint.created_at.desc())
        .limit(50)
        .all()
    )

    issues = (
        db.query(IssueGroup)
        .options(joinedload(IssueGroup.sector))
        .filter(IssueGroup.title.ilike(pattern) | IssueGroup.description.ilike(pattern))
        .order_by(IssueGroup.complaint_count.desc())
        .limit(20)
        .all()
    )

    locations = sorted({c.location for c in complaints if c.location})
    sector_ids = {c.sector_id for c in complaints if c.sector_id}
    staff_ids = set()
    if sector_ids:
        for row in db.query(StaffAssignment).filter(StaffAssignment.sector_id.in_(sector_ids)).all():
            staff_ids.add(row.staff_user_id)

    staff_users = []
    if staff_ids:
        staff_users = db.query(User).filter(User.id.in_(staff_ids), User.role == "staff").all()

    return {
        "query": q,
        "summary": {
            "complaints": len(complaints),
            "locations": len(locations),
            "issue_groups": len(issues),
            "staff": len(staff_users),
        },
        "complaints": [
            {
                "id": c.id,
                "complaint_number": c.complaint_number,
                "title": c.title,
                "location": c.location,
                "priority": c.priority,
                "status": c.status,
                "sector": c.sector.name if c.sector else None,
            }
            for c in complaints[:20]
        ],
        "issue_groups": [
            {
                "id": ig.id,
                "title": ig.title,
                "priority": ig.priority,
                "complaint_count": ig.complaint_count,
                "trend_percentage": ig.trend_percentage,
            }
            for ig in issues
        ],
        "locations": locations[:12],
        "staff": [{"id": s.id, "full_name": s.full_name, "department": s.department} for s in staff_users],
    }
