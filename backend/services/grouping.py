from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from models import Complaint, ComplaintGroupMember, IssueGroup, Notification, StaffAssignment, User
from services.classifier import calculate_text_similarity
from services.priority_engine import calculate_priority_score, get_priority_label


GROUP_TITLES = {
    "IT & Wi-Fi": "Campus Network Instability",
    "Transportation": "Campus Transportation Issue",
    "Sports & Games": "Sports Equipment & Facilities",
    "Fee & Finance": "Campus Fee & Finance Issue",
    "Classrooms": "Classroom Maintenance Issue",
    "Laboratories": "Laboratory Equipment & Facilities",
    "Library": "Library Service Issue",
    "Academic Services": "Academic Services Issue",
    "Campus Facilities": "Campus Facilities Issue",
    "Student Services": "Student Services Issue",
}

SECTOR_SIGNAL_TERMS = {
    "IT & Wi-Fi": ("wifi", "wi-fi", "internet", "network", "portal", "connect", "server", "bandwidth"),
}


def process_complaint_grouping(db: Session, complaint: Complaint) -> IssueGroup:
    existing_member = (
        db.query(ComplaintGroupMember)
        .filter(ComplaintGroupMember.complaint_id == complaint.id)
        .first()
    )
    if existing_member:
        group = db.query(IssueGroup).filter(IssueGroup.id == existing_member.issue_group_id).first()
        if group:
            return group

    active_groups = db.query(IssueGroup).filter(
        IssueGroup.sector_id == complaint.sector_id,
        IssueGroup.status == "active",
    ).all()

    complaint_text = f"{complaint.title} {complaint.description}"
    best_match_group = None
    best_match_score = 0.0
    for group in active_groups:
        group_text = f"{group.title} {group.description}"
        score = calculate_text_similarity(complaint_text, group_text)
        signal_terms = SECTOR_SIGNAL_TERMS.get(
            complaint.sector.name if complaint.sector else "",
            (),
        )
        if signal_terms and any(term in complaint_text.lower() for term in signal_terms) and any(
            term in group_text.lower() for term in signal_terms
        ):
            score = max(score, 0.21)
        if score >= 0.2 and score > best_match_score:
            best_match_group = group
            best_match_score = score

    if best_match_group:
        group = best_match_group
        previous_count = group.complaint_count
        previous_priority = group.priority
        db.add(ComplaintGroupMember(
            complaint_id=complaint.id,
            issue_group_id=group.id,
            similarity_score=best_match_score,
        ))
    else:
        previous_count = 0
        previous_priority = "low"
        sector_name = complaint.sector.name if complaint.sector else "Campus"
        group = IssueGroup(
            title=GROUP_TITLES.get(sector_name, f"{sector_name} Issue"),
            description=complaint.description,
            sector_id=complaint.sector_id,
            category=complaint.category,
            complaint_count=0,
            affected_users=0,
            affected_locations=[],
            trend_percentage=0,
            priority=complaint.priority,
            status="active",
        )
        db.add(group)
        db.flush()
        db.add(ComplaintGroupMember(
            complaint_id=complaint.id,
            issue_group_id=group.id,
            similarity_score=1.0,
        ))

    db.flush()
    members = (
        db.query(Complaint)
        .join(ComplaintGroupMember, ComplaintGroupMember.complaint_id == Complaint.id)
        .filter(ComplaintGroupMember.issue_group_id == group.id)
        .all()
    )
    now = datetime.utcnow()
    current_period_start = now - timedelta(days=7)
    previous_period_start = now - timedelta(days=14)
    current_count = sum(1 for member in members if member.created_at and member.created_at >= current_period_start)
    previous_count = sum(
        1 for member in members
        if member.created_at and previous_period_start <= member.created_at < current_period_start
    )
    if previous_count:
        group.trend_percentage = round((current_count - previous_count) * 100 / previous_count, 1)
    else:
        group.trend_percentage = 0.0

    group.complaint_count = len(members)
    group.affected_users = len({member.student_id for member in members})
    group.affected_locations = sorted({member.location for member in members if member.location})
    group.last_updated = now
    group.description = complaint.description if len(members) == 1 else group.description
    severity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    severity = max(
        (member.severity or member.priority or "medium" for member in members),
        key=lambda value: severity_order.get(value.lower(), 2),
        default="medium",
    )
    score = calculate_priority_score(
        severity=severity,
        frequency=group.complaint_count,
        affected_users=group.affected_users,
        recent_increase=max(0.0, current_count / max(previous_count, 1)),
        location_spread=len(group.affected_locations or []),
    )
    group.priority = get_priority_label(score)
    complaint.priority_score = score
    complaint.priority = group.priority
    if group.complaint_count >= 5 and (
        previous_count < 5
        or (previous_priority not in ("high", "critical") and group.priority in ("high", "critical"))
    ):
        recipient_ids = {
            user_id for (user_id,) in db.query(User.id).filter(User.role == "admin", User.is_active.is_(True)).all()
        }
        recipient_ids.update(
            staff_id
            for (staff_id,) in (
                db.query(StaffAssignment.staff_user_id)
                .join(User, User.id == StaffAssignment.staff_user_id)
                .filter(
                    StaffAssignment.sector_id == group.sector_id,
                    User.is_active.is_(True),
                )
                .all()
            )
        )
        for recipient_id in recipient_ids:
            db.add(Notification(
                recipient_user_id=recipient_id,
                issue_group_id=group.id,
                title=f"Emerging signal: {group.title}",
                message=(
                    f"{group.complaint_count} related reports across "
                    f"{len(group.affected_locations or [])} locations. "
                    f"Priority: {group.priority.upper()}."
                ),
                type="NEW_EMERGING_ISSUE",
            ))
    db.flush()
    return group
