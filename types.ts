

export enum UserRole {
  ADMIN = 'ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT',
  FINANCE = 'FINANCE',
  REGISTRAR = 'REGISTRAR'
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  department?: string;
  avatar: string;
  enrollmentNo?: string;
  designation?: string;
  org_id?: string;
  campus?: string;
  login_id?: string;
  must_change_password?: boolean;
  is_active?: boolean;
  last_seen?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
  category: 'core' | 'academic' | 'admin' | 'records' | 'system';
}

export interface AttendanceRecord {
  courseCode: string;
  courseName: string;
  percentage: number;
  classesHeld: number;
  classesAttended: number;
  status?: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  status: 'available' | 'issued' | 'reserved';
  dueDate?: string;
  callNumber?: string;
  cover?: string;
}

export interface LearningMetric {
  id: string;
  user_id: string;
  overall_score: number;
  attendance_score: number;
  assessment_score: number;
  activity_score: number;
  risk_level: 'NORMAL' | 'WARNING' | 'CRITICAL';
  prediction_summary: string;
  gpa_proxy: number;
  velocity_json: string;
  updated_at: string;
}

export interface StudyTask {
  id: string;
  title: string;
  duration: string;
  priority: 'HIGH' | 'URGENT' | 'MEDIUM' | 'LOW';
  type: 'REVISION' | 'PROJECT' | 'VIDEO' | 'ASSIGNMENT';
  completed: boolean;
  dueDate?: string;
}

export interface Recommendation {
  id: string;
  type: 'REVISE' | 'PRACTICE' | 'ATTEND' | 'EXPLORE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  link?: string;
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS' | 'WARNING';
  is_read: boolean;
  created_at: string;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

export interface CertificateRecord {
  id: string;
  user_id: string;
  student_name: string;
  student_email?: string;
  course_id: string;
  course_name: string;
  course_code: string;
  category?: string;
  department?: string;
  total_lessons?: number;
  completed_lessons?: number;
  progress_pct?: number;
  progress_met?: boolean;
  attendance_pct: number | null;
  attendance_met?: boolean;
  attendance_threshold?: number;
  assessment_pct: number | null;
  assessment_met?: boolean;
  assessment_threshold?: number;
  is_eligible?: boolean;
  issued_date: string;
  certificate_code?: string | null;
  certificate_url?: string | null;
  eligibility_status: 'ELIGIBLE' | 'ISSUED' | 'REVOKED' | 'INELIGIBLE';
}


export interface CertificateSettings {
  org_id: string;
  min_attendance_pct: number;
  min_assessment_pct: number;
  min_progress_pct?: number;
  updated_at?: string;
}


