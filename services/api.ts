import { LearningMetric, Recommendation, UserNotification, StudyTask } from '../types';

/**
 * EduSphere LMS — API Client
 * 
 * Centralized HTTP client for communicating with the FastAPI backend.
 * Handles JWT token management, automatic refresh, and request/response interceptors.
 */

const API_BASE = '/api';

// ---------- Persistent Token Storage ----------
const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';

let accessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
let refreshToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getAccessToken = () => {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return accessToken;
};

export const getRefreshToken = () => {
  if (!refreshToken && typeof window !== 'undefined') {
    refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return refreshToken;
};

export const getToken = () => getAccessToken();

// ---------- Core Fetch Wrapper ----------
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    // Network failure (offline, airplane mode, DNS fail, server down)
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const msg = isOffline 
      ? 'You are currently offline. Please check your internet connection and try again.'
      : 'Unable to reach the server. Please check your network connection.';
    console.warn(`[API Network Error] ${endpoint}:`, netErr);
    throw new Error(msg);
  }

  // Handle 401 - attempt token refresh or redirect to login
  if (response.status === 401) {
    const rToken = getRefreshToken();
    if (retry && rToken) {
      const refreshed = await attemptRefresh();
      if (refreshed) {
        return apiFetch<T>(endpoint, options, false);
      }
    }
    clearTokens();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    const error = await response.json().catch(() => ({ detail: 'Unauthorized' }));
    throw new Error(error.detail || 'HTTP 401');
  }

  if (response.status === 503) {
    const data = await response.json().catch(() => ({ detail: 'Service temporarily unavailable or offline.' }));
    throw new Error(data.detail || 'You are currently offline.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

async function attemptRefresh(): Promise<boolean> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: currentRefreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

// ---------- Auth API ----------
export const authApi = {
  login: (identifier: string, password: string) =>
    apiFetch<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      user: {
        id: string;
        name: string;
        email: string;
        role: string;
        department: string | null;
        avatar: string;
        enrollment_no: string | null;
        designation: string | null;
        phone?: string | null;
        org_id?: string;
        login_id?: string;
        must_change_password?: boolean;
        semester?: number | null;
        section?: string | null;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, password }),
    }),

  changePassword: (data: { current_password?: string; new_password: string }, token?: string) =>
    apiFetch<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  getMe: () => apiFetch<any>('/auth/me'),

  logout: () => apiFetch<any>('/auth/logout', { method: 'POST' }),
};

// ---------- Intelligence API ----------
export const intelligenceApi = {
  metrics: () => apiFetch<LearningMetric>('/intelligence/metrics'),
  recommendations: () => apiFetch<Recommendation[]>('/intelligence/recommendations'),
  getNotifications: () => apiFetch<UserNotification[]>('/intelligence/notifications'),
  markAsRead: (id: string) => apiFetch<any>(`/intelligence/notifications/${id}/read`, { method: 'POST' }),
  tasks: () => apiFetch<StudyTask[]>('/intelligence/tasks'),
  toggleTask: (id: string) => apiFetch<StudyTask>(`/intelligence/tasks/${id}/toggle`, { method: 'POST' }),
};

