export type Role = 'student' | 'staff' | 'admin';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'submitted' | 'assigned' | 'acknowledged' | 'investigating' | 'action_taken' | 'resolved' | 'closed';

export interface User {
  id: string;
  google_id?: string;
  full_name: string;
  email: string;
  profile_photo?: string;
  phone?: string;
  role: Role;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  student_id: string;
  student?: User;
  title: string;
  description: string;
  category: string;
  sector_id: string;
  sector?: Sector;
  location: string;
  priority: Priority;
  priority_score: number;
  severity: string;
  status: Status;
  assigned_staff_id?: string;
  assigned_staff?: User;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  classification_reason?: string;
  status_history?: StatusHistory[];
}

export interface IssueGroup {
  id: string;
  title: string;
  description: string;
  sector_id: string;
  sector?: Sector;
  category: string;
  complaint_count: number;
  affected_users: number;
  affected_locations: string[];
  trend_percentage: number;
  priority: Priority;
  first_detected: string;
  last_updated: string;
  status: string;
  priority_explanation?: string;
  related_complaints?: Complaint[];
}

export interface Notification {
  id: string;
  recipient_user_id: string;
  complaint_id?: string;
  issue_group_id?: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_by_user?: User;
  comment?: string;
  created_at: string;
}

export interface Analytics {
  complaints_by_sector: { name: string; count: number; color: string }[];
  complaints_by_priority: { name: string; count: number; color: string }[];
  complaints_by_status: { name: string; count: number }[];
  complaints_over_time: { date: string; count: number }[];
  resolution_times: { sector: string; avg_hours: number }[];
  top_locations: { location: string; count: number }[];
  total_complaints: number;
  open_issues: number;
  high_priority: number;
  resolved: number;
  emerging_signals: number;
  avg_resolution_hours: number;
  staff_performance: StaffPerformance[];
}

export interface StaffPerformance {
  staff_id: string;
  staff_name: string;
  sector: string;
  assigned: number;
  resolved: number;
  avg_resolution_hours: number;
  pending: number;
}
