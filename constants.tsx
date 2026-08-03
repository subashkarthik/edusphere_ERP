import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Users, 
  CreditCard, 
  GraduationCap, 
  FileText, 
  Briefcase, 
  Settings, 
  HelpCircle,
  Building2,
  Bus,
  Library,
  Megaphone,
  UserPlus,
  ShieldCheck,
  History,
  Archive,
  Sparkles,
  Award,
  Compass,
  Cpu,
  Layers,
  Network,
  Activity,
  Globe,
  DollarSign,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  FileCheck2,
  Clock
} from 'lucide-react';
import { 
  UserRole, NavItem, TimetableEntry, AttendanceRecord, PlacementStats, 
  EcosystemModule, ExecutiveKPI, PlacementDrive, ResearchGrant, AuditTrailEntry 
} from './types';

export const ROLE_THEMES = {
  [UserRole.STUDENT]: {
    bg: 'bg-indigo-900',
    primary: 'bg-indigo-600',
    text: 'text-indigo-600',
    accent: 'bg-teal-500',
    accentText: 'text-teal-400',
    hover: 'hover:bg-indigo-800',
    light: 'bg-indigo-50',
    border: 'border-indigo-100',
    gradient: 'from-indigo-600 to-violet-600'
  },
  [UserRole.FACULTY]: {
    bg: 'bg-emerald-950',
    primary: 'bg-emerald-700',
    text: 'text-emerald-700',
    accent: 'bg-lime-500',
    accentText: 'text-lime-400',
    hover: 'hover:bg-emerald-900',
    light: 'bg-emerald-50',
    border: 'border-emerald-100',
    gradient: 'from-emerald-700 to-teal-700'
  },
  [UserRole.ADMIN]: {
    bg: 'bg-slate-950',
    primary: 'bg-rose-800',
    text: 'text-rose-800',
    accent: 'bg-amber-500',
    accentText: 'text-amber-400',
    hover: 'hover:bg-slate-900',
    light: 'bg-rose-50',
    border: 'border-rose-100',
    gradient: 'from-rose-800 to-orange-800'
  }
};

export const NAVIGATION_ITEMS: NavItem[] = [
  // OPERATIONAL WORKSPACES
  { id: 'dashboard', label: 'Operational Workspace', icon: 'LayoutDashboard', roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], category: 'core' },
  { id: 'journey', label: 'Student Journey', icon: 'Sparkles', roles: [UserRole.STUDENT], category: 'learning' },
  { id: 'cms', label: 'Faculty Operations', icon: 'BookOpen', roles: [UserRole.FACULTY, UserRole.ADMIN], category: 'academic' },
  { id: 'ecosystem', label: 'Ecosystem Modules', icon: 'Layers', roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], category: 'ecosystem' },

  // ACADEMIC OPERATIONS
  { id: 'academics', label: 'Curriculum & Courses', icon: 'BookOpen', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'academic' },
  { id: 'timetable', label: 'Class Schedule', icon: 'Calendar', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'academic' },
  { id: 'attendance', label: 'Attendance Intelligence', icon: 'Activity', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'records' },
  { id: 'exams', label: 'Assessments & GPA', icon: 'FileText', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'records' },
  { id: 'assignments', label: 'Assignment Pipeline', icon: 'FileCheck2', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'records' },
  { id: 'voice_viva', label: 'AI Voice Viva Examiner', icon: 'Sparkles', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'records' },
  { id: 'virtual_lab', label: '3D STEM Virtual Lab', icon: 'Cpu', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'academic' },
  { id: 'skill_quest', label: 'RPG Skill Quest & Arena', icon: 'Award', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'learning' },
  { id: 'degree_audit', label: 'Degree Audit & Graduation', icon: 'GraduationCap', roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], category: 'records' },
  { id: 'certificates', label: 'Certifications & Degrees', icon: 'Award', roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], category: 'records' },


  // RESOURCES & AUXILIARY
  { id: 'library', label: 'Digital Asset Vault', icon: 'Library', roles: [UserRole.STUDENT, UserRole.FACULTY], category: 'resources' },
  { id: 'announcements', label: 'Notice Broadcast', icon: 'Megaphone', roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], category: 'resources' },

  // ADMINISTRATIVE CONTROL
  { id: 'users', label: 'Faculty & Student Registry', icon: 'Users', roles: [UserRole.ADMIN, UserRole.FACULTY], category: 'admin' },
  { id: 'system', label: 'System Infrastructure', icon: 'Cpu', roles: [UserRole.ADMIN], category: 'admin' },
  { id: 'audit', label: 'Audit & Compliance Logs', icon: 'Network', roles: [UserRole.ADMIN], category: 'admin' },
  { id: 'settings', label: 'System Preferences', icon: 'Settings', roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], category: 'system' },
];