// ---------- Attendance API ----------
export const attendanceApi = {
  summary: () => apiFetch<any[]>('/attendance/summary'),
  getMe: () => apiFetch<{ summary: any[]; history: any[]; overall_percentage: number; total_courses: number; has_warning: boolean }>('/attendance/me'),
  getCourseAttendance: (courseId: string, date?: string) =>
    apiFetch<any>(date ? `/attendance/course/${courseId}?date=${date}` : `/attendance/course/${courseId}`),
  getCourseSummary: (courseId: string) => apiFetch<any>(`/attendance/summary/${courseId}`),
  mark: (data: { course_id: string; date: string; marks: { student_id: string; status: string }[] }) =>
    apiFetch<any>('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
  markAttendance: (data: any) =>
    apiFetch<any>('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
  getHistory: (courseId?: string) =>
    apiFetch<any[]>(courseId ? `/attendance/history/${courseId}` : '/attendance/me'),
};

// ---------- Subjects & Curriculum API ----------
export const subjectApi = {
  getSubjects: () => apiFetch<any[]>('/subjects/'),
  getCurriculum: (subjectId: string) => apiFetch<any[]>(`/subjects/${subjectId}/curriculum`),
};

export const coursesApi = {
  list: (all: boolean = false) => apiFetch<any[]>(all ? '/courses/?all=true' : '/courses/'),
  get: (courseId: string) => apiFetch<any>(`/courses/${courseId}`),
  myEnrollments: () => apiFetch<any[]>('/courses/my-enrollments'),
  create: (data: any) => apiFetch<any>('/courses/', { method: 'POST', body: JSON.stringify(data) }),
  update: (courseId: string, data: any) => apiFetch<any>(`/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (courseId: string) => apiFetch<any>(`/courses/${courseId}`, { method: 'DELETE' }),
  selfEnroll: (courseId: string) => apiFetch<any>(`/courses/${courseId}/self-enroll`, { method: 'POST' }),
  getEnrolledStudents: (courseId: string) => apiFetch<any>(`/courses/${courseId}/students`),
  materials: (id: string) => apiFetch<any[]>(`/courses/${id}/materials`),
  uploadFile: async (courseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/courses/${courseId}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  addModule: (courseId: string, data: any) => apiFetch<any>(`/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(data) }),
  updateModule: (moduleId: string, data: any) => apiFetch<any>(`/courses/modules/${moduleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteModule: (moduleId: string) => apiFetch<any>(`/courses/modules/${moduleId}`, { method: 'DELETE' }),
  addLesson: (moduleId: string, data: any) => apiFetch<any>(`/courses/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (lessonId: string, data: any) => apiFetch<any>(`/courses/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLesson: (lessonId: string) => apiFetch<any>(`/courses/lessons/${lessonId}`, { method: 'DELETE' }),
};

// ---------- Exams & Results API ----------
export const examApi = {
  getSchedules: () => apiFetch<any[]>('/exams/schedules'),
  getResults: () => apiFetch<any[]>('/exams/results'),
  getQuizzes: () => apiFetch<any[]>('/exams/quizzes'),
  getQuizDetails: (id: string) => apiFetch<any>(`/exams/quizzes/${id}`),
  getQuizAttempts: (id: string) => apiFetch<any>(`/exams/quizzes/${id}/attempts`),
  submitQuiz: (id: string, answers: Record<string, string>, tab_switch_violations: number = 0) =>
    apiFetch<any>(`/exams/quizzes/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, tab_switch_violations }),
    }),
  createQuiz: (data: any) =>
    apiFetch<any>('/exams/quizzes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  publishQuizResults: (id: string) =>
    apiFetch<any>(`/exams/quizzes/${id}/publish-results`, {
      method: 'POST',
    }),
};

export const examsApi = {
  schedules: () => apiFetch<any[]>('/exams/schedules'),
  transcripts: () => apiFetch<any[]>('/exams/transcripts'),
  quizzes: () => apiFetch<any[]>('/exams/quizzes'),
};

export const uploadApi = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/upload/file', {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
};

