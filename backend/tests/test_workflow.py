from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from typing import Iterator
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app
from models import Sector, StaffAssignment, User
from routers.auth import create_access_token


test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False)


def override_get_db() -> Iterator:
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class ComplaintWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)
        db = TestSession()
        self.sector = Sector(id="it-sector", name="IT & Wi-Fi", description="Network support")
        self.student = User(id="student-1", full_name="Student One", email="student@example.edu", role="student")
        self.other_student = User(
            id="student-2",
            full_name="Student Two",
            email="other@example.edu",
            role="student",
        )
        self.staff = User(id="staff-1", full_name="Staff One", email="staff@example.edu", role="staff")
        self.admin = User(id="admin-1", full_name="Admin One", email="admin@example.edu", role="admin")
        db.add_all([self.sector, self.student, self.other_student, self.staff, self.admin])
        db.flush()
        db.add(StaffAssignment(
            id="staff-sector-1",
            staff_user_id=self.staff.id,
            sector_id=self.sector.id,
        ))
        db.commit()
        db.close()
        self.student_headers = self._headers(self.student)
        self.staff_headers = self._headers(self.staff)
        self.admin_headers = self._headers(self.admin)
        self.other_student_headers = self._headers(self.other_student)

    @staticmethod
    def _headers(user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {create_access_token(user)}"}

    def test_complaint_is_classified_assigned_and_scoped(self) -> None:
        unauthorized = client.get("/complaints")
        self.assertEqual(unauthorized.status_code, 401)
        forged_user_id = client.get("/complaints", headers={"Authorization": "Bearer student-1"})
        self.assertEqual(forged_user_id.status_code, 401)

        response = client.post(
            "/complaints",
            headers=self.student_headers,
            json={
                "title": "Wi-Fi is not working in C Block",
                "description": "The campus network keeps disconnecting.",
                "location": "C Block",
            },
        )
        self.assertEqual(response.status_code, 201)
        complaint = response.json()
        self.assertEqual(complaint["sector"]["name"], "IT & Wi-Fi")
        self.assertEqual(complaint["assigned_staff_id"], self.staff.id)
        self.assertEqual(complaint["status"], "assigned")
        self.assertGreaterEqual(len(complaint["status_history"]), 2)

        forbidden = client.get(f"/complaints/{complaint['id']}", headers=self.other_student_headers)
        self.assertEqual(forbidden.status_code, 403)
        student_list = client.get("/complaints", headers=self.other_student_headers)
        self.assertEqual(student_list.status_code, 200)
        self.assertEqual(student_list.json(), [])
        staff_list = client.get("/complaints", headers=self.staff_headers)
        self.assertEqual([item["id"] for item in staff_list.json()], [complaint["id"]])

    def test_status_changes_notify_student_and_write_history(self) -> None:
        created = client.post(
            "/complaints",
            headers=self.student_headers,
            json={
                "title": "Wi-Fi disconnected in C Block",
                "description": "Network access is unavailable.",
                "location": "C Block",
            },
        ).json()

        student_cannot_investigate = client.patch(
            f"/complaints/{created['id']}/status",
            headers=self.student_headers,
            json={"status": "investigating"},
        )
        self.assertEqual(student_cannot_investigate.status_code, 403)

        resolved = client.patch(
            f"/complaints/{created['id']}/status",
            headers=self.staff_headers,
            json={"status": "resolved", "comment": "Access point restarted."},
        )
        self.assertEqual(resolved.status_code, 200)
        notifications = client.get("/notifications", headers=self.student_headers).json()
        self.assertTrue(any(item["type"] == "STATUS_CHANGED" for item in notifications))

        closed = client.patch(
            f"/complaints/{created['id']}/status",
            headers=self.student_headers,
            json={"status": "closed", "comment": "Student confirmed resolution"},
        )
        self.assertEqual(closed.status_code, 200)
        detail = client.get(f"/complaints/{created['id']}", headers=self.student_headers).json()
        self.assertEqual(detail["status"], "closed")
        self.assertEqual(detail["status_history"][-1]["new_status"], "closed")

    def test_admin_changes_are_audited_and_private_routes_are_restricted(self) -> None:
        response = client.post(
            "/complaints",
            headers=self.student_headers,
            json={
                "title": "Wi-Fi down in C Block",
                "description": "Network is unavailable.",
                "location": "C Block",
            },
        )
        complaint_id = response.json()["id"]

        self.assertEqual(client.get("/analytics", headers=self.student_headers).status_code, 403)
        self.assertEqual(client.get("/users", headers=self.staff_headers).status_code, 403)

        priority = client.patch(
            f"/complaints/{complaint_id}/priority",
            headers=self.admin_headers,
            json={"priority": "high", "reason": "Several students report an outage."},
        )
        self.assertEqual(priority.status_code, 200)
        audit = client.get("/audit", headers=self.admin_headers)
        self.assertEqual(audit.status_code, 200)
        self.assertTrue(any(action["action"] == "priority_changed" for action in audit.json()))

    def test_similar_reports_are_grouped_and_count_distinct_students(self) -> None:
        reports = [
            ("Wi-Fi is not working in C Block", "The campus network connection has stopped working."),
            ("Internet keeps disconnecting", "Wi-Fi access drops every few minutes in C Block."),
            ("Student portal is unavailable", "The network connection cannot reach the campus portal."),
        ]
        for index, (title, description) in enumerate(reports):
            headers = self.student_headers if index != 1 else self.other_student_headers
            response = client.post(
                "/complaints",
                headers=headers,
                json={"title": title, "description": description, "location": "C Block"},
            )
            self.assertEqual(response.status_code, 201)

        groups = client.get("/issues", headers=self.admin_headers)
        self.assertEqual(groups.status_code, 200)
        self.assertEqual(len(groups.json()), 1)
        self.assertEqual(groups.json()[0]["complaint_count"], 3)
        self.assertEqual(groups.json()[0]["affected_users"], 2)
        group_id = groups.json()[0]["id"]

        assignment = client.patch(
            f"/issues/{group_id}/assign",
            headers=self.admin_headers,
            json={"staff_id": self.staff.id},
        )
        self.assertEqual(assignment.status_code, 200)
        self.assertEqual(assignment.json()["complaints_assigned"], 3)
        staff_notifications = client.get("/notifications", headers=self.staff_headers).json()
        self.assertTrue(any(item["type"] == "ASSIGNMENT" for item in staff_notifications))
        notified = client.post(f"/issues/{group_id}/notify", headers=self.admin_headers)
        self.assertEqual(notified.status_code, 200)
        self.assertEqual(notified.json()["recipients"], 1)

    def test_image_evidence_is_validated_and_private(self) -> None:
        complaint = client.post(
            "/complaints",
            headers=self.student_headers,
            json={
                "title": "Wi-Fi unavailable",
                "description": "Network connection is down.",
                "location": "C Block",
            },
        ).json()
        image_bytes = BytesIO()
        Image.new("RGB", (2, 2), color="blue").save(image_bytes, format="PNG")
        image_bytes.seek(0)

        with TemporaryDirectory() as upload_dir:
            with patch("routers.complaints.UPLOAD_DIR", Path(upload_dir)):
                uploaded = client.post(
                    f"/complaints/{complaint['id']}/attachments",
                    headers=self.student_headers,
                    files={"file": ("campus.png", image_bytes.getvalue(), "image/png")},
                )
                self.assertEqual(uploaded.status_code, 201)
                attachment = uploaded.json()
                self.assertEqual(attachment["content_type"], "image/png")

                listing = client.get(
                    f"/complaints/{complaint['id']}/attachments",
                    headers=self.student_headers,
                )
                self.assertEqual(len(listing.json()), 1)
                forbidden = client.get(
                    f"/complaints/{complaint['id']}/attachments",
                    headers=self.other_student_headers,
                )
                self.assertEqual(forbidden.status_code, 403)
                download = client.get(
                    f"/complaints/{complaint['id']}/attachments/{attachment['id']}",
                    headers=self.student_headers,
                )
                self.assertEqual(download.status_code, 200)
                self.assertEqual(download.content, image_bytes.getvalue())


if __name__ == "__main__":
    unittest.main()
