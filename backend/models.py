import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    google_id = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    profile_photo = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(String, default="student") # student, staff, admin
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    complaints = relationship("Complaint", foreign_keys="Complaint.student_id", back_populates="student")
    assigned_complaints = relationship("Complaint", foreign_keys="Complaint.assigned_staff_id", back_populates="assigned_staff")

class Sector(Base):
    __tablename__ = "sectors"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class StaffAssignment(Base):
    __tablename__ = "staff_assignments"

    id = Column(String, primary_key=True, default=generate_uuid)
    staff_user_id = Column(String, ForeignKey("users.id"))
    sector_id = Column(String, ForeignKey("sectors.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    staff = relationship("User")
    sector = relationship("Sector")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=generate_uuid)
    complaint_number = Column(String, unique=True, index=True)
    student_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    category = Column(String)
    sector_id = Column(String, ForeignKey("sectors.id"))
    location = Column(String)
    priority = Column(String) # low, medium, high, critical
    priority_score = Column(Float, default=0.0)
    severity = Column(String, nullable=True)
    status = Column(String, default="submitted")
    assigned_staff_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    student = relationship("User", foreign_keys=[student_id], back_populates="complaints")
    assigned_staff = relationship("User", foreign_keys=[assigned_staff_id], back_populates="assigned_complaints")
    sector = relationship("Sector")
    status_history = relationship("StatusHistory", back_populates="complaint")

class IssueGroup(Base):
    __tablename__ = "issue_groups"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String)
    description = Column(Text)
    sector_id = Column(String, ForeignKey("sectors.id"))
    category = Column(String)
    complaint_count = Column(Integer, default=0)
    affected_users = Column(Integer, default=0)
    affected_locations = Column(JSON, default=list) # JSON string of list in sqlite or JSON type
    trend_percentage = Column(Float, default=0.0)
    priority = Column(String)
    first_detected = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="active")

    sector = relationship("Sector")

class ComplaintGroupMember(Base):
    __tablename__ = "complaint_group_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    complaint_id = Column(String, ForeignKey("complaints.id"))
    issue_group_id = Column(String, ForeignKey("issue_groups.id"))
    similarity_score = Column(Float, default=0.0)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    recipient_user_id = Column(String, ForeignKey("users.id"))
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=True)
    issue_group_id = Column(String, ForeignKey("issue_groups.id"), nullable=True)
    title = Column(String)
    message = Column(Text)
    type = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(String, primary_key=True, default=generate_uuid)
    complaint_id = Column(String, ForeignKey("complaints.id"))
    old_status = Column(String)
    new_status = Column(String)
    changed_by = Column(String, ForeignKey("users.id"))
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="status_history")
    user = relationship("User", foreign_keys=[changed_by])

class AdminAction(Base):
    __tablename__ = "admin_actions"

    id = Column(String, primary_key=True, default=generate_uuid)
    admin_id = Column(String, ForeignKey("users.id"))
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=True)
    action = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
