from pydantic import BaseModel, EmailStr, Field
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    profile_photo: Optional[str] = None
    phone: Optional[str] = None
    role: str = "student"
    department: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    google_id: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class SectorBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: bool = True

class SectorCreate(SectorBase):
    pass

class SectorResponse(SectorBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ComplaintBase(BaseModel):
    title: str
    description: str
    location: str

class ComplaintCreate(ComplaintBase):
    pass


class StatusUpdate(BaseModel):
    status: Literal["submitted", "assigned", "acknowledged", "investigating", "action_taken", "resolved", "closed"]
    comment: Optional[str] = Field(default=None, max_length=2000)


class ComplaintAssignment(BaseModel):
    staff_id: str = Field(min_length=1)


class ComplaintPriorityUpdate(BaseModel):
    priority: Literal["low", "medium", "high", "critical"]
    reason: str = Field(min_length=1, max_length=2000)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    role: Optional[Literal["student", "staff", "admin"]] = None
    department: Optional[str] = Field(default=None, max_length=200)
    is_active: Optional[bool] = None
    phone: Optional[str] = Field(default=None, max_length=40)
    profile_photo: Optional[str] = Field(default=None, max_length=2000)


class StaffAssignmentCreate(BaseModel):
    staff_user_id: str = Field(min_length=1)
    sector_id: str = Field(min_length=1)


class StaffCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    department: Optional[str] = Field(default=None, max_length=200)


class IssueStatusUpdate(BaseModel):
    status: Literal["active", "investigating", "resolved", "closed"]


class IssueAssignment(BaseModel):
    staff_id: str = Field(min_length=1)


class StatusHistoryResponse(BaseModel):
    id: str
    complaint_id: str
    old_status: str
    new_status: str
    changed_by: str
    comment: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class ComplaintResponse(ComplaintBase):
    id: str
    complaint_number: str
    student_id: str
    category: str
    sector_id: str
    priority: str
    priority_score: float
    severity: Optional[str] = None
    status: str
    assigned_staff_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    student: Optional[UserResponse] = None
    sector: Optional[SectorResponse] = None
    assigned_staff: Optional[UserResponse] = None
    status_history: List[StatusHistoryResponse] = []

    class Config:
        from_attributes = True

class IssueGroupResponse(BaseModel):
    id: str
    title: str
    description: str
    sector_id: str
    category: str
    complaint_count: int
    affected_users: int
    affected_locations: List[str]
    trend_percentage: float
    priority: str
    first_detected: datetime
    last_updated: datetime
    status: str
    sector: Optional[SectorResponse] = None

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: str
    recipient_user_id: str
    complaint_id: Optional[str] = None
    issue_group_id: Optional[str] = None
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    complaints_by_sector: Dict[str, int]
    complaints_by_priority: Dict[str, int]
    complaints_by_status: Dict[str, int]
    complaints_over_time: Dict[str, int]
    resolution_times: Dict[str, Any]
    top_locations: List[Dict[str, Any]]
    emerging_issues: List[IssueGroupResponse]
    staff_performance: List[Dict[str, Any]]