// ---------- CMS API ----------
export const cmsApi = {
  getInventory: () => apiFetch<any[]>('/cms/my-inventory'),
  createCourse: (data: any) =>
    apiFetch<any>('/cms/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCourse: (id: string, data: any) =>
    apiFetch<any>(`/cms/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCourse: (id: string) =>
    apiFetch<any>(`/cms/courses/${id}`, {
      method: 'DELETE',
    }),
  getCurriculum: (courseId: string) =>
    apiFetch<any[]>(`/cms/courses/${courseId}/curriculum`),
  addModule: (courseId: string, data: any) =>
    apiFetch<any>(`/cms/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addLesson: (moduleId: string, data: any) =>
    apiFetch<any>(`/cms/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  bulkEnroll: (courseId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/cms/courses/${courseId}/bulk-enroll`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
      },
      body: formData,
    }).then(res => res.json());
  },
  submitCourse: (id: string) =>
    apiFetch<any>(`/cms/courses/${id}/submit`, {
      method: 'POST',
    }),
  approveCourse: (id: string) =>
    apiFetch<any>(`/cms/courses/${id}/approve`, {
      method: 'POST',
    }),
  rejectCourse: (id: string, remarks: string) =>
    apiFetch<any>(`/cms/courses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),
  getEnrolledStudents: (courseId: string) =>
    apiFetch<any>(`/cms/courses/${courseId}/students`),
};

// ---------- Announcements API ----------
export const announcementsApi = {
  list: () => apiFetch<any[]>('/announcements/'),
  create: (data: any) => apiFetch<any>('/announcements/', { method: 'POST', body: JSON.stringify(data) }),
};

// ---------- Users API ----------
export const usersApi = {
  list: (role?: string) => apiFetch<any[]>(role ? `/users/?role=${role}` : '/users/'),
  delete: (id: string) => apiFetch<any>(`/users/${id}`, { method: 'DELETE' }),
  update: (id: string, data: any) => apiFetch<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  provisionStudent: (data: {
    name: string;
    register_no: string;
    email: string;
    department: string;
    semester: number;
    section: string;
  }) => apiFetch<{
    message: string;
    login_id: string;
    temp_password: string;
    user: any;
  }>('/users/student', { method: 'POST', body: JSON.stringify(data) }),
  provisionFaculty: (data: {
    name: string;
    email: string;
    department: string;
    designation?: string;
    phone?: string;
  }) => apiFetch<{
    message: string;
    login_id: string;
    temp_password: string;
    user: any;
  }>('/users/faculty', { method: 'POST', body: JSON.stringify(data) }),
  provisionAdmin: (data: {
    name: string;
    email: string;
    department?: string;
    phone?: string;
  }) => apiFetch<{
    message: string;
    login_id: string;
    temp_password: string;
    user: any;
  }>('/users/admin', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, is_active: boolean) =>
    apiFetch<any>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  resetPassword: (id: string) =>
    apiFetch<{
      message: string;
      user_id: string;
      login_id: string;
      temp_password: string;
    }>(`/users/${id}/reset-password`, { method: 'POST' }),
  exportData: (id: string) => apiFetch<any>(`/users/${id}/export-data`),
  purgeData: (id: string, reason: string) =>
    apiFetch<any>(`/users/${id}/purge-data`, {
      method: 'POST',
      body: JSON.stringify({ reason, confirm: true }),
    }),
  bulkPreview: async (file: File) => {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/users/bulk-preview`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to parse preview file' }));
      throw new Error(err.detail || 'Preview failed');
    }
    return res.json() as Promise<{
      total_rows: number;
      valid_count: number;
      invalid_count: number;
      preview: Array<{
        row: number;
        name: string;
        register_no: string;
        email: string;
        department: string;
        semester: number;
        section: string;
        valid: boolean;
        errors: string[];
      }>;
    }>;
  },
  bulkImport: async (file: File) => {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/users/bulk-import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to import student accounts' }));
      throw new Error(err.detail || 'Import failed');
    }
    return res.blob();
  },
  changePassword: (data: any) => apiFetch<any>('/users/change-password', { method: 'POST', body: JSON.stringify(data) }),
};