export const ECOSYSTEM_MODULES: EcosystemModule[] = [
  {
    id: 'admissions',
    name: 'Admissions & Enrollment',
    code: 'ADM-200',
    category: 'student_lifecycle',
    icon: 'UserPlus',
    status: 'ACTIVE',
    description: 'Applicant pipeline, document verification, quota allocation, automated merit lists.',
    metricsSummary: '14,250 Applicants | 88% Conversion Rate',
    kpi: '14,250',
    kpiLabel: 'Active Applicants'
  },
  {
    id: 'academics_core',
    name: 'Academic Operations',
    code: 'ACA-100',
    category: 'academic_excellence',
    icon: 'BookOpen',
    status: 'REALTIME',
    description: 'Outcome-based education, syllabus state machine, credit transfers, prerequisite tracking.',
    metricsSummary: '342 Active Courses | 98.2% Syllabus Approval',
    kpi: '342',
    kpiLabel: 'Approved Courses'
  },
  {
    id: 'lms_studio',
    name: 'Learning Management (LMS)',
    code: 'LMS-300',
    category: 'academic_excellence',
    icon: 'Sparkles',
    status: 'REALTIME',
    description: 'Interactive course studio, discussion streams, AI study velocity, video lectures.',
    metricsSummary: '4,890 Daily Active Learners | 94% Engagement',
    kpi: '94%',
    kpiLabel: 'Daily Engagement'
  },
  {
    id: 'examination',
    name: 'Examination & Evaluation',
    code: 'EXM-400',
    category: 'academic_excellence',
    icon: 'FileText',
    status: 'ACTIVE',
    description: 'Question bank generator, hall tickets, rubric-based evaluation, SGPA/CGPA engine.',
    metricsSummary: '12,400 Transcripts Generated | 3.52 Avg CGPA',
    kpi: '3.52',
    kpiLabel: 'University CGPA'
  },
  {
    id: 'library_vault',
    name: 'Digital Library & Research Vault',
    code: 'LIB-500',
    category: 'academic_excellence',
    icon: 'Library',
    status: 'DEPLOYED',
    description: 'IEEE/Scopus database access, e-book reservations, RFID checkouts, plagiarism scan tokens.',
    metricsSummary: '150,000+ Digital Titles | 1,200 Active Borrows',
    kpi: '150k+',
    kpiLabel: 'Indexed Journals'
  },
  {
    id: 'research_hub',
    name: 'Research & Grant Operations',
    code: 'RES-600',
    category: 'academic_excellence',
    icon: 'FolderGit2',
    status: 'ENTERPRISE',
    description: 'Grant management, DST/SERB funding tracker, patent filings, co-authorship registry.',
    metricsSummary: '₹14.8 Cr Active Grants | 312 Publications',
    kpi: '₹14.8 Cr',
    kpiLabel: 'Research Funding'
  },
  {
    id: 'innovation_center',
    name: 'Incubation & Startup Hub',
    code: 'INC-700',
    category: 'student_lifecycle',
    icon: 'Cpu',
    status: 'ENTERPRISE',
    description: 'Student startup incubation, seed funding workflow, IP protection, mentor network.',
    metricsSummary: '42 Incubated Startups | ₹3.2 Cr Raised',
    kpi: '42',
    kpiLabel: 'Incubated Startups'
  },
  {
    id: 'hostel_housing',
    name: 'Hostel & Residential Housing',
    code: 'HOS-800',
    category: 'auxiliary_services',
    icon: 'Building2',
    status: 'DEPLOYED',
    description: 'Room allocation, mess attendance, maintenance ticketing, gate pass authorization.',
    metricsSummary: '3,200 Resident Students | 96% Occupancy',
    kpi: '96%',
    kpiLabel: 'Occupancy Rate'
  },
  {
    id: 'transit_fleet',
    name: 'Fleet & Transit Logistics',
    code: 'TRN-900',
    category: 'auxiliary_services',
    icon: 'Bus',
    status: 'REALTIME',
    description: 'GPS bus tracking, route optimization, driver rosters, digital pass validation.',
    metricsSummary: '48 Active Routes | Live GPS Enabled',
    kpi: '48',
    kpiLabel: 'Managed Routes'
  },
  {
    id: 'placement_cell',
    name: 'Placement & Corporate Relations',
    code: 'PLC-1000',
    category: 'student_lifecycle',
    icon: 'Briefcase',
    status: 'ENTERPRISE',
    description: 'Recruiter portal, interview scheduling, CTC analytics, skill-match AI engine.',
    metricsSummary: '94.2% Placement Rate | ₹8.5 LPA Avg CTC',
    kpi: '₹42 LPA',
    kpiLabel: 'Highest CTC Package'
  },
  {
    id: 'finance_bursar',
    name: 'Finance & Fee Operations',
    code: 'FIN-1100',
    category: 'core_operations',
    icon: 'DollarSign',
    status: 'ENTERPRISE',
    description: 'Fee collection gateways, ledger reconciliation, payroll, scholarship disbursement.',
    metricsSummary: '₹48.2 Cr Collected | 99.1% Clearance',
    kpi: '99.1%',
    kpiLabel: 'Fee Clearance'
  },
  {
    id: 'hr_faculty_affairs',
    name: 'HR & Faculty Affairs',
    code: 'HRM-1200',
    category: 'core_operations',
    icon: 'Users',
    status: 'ENTERPRISE',
    description: 'Faculty workload monitoring, promotion tracking, leave management, appraisal scoring.',
    metricsSummary: '420 Faculty Members | 1:14 Faculty-Student',
    kpi: '1:14',
    kpiLabel: 'Faculty-Student Ratio'
  },
  {
    id: 'campus_life',
    name: 'Campus Events & Cultural Life',
    code: 'EVT-1300',
    category: 'auxiliary_services',
    icon: 'Compass',
    status: 'ACTIVE',
    description: 'Inter-college symposiums, club registrations, auditorium booking, budget approvals.',
    metricsSummary: '68 Campus Clubs | 12 Upcoming Fests',
    kpi: '68',
    kpiLabel: 'Active Clubs'
  },
  {
    id: 'alumni_network',
    name: 'Alumni Network & Endowments',
    code: 'ALU-1400',
    category: 'student_lifecycle',
    icon: 'Award',
    status: 'ENTERPRISE',
    description: 'Alumni directory, mentorship pairing, endowment funds, annual reunion management.',
    metricsSummary: '24,000+ Alumni | ₹5.4 Cr Endowment',
    kpi: '24,000+',
    kpiLabel: 'Global Alumni'
  },
  {
    id: 'ai_copilot',
    name: 'AI Institutional Copilot',
    code: 'AIC-1500',
    category: 'core_operations',
    icon: 'Sparkles',
    status: 'REALTIME',
    description: 'Gemini 3 Flash powered contextual tutor, administrative automation, predictive alerts.',
    metricsSummary: '98,400 Queries Handled | Sub-Second Latency',
    kpi: '99.4%',
    kpiLabel: 'Resolution Accuracy'
  },
  {
    id: 'institutional_analytics',
    name: 'Executive Analytics & BI',
    code: 'ANL-1600',
    category: 'core_operations',
    icon: 'Globe',
    status: 'ENTERPRISE',
    description: 'NAAC/NBA/ABET compliance dashboard, multi-campus benchmarking, executive decision engine.',
    metricsSummary: 'A++ NAAC Accreditation Score | 98.4 Health',
    kpi: 'A++',
    kpiLabel: 'NAAC Accreditation'
  }
];

