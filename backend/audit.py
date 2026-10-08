import uuid

from sqlalchemy.orm import Session

from models import AdminAction


def record_admin_action(
    db: Session,
    admin_id: str,
    action: str,
    description: str,
    complaint_id: str | None = None,
) -> None:
    db.add(
        AdminAction(
            id=str(uuid.uuid4()),
            admin_id=admin_id,
            complaint_id=complaint_id,
            action=action,
            description=description,
        )
    )
