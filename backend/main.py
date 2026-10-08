from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from routers import auth, complaints, issues, analytics, notifications, sectors, users, search
from seed_data import run_seed_data
from models import Complaint, IssueGroup, ComplaintGroupMember, Notification, User, Sector, StaffAssignment
from services.classifier import classify
from services.grouping import process_complaint_grouping
from datetime import datetime, timedelta
import uuid
import random

app = FastAPI(
    title="Campus Signal API",
    description="Intelligent Campus Complaint & Signal Detection Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(issues.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(sectors.router)
app.include_router(users.router)
app.include_router(search.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        run_seed_data(db)
    except Exception as e:
        print(f"Seed warning: {e}")
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Campus Signal API", "version": "1.0.0"}


@app.post("/demo/inject")
def inject_demo_complaints(db: Session = Depends(get_db)):
    """Inject 5 demo IT complaints to simulate the Campus Network Instability signal."""
    demo_texts = [
        ("Wi-Fi is not working in C Block", "Wi-Fi has completely stopped working on the third floor of C Block. Very urgent.", "C Block – 3rd Floor"),
        ("Internet keeps disconnecting", "My internet connection keeps dropping every few minutes. Cannot attend online class.", "A Block – Ground Floor"),
        ("Wi-Fi very slow today", "The campus Wi-Fi speed is extremely slow. Pages take minutes to load.", "B Block – 2nd Floor"),
        ("Cannot access student portal", "The student portal is not opening since morning. Tried multiple times.", "Labs Block – Wing A"),
        ("Network unavailable in computer lab", "The entire computer lab has no network connectivity. Practical session affected.", "Computer Lab 1"),
    ]

    student = db.query(User).filter(User.role == "student").first()
    if not student:
        return {"error": "No student found"}

    it_sector = db.query(Sector).filter(Sector.name == "IT & Wi-Fi").first()
    if not it_sector:
        return {"error": "IT sector not found"}

    staff_assignment = db.query(StaffAssignment).filter(StaffAssignment.sector_id == it_sector.id).first()

    year = datetime.now().year
    count = db.query(Complaint).count()
    created = []

    for i, (title, desc, location) in enumerate(demo_texts):
        classification = classify(title, desc)
        complaint_number = f"CS-{year}-{9000 + i:04d}"

        c = Complaint(
            id=str(uuid.uuid4()),
            complaint_number=complaint_number,
            student_id=student.id,
            title=title,
            description=desc,
            location=location,
            category=classification['category'],
            sector_id=it_sector.id,
            priority="high",
            priority_score=75.0,
            severity="high",
            status="assigned" if staff_assignment else "submitted",
            assigned_staff_id=staff_assignment.staff_user_id if staff_assignment else None,
            created_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 30))
        )
        db.add(c)
        db.flush()
        created.append(c)

    db.commit()

    # Group them
    for c in created:
        try:
            process_complaint_grouping(db, c)
        except Exception:
            pass

    # Get or create the main issue group
    ig = db.query(IssueGroup).filter(IssueGroup.title.like("%Network Instability%")).first()
    if not ig:
        ig = db.query(IssueGroup).filter(IssueGroup.sector_id == it_sector.id).first()

    # Create admin notification
    admin = db.query(User).filter(User.role == "admin").first()
    if admin and ig:
        notif = Notification(
            id=str(uuid.uuid4()),
            recipient_user_id=admin.id,
            issue_group_id=ig.id,
            title="🚨 DEMO: Campus Network Instability Detected",
            message=f"5 new complaints injected. Signal detected: {ig.complaint_count} total reports, {len(ig.affected_locations or [])} locations affected.",
            type="ADMIN_ALERT",
            is_read=False
        )
        db.add(notif)
        db.commit()

    return {
        "message": "Demo complaints injected",
        "complaints_created": len(created),
        "complaint_numbers": [c.complaint_number for c in created],
        "issue_group": {
            "id": ig.id if ig else None,
            "title": ig.title if ig else "Campus Network Instability",
            "complaint_count": ig.complaint_count if ig else 5
        } if ig else None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
