from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import User


DEMO_ADMIN_EMAIL = "admin@college.edu"


def normalize_email(email: Optional[str]) -> str:
    return email.strip().lower() if email else ""


def demote_demo_admin_in_production(
    db: Session,
    admin_email: Optional[str],
    allow_dev_login: bool,
) -> int:
    if allow_dev_login or normalize_email(admin_email) == DEMO_ADMIN_EMAIL:
        return 0

    demo_admins = (
        db.query(User)
        .filter(func.lower(func.trim(User.email)) == DEMO_ADMIN_EMAIL, User.role == "admin")
        .all()
    )
    for demo_admin in demo_admins:
        demo_admin.role = "student"

    if demo_admins:
        db.commit()
    return len(demo_admins)
