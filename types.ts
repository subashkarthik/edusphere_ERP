

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
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
  category: 'core' | 'academic' | 'admin' | 'auxiliary' | 'learning' | 'records' | 'resources' | 'system' | 'ecosystem';
}

export interface EcosystemModule {
  id: string;
  name: string;
  code: string;
  category: 'core_operations' | 'academic_excellence' | 'student_lifecycle' | 'auxiliary_services';
  icon: string;
  status: 'ACTIVE' | 'DEPLOYED' | 'REALTIME' | 'ENTERPRISE';
  description: string;
  metricsSummary: string;
  kpi: string;
  kpiLabel: string;
}

export interface ExecutiveKPI {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  description: string;
  category: 'health' | 'finance' | 'academics' | 'compliance';
}

export interface AttendanceRecord {
  courseCode: string;
  courseName: string;
  percentage: number;
  classesHeld: number;
  classesAttended: number;
  status?: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface TimetableEntry {
  day: string;
  time: string;
  course: string;
  venue: string;
  faculty?: string;
  roomType?: string;
}

export interface PlacementStats {
  year: string;
  placed: number;
  total: number;
  avgLPA: number;
  highestLPA?: number;
}

export interface PlacementDrive {
  id: string;
  company: string;
  logo: string;
  role: string;
  ctc: string;
  eligibilityCgpa: number;
  status: 'OPEN' | 'INTERVIEWING' | 'CLOSED';
  applicantsCount: number;
  deadline: string;
}

export interface ResearchGrant {
  id: string;
  title: string;
  principalInvestigator: string;
  agency: string;
  amount: string;
  status: 'APPROVED' | 'IN_REVIEW' | 'COMPLETED';
  department: string;
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
  total_lessons?: number;
  completed_lessons?: number;
  progress_pct?: number;
  issued_date: string;
  certificate_code: string;
  certificate_url?: string | null;
  eligibility_status: 'ELIGIBLE' | 'ISSUED' | 'REVOKED' | 'INELIGIBLE';
  attendance_pct: number;
  assessment_pct: number;
}


export interface CertificateSettings {
  org_id: string;
  min_attendance_pct: number;
  min_assessment_pct: number;
  updated_at?: string;
}


