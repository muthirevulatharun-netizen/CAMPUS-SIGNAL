from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Complaint, IssueGroup, Sector, User, ComplaintGroupMember
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(db: Session = Depends(get_db)):
    complaints = db.query(Complaint).options(
        joinedload(Complaint.sector),
        joinedload(Complaint.student),
        joinedload(Complaint.assigned_staff)
    ).all()

    # Complaints by sector
    sector_counts = defaultdict(int)
    for c in complaints:
        name = c.sector.name if c.sector else "Unknown"
        sector_counts[name] += 1

    # Complaints by sector as list for charts
    sector_list = [{"name": k, "count": v} for k, v in sorted(sector_counts.items(), key=lambda x: -x[1])]

    # Priority distribution
    priority_map = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for c in complaints:
        p = (c.priority or "low").lower()
        if p in priority_map:
            priority_map[p] += 1
    priority_list = [
        {"name": "Low", "count": priority_map["low"], "color": "#10B981"},
        {"name": "Medium", "count": priority_map["medium"], "color": "#F59E0B"},
        {"name": "High", "count": priority_map["high"], "color": "#F97316"},
        {"name": "Critical", "count": priority_map["critical"], "color": "#EF4444"},
    ]

    # Status distribution
    status_counts = defaultdict(int)
    for c in complaints:
        status_counts[c.status] += 1
    status_list = [{"name": k.replace("_", " ").title(), "count": v} for k, v in status_counts.items()]

    # Complaints over time (last 30 days)
    now = datetime.utcnow()
    time_data = {}
    for i in range(29, -1, -1):
        day = now - timedelta(days=i)
        time_data[day.strftime("%b %d")] = 0
    for c in complaints:
        if c.created_at:
            day_key = c.created_at.strftime("%b %d")
            if day_key in time_data:
                time_data[day_key] += 1
    time_list = [{"date": k, "count": v} for k, v in time_data.items()]

    # Top locations
    location_counts = defaultdict(int)
    for c in complaints:
        if c.location:
            location_counts[c.location] += 1
    top_locations = [{"location": k, "count": v} for k, v in sorted(location_counts.items(), key=lambda x: -x[1])[:8]]

    # Resolution times by sector
    sector_resolution = defaultdict(list)
    for c in complaints:
        if c.resolved_at and c.created_at and c.sector:
            delta_hours = (c.resolved_at - c.created_at).total_seconds() / 3600
            sector_resolution[c.sector.name].append(delta_hours)
    resolution_times = [
        {"sector": k, "avg_hours": round(sum(v) / len(v), 1)}
        for k, v in sector_resolution.items() if v
    ]

    # Staff performance
    staff_stats = defaultdict(lambda: {"assigned": 0, "resolved": 0, "total_hours": []})
    for c in complaints:
        if c.assigned_staff_id:
            name = c.assigned_staff.full_name if c.assigned_staff else c.assigned_staff_id
            staff_stats[name]["assigned"] += 1
            if c.status in ("resolved", "closed"):
                staff_stats[name]["resolved"] += 1
                if c.resolved_at and c.created_at:
                    hours = (c.resolved_at - c.created_at).total_seconds() / 3600
                    staff_stats[name]["total_hours"].append(hours)

    staff_performance = []
    for name, stats in staff_stats.items():
        avg_h = round(sum(stats["total_hours"]) / len(stats["total_hours"]), 1) if stats["total_hours"] else 0
        staff_performance.append({
            "staff_name": name,
            "assigned": stats["assigned"],
            "resolved": stats["resolved"],
            "avg_resolution_hours": avg_h,
            "pending": stats["assigned"] - stats["resolved"]
        })
    staff_performance.sort(key=lambda x: -x["resolved"])

    # Aggregate KPIs
    total = len(complaints)
    open_count = sum(1 for c in complaints if c.status not in ("resolved", "closed"))
    high_priority = sum(1 for c in complaints if c.priority in ("high", "critical") and c.status not in ("resolved", "closed"))
    resolved_count = sum(1 for c in complaints if c.status in ("resolved", "closed"))

    # Avg resolution
    resolution_hours = []
    for c in complaints:
        if c.resolved_at and c.created_at:
            h = (c.resolved_at - c.created_at).total_seconds() / 3600
            resolution_hours.append(h)
    avg_resolution = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else 0

    # Emerging signals
    issue_groups = db.query(IssueGroup).options(joinedload(IssueGroup.sector)).filter(IssueGroup.status == "active").all()
    emerging_count = len([ig for ig in issue_groups if ig.trend_percentage and ig.trend_percentage > 100])

    # Category breakdown
    category_counts = defaultdict(int)
    for c in complaints:
        category_counts[c.category or "General"] += 1
    complaints_by_category = [{"name": k, "count": v} for k, v in sorted(category_counts.items(), key=lambda x: -x[1])]

    # Last 7 days volume (for emerging chart)
    week_data = {}
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        week_data[day.strftime("%a")] = 0
    for c in complaints:
        if c.created_at and c.created_at >= now - timedelta(days=7):
            key = c.created_at.strftime("%a")
            if key in week_data:
                week_data[key] += 1
    complaints_last_7_days = [{"day": k, "count": v} for k, v in week_data.items()]

    def sector_module(sector_name: str, keywords: tuple):
        sector_complaints = [c for c in complaints if c.sector and c.sector.name == sector_name]
        ig = next((g for g in issue_groups if g.sector and g.sector.name == sector_name), None)
        peak_hour = "—"
        if sector_complaints:
            hours = defaultdict(int)
            for c in sector_complaints:
                if c.created_at:
                    hours[c.created_at.hour] += 1
            if hours:
                peak = max(hours.items(), key=lambda x: x[1])[0]
                peak_hour = f"{peak:02d}:00–{(peak + 1) % 24:02d}:00"
        top_titles = defaultdict(int)
        for c in sector_complaints:
            t = (c.title or "").lower()
            for kw in keywords:
                if kw in t:
                    top_titles[kw] += 1
        top_issue = max(top_titles.items(), key=lambda x: x[1])[0] if top_titles else (sector_complaints[0].title if sector_complaints else "No data")
        return {
            "complaint_count": len(sector_complaints),
            "open": sum(1 for c in sector_complaints if c.status not in ("resolved", "closed")),
            "signal": {
                "title": ig.title if ig else None,
                "complaint_count": ig.complaint_count if ig else 0,
                "trend_percentage": ig.trend_percentage if ig else 0,
                "peak_time": peak_hour,
                "top_issue": top_issue,
                "recommended_action": _module_recommendation(sector_name, ig, top_issue),
            },
        }

    sector_modules = {
        "transportation": sector_module("Transportation", ("bus", "delay", "route", "driver")),
        "sports": sector_module("Sports & Games", ("cricket", "football", "equipment", "net", "bat")),
        "finance": sector_module("Fee & Finance", ("fee", "receipt", "payment", "refund", "balance")),
        "classrooms": sector_module("Classrooms", ("projector", "fan", "ac", "microphone", "smart board")),
        "laboratories": sector_module("Laboratories", ("lab", "computer", "software", "equipment")),
        "library": sector_module("Library", ("book", "seating", "library")),
        "facilities": sector_module("Campus Facilities", ("water", "washroom", "clean", "electricity")),
    }

    return {
        "total_complaints": total,
        "open_issues": open_count,
        "high_priority": high_priority,
        "resolved": resolved_count,
        "emerging_signals": emerging_count,
        "avg_resolution_hours": avg_resolution,
        "complaints_by_sector": sector_list,
        "complaints_by_category": complaints_by_category,
        "complaints_by_priority": priority_list,
        "complaints_by_status": status_list,
        "complaints_over_time": time_list,
        "complaints_last_7_days": complaints_last_7_days,
        "top_locations": top_locations,
        "resolution_times": resolution_times,
        "staff_performance": staff_performance,
        "sector_modules": sector_modules,
        "emerging_issues": [
            {
                "id": ig.id,
                "title": ig.title,
                "priority": ig.priority,
                "complaint_count": ig.complaint_count,
                "affected_users": ig.affected_users,
                "affected_locations": ig.affected_locations or [],
                "trend_percentage": ig.trend_percentage,
                "status": ig.status
            }
            for ig in issue_groups
        ]
    }


def _module_recommendation(sector_name: str, issue_group, top_issue: str) -> str:
    if sector_name == "Transportation":
        return "Review morning bus schedules and Route 3 staffing during peak hours."
    if sector_name == "Sports & Games":
        return "Review sports equipment inventory and restock high-demand items."
    if sector_name == "Fee & Finance":
        return "Verify fee portal sync and receipt generation queue."
    if issue_group and issue_group.complaint_count >= 10:
        return f"Investigate grouped signal: {issue_group.title}."
    return f"Prioritize recurring issue: {top_issue}."