export const EXECUTIVE_KPIS: ExecutiveKPI[] = [
  {
    label: 'Institutional Health Index',
    value: '98.4%',
    change: '+1.8% vs Q2',
    trend: 'up',
    description: 'Composite score evaluating academic delivery, financial stability, and system uptime.',
    category: 'health'
  },
  {
    label: 'Total Active Enrolled Students',
    value: '5,840',
    change: '+340 YoY',
    trend: 'up',
    description: 'Active undergraduate, postgraduate, and doctoral degree candidates across 3 campuses.',
    category: 'health'
  },
  {
    label: 'Tuition & Fee Realization',
    value: '₹48.2 Cr',
    change: '99.1% Collection',
    trend: 'up',
    description: 'YTD tuition fee collection against target budget with zero overdue audit flags.',
    category: 'finance'
  },
  {
    label: 'NAAC / NBA Accreditation Index',
    value: '3.78 / 4.0',
    change: 'A++ Grade',
    trend: 'neutral',
    description: 'Audit compliance score meeting top-tier national and international university standards.',
    category: 'compliance'
  }
];

export const RECENT_PLACEMENT_DRIVES: PlacementDrive[] = [
  {
    id: 'p1',
    company: 'Google Cloud Platform',
    logo: 'https://ui-avatars.com/api/?name=Google&background=4285F4&color=fff',
    role: 'Cloud Systems Engineer',
    ctc: '₹28.5 LPA',
    eligibilityCgpa: 8.5,
    status: 'INTERVIEWING',
    applicantsCount: 142,
    deadline: '2026-08-05'
  },
  {
    id: 'p2',
    company: 'Microsoft Azure',
    logo: 'https://ui-avatars.com/api/?name=Microsoft&background=0078D4&color=fff',
    role: 'Software Development Engineer',
    ctc: '₹32.0 LPA',
    eligibilityCgpa: 8.8,
    status: 'OPEN',
    applicantsCount: 210,
    deadline: '2026-08-12'
  },
  {
    id: 'p3',
    company: 'Amazon Web Services',
    logo: 'https://ui-avatars.com/api/?name=Amazon&background=FF9900&color=fff',
    role: 'Solutions Architect Trainee',
    ctc: '₹24.0 LPA',
    eligibilityCgpa: 8.0,
    status: 'OPEN',
    applicantsCount: 185,
    deadline: '2026-08-15'
  }
];

