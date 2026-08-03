import { LearningMetric, Recommendation, UserNotification, StudyTask } from '../types';

/**
 * EduSphere LMS — API Client
 * 
 * Centralized HTTP client for communicating with the FastAPI backend.
 * Handles JWT token management, automatic refresh, and request/response interceptors.
 */

const API_BASE = '/api';

// ---------- Token Storage (in-memory for security) ----------
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
};

export const getAccessToken = () => accessToken;

// ---------- Core Fetch Wrapper ----------
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - attempt token refresh
  if (response.status === 401 && retry && refreshToken) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return apiFetch<T>(endpoint, options, false);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

async function attemptRefresh(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
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
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, password }),
    }),

  registerPublic: (data: any) =>
    apiFetch<any>('/auth/register-public', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: any) =>
    apiFetch<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
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
  getHistory: () => apiFetch<any[]>('/attendance/history'),
  markAttendance: (data: any) => apiFetch<any>('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
};

// ---------- Subjects & Curriculum API ----------
export const subjectApi = {
  getSubjects: () => apiFetch<any[]>('/subjects/'),
  getCurriculum: (subjectId: string) => apiFetch<any[]>(`/subjects/${subjectId}/curriculum`),
};

export const coursesApi = {
  list: () => apiFetch<any[]>('/courses/'),
  materials: (id: string) => apiFetch<any[]>(`/courses/${id}/materials`),
};

// ---------- Exams & Results API ----------
export const examApi = {
  getSchedules: () => apiFetch<any[]>('/exams/schedules'),
  getResults: () => apiFetch<any[]>('/exams/results'),
  getQuizzes: () => apiFetch<any[]>('/exams/quizzes'),
  getQuizDetails: (id: string) => apiFetch<any>(`/exams/quizzes/${id}`),
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

// ---------- Timetable API ----------
export const timetableApi = {
  list: () => apiFetch<any[]>('/timetable/'),
};

// ---------- Finance API ----------
export const financeApi = {
  getLedger: () => apiFetch<any[]>('/finance/ledger'),
  getFees: () => apiFetch<any[]>('/finance/fees'),
  makePayment: (data: any) => apiFetch<any>('/finance/payments', { method: 'POST', body: JSON.stringify(data) }),
  getOutstanding: () => apiFetch<any>('/finance/outstanding'),
};

// ---------- Placement API ----------
export const placementApi = {
  getStats: () => apiFetch<any>('/placements/stats'),
  getDrives: () => apiFetch<any[]>('/placements/drives'),
  apply: (driveId: string) => apiFetch<any>(`/placements/drives/${driveId}/apply`, { method: 'POST' }),
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
    })
};


// ---------- Library API ----------
export const libraryApi = {
  getBooks: () => apiFetch<any[]>('/library/'),
  issueBook: (bookId: string) => apiFetch<any>(`/library/issue/${bookId}`, { method: 'POST' }),
  returnBook: (bookId: string) => apiFetch<any>(`/library/return/${bookId}`, { method: 'POST' }),
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
};