// ---------- Assignments API ----------
export const assignmentsApi = {
  list: () => apiFetch<any[]>('/assignments/'),
  submit: (assignmentId: string, fileUrl: string) => 
    apiFetch<any>('/assignments/submit', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: assignmentId, file_url: fileUrl })
    }),
  create: (data: any) => apiFetch<any>('/assignments/', { method: 'POST', body: JSON.stringify(data) }),
  listSubmissions: () => apiFetch<any[]>('/assignments/submissions'),
  gradeSubmission: (id: string, data: any) => apiFetch<any>(`/assignments/submissions/${id}/grade`, { method: 'POST', body: JSON.stringify(data) }),
  publishResults: (id: string) => apiFetch<any>(`/assignments/${id}/publish-results`, { method: 'POST' }),
};

// ---------- System API ----------
export const systemApi = {
  dbHealth: () => apiFetch<any>('/health/db'),
  health: () => apiFetch<any>('/health'),
  getConfig: () => apiFetch<any>('/dashboard/system/config'),
  provision: (data: any) => apiFetch<any>('/dashboard/system/provision', { method: 'POST', body: JSON.stringify(data) }),
  runAudit: () => apiFetch<any>('/dashboard/system/audit', { method: 'POST' }),
};

// ---------- Dashboard API ----------
export const dashboardApi = {
  getStudentDashboard: () => apiFetch<any>('/dashboard/student'),
  getFacultyDashboard: () => apiFetch<any>('/dashboard/faculty'),
  getAdminDashboard: () => apiFetch<any>('/dashboard/admin'),
  getMetrics: () => apiFetch<any[]>('/dashboard/metrics'),
  getActivity: () => apiFetch<any[]>('/dashboard/activity'),
  getAnalytics: () => apiFetch<any>('/dashboard/analytics'),
};