export const RESEARCH_GRANTS: ResearchGrant[] = [
  {
    id: 'rg1',
    title: 'Quantum Computing Fault-Tolerant Architectures',
    principalInvestigator: 'Dr. Arun Kumar',
    agency: 'DST-SERB High Value Grant',
    amount: '₹1.85 Cr',
    status: 'APPROVED',
    department: 'Computer Science & Engineering'
  },
  {
    id: 'rg2',
    title: 'Autonomous Urban Logistics & Drone Swarms',
    principalInvestigator: 'Dr. P. Raj',
    agency: 'ISRO Research Initiative',
    amount: '₹95.0 Lakhs',
    status: 'IN_REVIEW',
    department: 'Robotics & Automation'
  }
];

export const RECENT_AUDIT_LOGS: AuditTrailEntry[] = [
  {
    id: 'log-101',
    timestamp: '2 mins ago',
    actor: 'Dr. Arun Kumar',
    role: 'FACULTY',
    action: 'APPROVED_SYLLABUS_MODULE',
    resource: 'CS8704 Machine Learning',
    ipAddress: '192.168.1.42',
    severity: 'INFO'
  },
  {
    id: 'log-102',
    timestamp: '14 mins ago',
    actor: 'System Registrar',
    role: 'ADMIN',
    action: 'RECONCILED_FINANCE_LEDGER',
    resource: 'Fee Batch #8420',
    ipAddress: '10.0.4.12',
    severity: 'INFO'
  },
  {
    id: 'log-103',
    timestamp: '1 hour ago',
    actor: 'Alex Johnson',
    role: 'STUDENT',
    action: 'SUBMITTED_ASSIGNMENT',
    resource: 'CS8701 Cloud Computing Lab 4',
    ipAddress: '172.16.8.99',
    severity: 'INFO'
  }
];

export const ICON_MAP: Record<string, any> = {
  LayoutDashboard, BookOpen, Calendar, Users, CreditCard, GraduationCap, FileText, Briefcase, Settings, HelpCircle, Building2, Bus, Library, Megaphone, UserPlus, ShieldCheck, History, Archive, Sparkles, Award, Compass, Cpu, Layers, Network, Activity, Globe, DollarSign, UserCheck, CheckCircle2, AlertTriangle, FolderGit2, FileCheck2, Clock
};

export const MOCK_TIMETABLE: TimetableEntry[] = [
  { day: 'Monday', time: '09:00 - 10:00', course: 'Ethical Hacking (CYB-101)', venue: 'LH-302 (Cybersecurity Lab)', faculty: 'Dr. Arun Kumar', roomType: 'Specialized Lab' },
  { day: 'Monday', time: '10:15 - 11:15', course: 'Python Programming (PRG-201)', venue: 'Lab-1 (Software Complex)', faculty: 'Prof. S. Devi', roomType: 'High-Performance Lab' },
  { day: 'Tuesday', time: '09:00 - 11:00', course: 'SQL Database Engineering (PRG-205)', venue: 'Lab-4 (Data Center)', faculty: 'Dr. P. Raj', roomType: 'Specialized Lab' },
  { day: 'Wednesday', time: '11:30 - 12:30', course: 'Network Security (CYB-102)', venue: 'LH-101 (Main Building)', faculty: 'Mrs. K. Priya', roomType: 'Smart Classroom' },
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { courseCode: 'CYB101', courseName: 'Ethical Hacking & AI', percentage: 94, classesHeld: 45, classesAttended: 42, status: 'SAFE' },
  { courseCode: 'PRG201', courseName: 'Python Programming', percentage: 88, classesHeld: 40, classesAttended: 35, status: 'SAFE' },
  { courseCode: 'PRG205', courseName: 'SQL Database Engineering', percentage: 92, classesHeld: 38, classesAttended: 35, status: 'SAFE' },
  { courseCode: 'SFT301', courseName: 'Communication & Soft Skills', percentage: 95, classesHeld: 42, classesAttended: 40, status: 'SAFE' },
];


export const PLACEMENT_STATS: PlacementStats[] = [
  { year: '2023', placed: 512, total: 560, avgLPA: 7.1, highestLPA: 28.0 },
  { year: '2024', placed: 545, total: 600, avgLPA: 8.5, highestLPA: 36.0 },
  { year: '2025', placed: 580, total: 620, avgLPA: 9.8, highestLPA: 42.0 },
];