// ---------- Workspace API ----------
export const workspaceApi = {
  getModules: (courseId: string) => apiFetch<any[]>(`/workspace/course/${courseId}/modules`),
  getLessons: (moduleId: string) => apiFetch<any[]>(`/workspace/module/${moduleId}/lessons`),
  getAssignments: (course_id: string) => apiFetch<any[]>(`/workspace/course/${course_id}/assignments`),
  submitAssignment: (id: string, file_url: string) => apiFetch<any>(`/workspace/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify({ file_url }) }),
  getDiscussions: (courseId: string) => apiFetch<any[]>(`/workspace/course/${courseId}/discussions`),
  postDiscussion: (courseId: string, content: string) => apiFetch<any>(`/workspace/course/${courseId}/discussions`, { method: 'POST', body: JSON.stringify({ content }) }),
};

export const videosApi = {
  journey: () => apiFetch<any[]>('/videos/journey'),
  cloudStatus: () => apiFetch<any>('/videos/cloud-status'),
  recordProgress: (lesson_id: string, completed: boolean) =>
    apiFetch<any>('/videos/progress', {
      method: 'POST',
      body: JSON.stringify({ lesson_id, completed }),
    }),
};

export const certificatesApi = {
  getSettings: () => apiFetch<any>('/certificates/settings'),
  getCertificates: (isAdmin: boolean) =>
    apiFetch<any[]>(isAdmin ? '/certificates/all' : '/certificates/my-certificates'),
  updateSettings: (data: { min_attendance_pct: number; min_assessment_pct: number; min_progress_pct?: number }) =>
    apiFetch<any>('/certificates/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  revokeCertificate: (certId: string) =>
    apiFetch<any>(`/certificates/revoke/${certId}`, { method: 'POST' }),
  issueCertificate: (courseId: string, studentId?: string) =>
    apiFetch<any>('/certificates/issue', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, student_id: studentId }),
    }),
  overrideCertificate: (studentId: string, courseId: string, reason: string) =>
    apiFetch<any>('/certificates/override', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, course_id: courseId, reason }),
    }),
  verify: async (code: string) => {
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(code)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed' }));
      throw new Error(err.detail || 'Certificate not found or invalid.');
    }
    return res.json();
  },
};

// ---------- Reports API ----------
export const reportsApi = {
  getAdminSummary: () => apiFetch<{
    summary: {
      total_courses: number;
      total_enrollments: number;
      total_certificates: number;
      overall_attendance_rate: number;
    };
    courses: Array<{
      course_id: string;
      course_code: string;
      course_name: string;
      faculty_name: string;
      enrollment_count: number;
      average_attendance: number;
      average_score: number;
      certificates_issued: number;
    }>;
  }>('/reports/admin/summary'),

  downloadAttendanceCSV: async (courseId?: string) => {
    const token = getAccessToken();
    const url = courseId ? `/api/reports/attendance.csv?course_id=${encodeURIComponent(courseId)}` : '/api/reports/attendance.csv';
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(err.detail || 'Failed to export attendance CSV');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `attendance_report_${courseId || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  downloadMarksCSV: async (courseId?: string) => {
    const token = getAccessToken();
    const url = courseId ? `/api/reports/marks.csv?course_id=${encodeURIComponent(courseId)}` : '/api/reports/marks.csv';
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(err.detail || 'Failed to export marks CSV');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `marks_report_${courseId || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  downloadCertificatesCSV: async (courseId?: string) => {
    const token = getAccessToken();
    const url = courseId ? `/api/reports/certificates.csv?course_id=${encodeURIComponent(courseId)}` : '/api/reports/certificates.csv';
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(err.detail || 'Failed to export certificates CSV');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `certificates_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};

export interface AppNotification {
  id: string;
  user_id: string;
  org_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  is_read?: boolean;
  link?: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: (limit = 50) => apiFetch<{ unread_count: number; notifications: AppNotification[] }>(`/notifications?limit=${limit}`),
  markRead: (id: string) => apiFetch<{ message: string; notification: AppNotification; unread_count: number }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => apiFetch<{ message: string; unread_count: number }>(`/notifications/read-all`, { method: 'POST' })
};

// ─── UNIFIED ACADEMIC METRICS API (server/services/metrics.py) ───
export interface AcademicAttendanceMetric {
  course_id?: string;
  student_id?: string;
  attended: number;
  held: number;
  pct: number | null;
  status: string;
  is_low: boolean;
}

export interface AcademicAssessmentMetric {
  course_id?: string;
  student_id?: string;
  pct: number | null;
  score: number | null;
  graded_count: number;
  pending_count: number;
  total_items: number;
}

export interface AcademicProgressMetric {
  course_id?: string;
  student_id?: string;
  completed: number;
  total: number;
  pct: number | null;
}

export interface CourseMetricItem {
  course_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  faculty_name: string;
  attendance: AcademicAttendanceMetric;
  assessment: AcademicAssessmentMetric;
  progress: AcademicProgressMetric;
  certificate: {
    eligible: boolean;
    is_issued: boolean;
    certificate_code?: string | null;
    reasons: string[];
    attendance_ok: boolean;
    assessment_ok: boolean;
    progress_ok: boolean;
    policy?: {
      min_attendance_pct: number;
      min_assessment_pct: number;
      min_progress_pct: number;
    };
  };
}

export interface StudentSummaryResponse {
  user_id: string;
  name: string;
  email: string;
  role: string;
  overall_attendance: {
    attended: number;
    held: number;
    pct: number | null;
    is_low: boolean;
    courses_count: number;
    formula: string;
  };
  overall_assessment_pct: number | null;
  overall_progress_pct: number | null;
  courses_count: number;
  courses: CourseMetricItem[];
}

export const meApi = {
  summary: () => apiFetch<StudentSummaryResponse>('/me/summary'),
  courseMetrics: (courseId: string) => apiFetch<CourseMetricItem>(`/me/courses/${courseId}/metrics`),
};

export const facultyApi = {
  courseMetrics: (courseId: string) => apiFetch<any>(`/faculty/courses/${courseId}/metrics`),
};

export const adminApi = {
  overview: () => apiFetch<any>('/admin/overview'),
};


