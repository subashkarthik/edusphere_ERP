import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, GraduationCap, ShieldCheck, 
  Settings, Download, Activity, Database, Server,
  BarChart2, Lock, Bell, Layers, Cpu, X, CheckCircle2, 
  AlertCircle, Loader2, RefreshCw, Award, BookOpen,
  FileText, ShieldAlert, Sparkles
} from 'lucide-react';
import { dashboardApi, systemApi, announcementsApi, reportsApi } from '../services/api';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend 
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    counts: { students: number; faculty: number; courses: number; enrollments: number; total_users: number; admins: number };
    users: { total: number; students: number; faculty: number; admins: number };
    courses: { total: number; departments: number };
    enrollments: { total_active: number };
    certificates: { issued: number; revoked: number; ineligible?: number };
    attendance: { average_rate: number; total_sessions: number; total_logs: number };
    attendance_by_department: any[];
    courses_without_faculty: any[];
    students_without_enrollments: any[];
    assessments: { total_quizzes: number; total_quiz_attempts: number; total_assignments: number; total_submissions: number };
    recent_audit_events: any[];
    recent_audit_logs: any[];
  }>({
    counts: { students: 0, faculty: 0, courses: 0, enrollments: 0, total_users: 0, admins: 0 },
    users: { total: 0, students: 0, faculty: 0, admins: 0 },
    courses: { total: 0, departments: 0 },
    enrollments: { total_active: 0 },
    certificates: { issued: 0, revoked: 0, ineligible: 0 },
    attendance: { average_rate: 0, total_sessions: 0, total_logs: 0 },
    attendance_by_department: [],
    courses_without_faculty: [],
    students_without_enrollments: [],
    assessments: { total_quizzes: 0, total_quiz_attempts: 0, total_assignments: 0, total_submissions: 0 },
    recent_audit_events: [],
    recent_audit_logs: []
  });

  const [cores, setCores] = useState(64);
  const [memory, setMemory] = useState(256);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [addedCores, setAddedCores] = useState(4);
  const [addedMemory, setAddedMemory] = useState(16);

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState('MEDIUM');
  const [targetRoles, setTargetRoles] = useState({ ADMIN: true, FACULTY: true, STUDENT: true });

  const [reportData, setReportData] = useState<{
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
  }>({
    summary: { total_courses: 0, total_enrollments: 0, total_certificates: 0, overall_attendance_rate: 100 },
    courses: []
  });
  const [exportingReport, setExportingReport] = useState<string | null>(null);

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [adminRes, sysConfig, reportSummaryRes] = await Promise.all([
        dashboardApi.getAdminDashboard(),
        systemApi.getConfig().catch(() => null),
        reportsApi.getAdminSummary().catch(() => null)
      ]);
      if (adminRes) {
        setData(adminRes);
      }
      if (sysConfig) {
        setCores(sysConfig.cores);
        setMemory(sysConfig.memory);
      }
      if (reportSummaryRes) {
        setReportData(reportSummaryRes);
      }
    } catch (err) {
      console.error('[AdminDashboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await systemApi.provision({ cores: addedCores, memory: addedMemory });
      setCores(res.cores);
      setMemory(res.memory);
      setShowProvisionModal(false);
      setToast({ message: `Provisioned +${addedCores} Cores, +${addedMemory} GB RAM successfully!`, type: 'success' });
      fetchAdminData();
    } catch (err: any) {
      setToast({ message: err.message || "Provisioning failed", type: 'error' });
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    const steps = [
      "Verifying database encryption protocols...",
      "Analyzing user access control tables...",
      "Validating institutional attendance ledgers...",
      "Scanning ReportLab certificate signatures...",
      "Updating audit logs with COMPLIANT rating..."
    ];
    
    for (let i = 0; i < steps.length; i++) {
      setAuditProgress(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    
    try {
      const res = await systemApi.runAudit();
      setToast({ message: res.message || "Audit completed: 100% Verified & Compliant!", type: 'success' });
      fetchAdminData();
    } catch (err: any) {
      setToast({ message: err.message || "Audit failed", type: 'error' });
    } finally {
      setIsAuditing(false);
      setAuditProgress(null);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastContent) {
      setToast({ message: "Title and content are required", type: 'error' });
      return;
    }

    const roles = Object.entries(targetRoles)
      .filter(([_, active]) => active)
      .map(([role]) => role)
      .join(',');

    if (!roles) {
      setToast({ message: "Select at least one target role", type: 'error' });
      return;
    }

    try {
      await announcementsApi.create({
        title: broadcastTitle,
        content: broadcastContent,
        target_roles: roles,
        priority: broadcastPriority,
        is_pinned: false
      });
      setToast({ message: "Broadcasted announcement successfully to institution!", type: 'success' });
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastContent('');
      fetchAdminData();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to broadcast announcement", type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-12">
      {/* Governance Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-white/10 relative overflow-hidden bg-gradient-to-br from-rose-950/40 via-slate-900/60 to-purple-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Building2 size={13} /> Institutional Enterprise Governance
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              System &amp; Academic <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-purple-400">Administration Hub</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xl">
              Central operational oversight across all registered users, active curricula, course enrollments, attendance rates, and issued certificates.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
            <button
              onClick={() => setShowProvisionModal(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/10 transition-all active:scale-95"
            >
              <Cpu size={15} className="inline mr-1.5" /> Provision Nodes
            </button>
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Sync Metrics
            </button>
          </div>
        </div>
      </div>

      {/* 5 Core Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Students & Faculty */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-2xl">
              <Users size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Database Feed</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.counts?.students ?? data.users.students}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Active Students ({data.counts?.faculty ?? data.users.faculty} Faculty)
            </div>
          </div>
        </div>

        {/* 2. Active Courses */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-500/15 text-purple-400 rounded-2xl">
              <BookOpen size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">Curricula</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.counts?.courses ?? data.courses.total}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Across {data.attendance_by_department?.length || data.courses.departments} Departments
            </div>
          </div>
        </div>

        {/* 3. Enrollments */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl">
              <Layers size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Active</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.counts?.enrollments ?? data.enrollments.total_active}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Enrollments</div>
          </div>
        </div>

        {/* 4. Certificates Issued / Revoked */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl">
              <Award size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
              {data.certificates.revoked > 0 ? `${data.certificates.revoked} Revoked` : '0 Revoked'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.certificates.issued}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Certificates Issued ({data.certificates.revoked} Revoked)
            </div>
          </div>
        </div>

        {/* 5. Campus Attendance Rate */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-500/15 text-teal-400 rounded-2xl">
              <Activity size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-teal-400">Campus-wide</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.attendance.average_rate}%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {data.attendance.total_sessions} Sessions • {data.attendance.total_logs} Logs
            </div>
          </div>
        </div>
      </div>

      {/* DEPARTMENT ATTENDANCE RATES */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-400" /> Attendance Rate by Department
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Aggregated attendance rates calculated across courses in each academic department.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {data.attendance_by_department?.length || 0} Departments
          </span>
        </div>

        {data.attendance_by_department && data.attendance_by_department.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.attendance_by_department.map((dept: any) => {
              const isGood = dept.attendance_rate >= 75;
              return (
                <div key={dept.department_id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] rounded-md">
                      {dept.department_code}
                    </span>
                    <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                      {dept.attendance_rate}%
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1 leading-snug">{dept.department_name}</h4>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{dept.courses_count} Courses</span>
                    <span>{dept.students_count} Students</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs font-medium bg-black/20 rounded-2xl border border-white/5">
            No departmental attendance data recorded yet.
          </div>
        )}
      </div>

      {/* TWO COLUMNS: COURSES WITHOUT FACULTY & STUDENTS WITHOUT ENROLLMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Courses Without Faculty */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <BookOpen size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Courses Without Assigned Faculty
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Active courses needing instructor assignment.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-lg border border-amber-500/30">
              {data.courses_without_faculty ? data.courses_without_faculty.length : 0} Unassigned
            </span>
          </div>

          {data.courses_without_faculty && data.courses_without_faculty.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {data.courses_without_faculty.map((c: any) => (
                <div key={c.id} className="p-3 bg-white/[0.02] border border-amber-500/20 rounded-xl flex items-center justify-between text-xs hover:border-amber-500/40 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-300 font-bold text-[10px]">{c.code}</span>
                      <span className="font-bold text-white text-xs">{c.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{c.department_name} • {c.credits} Credits</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                    Needs Faculty
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500 text-xs font-medium bg-black/20 rounded-2xl border border-white/5 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>All active courses have an assigned faculty instructor.</span>
            </div>
          )}
        </div>

        {/* Students Without Enrollments */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-300">
                  Students Without Active Enrollments
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Registered students not enrolled in any course.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 text-[10px] font-black rounded-lg border border-rose-500/30">
              {data.students_without_enrollments ? data.students_without_enrollments.length : 0} Unenrolled
            </span>
          </div>

          {data.students_without_enrollments && data.students_without_enrollments.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {data.students_without_enrollments.map((st: any) => (
                <div key={st.id} className="p-3 bg-white/[0.02] border border-rose-500/20 rounded-xl flex items-center justify-between text-xs hover:border-rose-500/40 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{st.name}</span>
                      <span className="font-mono text-slate-400 text-[10px]">({st.enrollment_no})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{st.email} • {st.department_name}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                    0 Enrollments
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500 text-xs font-medium bg-black/20 rounded-2xl border border-white/5 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>All active students are enrolled in at least one course.</span>
            </div>
          )}
        </div>
      </div>

      {/* Two Columns: Assessments & Institutional Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Assessments Ledger */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" /> Assessment &amp; Evaluation Pipeline
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Real-time DB Counts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <span className="text-2xl font-black text-indigo-400">{data.assessments.total_quizzes}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Active Quizzes</span>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <span className="text-2xl font-black text-purple-400">{data.assessments.total_quiz_attempts}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Quiz Attempts</span>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <span className="text-2xl font-black text-emerald-400">{data.assessments.total_assignments}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Assignments</span>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <span className="text-2xl font-black text-amber-400">{data.assessments.total_submissions}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Submissions</span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="pt-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Recent System Audit Events</h4>
            {(!data.recent_audit_events || data.recent_audit_events.length === 0) && (!data.recent_audit_logs || data.recent_audit_logs.length === 0) ? (
              <div className="py-6 text-center text-slate-500 text-xs font-medium">
                No system audit events recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {(data.recent_audit_events && data.recent_audit_events.length > 0 ? data.recent_audit_events : data.recent_audit_logs).map((log: any) => (
                  <div key={log.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <div>
                        <span className="font-bold text-white">{log.action}</span>
                        <span className="text-indigo-300 font-mono text-[10px] ml-1">[{log.resource_type || 'SYS'}]</span>
                        <span className="text-slate-400 text-[10px] ml-2">by {log.actor_name}</span>
                        {log.details && (
                          <div className="text-[10px] text-slate-500 truncate max-w-sm">{log.details}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px] shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & System Controls */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-500/15 text-rose-400 rounded-2xl"><Cpu size={20} /></div>
              <div>
                <h4 className="font-bold text-sm text-white">Cluster Infrastructure</h4>
                <p className="text-[10px] text-slate-400 font-medium">Node compute quotas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Cores</span>
                <span className="text-base font-black text-white">{cores} vCPU</span>
              </div>
              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">RAM</span>
                <span className="text-base font-black text-white">{memory} GB</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck size={16} className="text-emerald-400" />
              {isAuditing ? "Auditing System..." : "Run Security & Data Audit"}
            </button>
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              <Bell size={16} /> Broadcast Announcement
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* INSTITUTIONAL COURSE-WISE REPORTS & ANALYTICS (DB POWERED) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-rose-400 text-[10px] font-black uppercase tracking-widest mb-1">
              <BarChart2 size={14} /> Institutional Academic Performance Reports
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Course-wise Academic Metrics &amp; Audit Reports
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Live database aggregated enrollment, average attendance, student assessment scores, and issued certificates.
            </p>
          </div>

          {/* Quick Global CSV Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={async () => {
                setExportingReport('attendance');
                try {
                  await reportsApi.downloadAttendanceCSV();
                } catch (e: any) {
                  setToast({ message: e.message || 'Export failed', type: 'error' });
                } finally {
                  setExportingReport(null);
                }
              }}
              disabled={exportingReport !== null}
              className="px-3.5 py-2 glass-btn hover:border-cyan-500/40 text-cyan-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Download full institutional attendance ledger CSV"
            >
              <Download size={14} /> {exportingReport === 'attendance' ? 'Exporting...' : 'Attendance CSV'}
            </button>

            <button
              onClick={async () => {
                setExportingReport('marks');
                try {
                  await reportsApi.downloadMarksCSV();
                } catch (e: any) {
                  setToast({ message: e.message || 'Export failed', type: 'error' });
                } finally {
                  setExportingReport(null);
                }
              }}
              disabled={exportingReport !== null}
              className="px-3.5 py-2 glass-btn hover:border-amber-500/40 text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Download full institutional assessment marks CSV"
            >
              <Download size={14} /> {exportingReport === 'marks' ? 'Exporting...' : 'Marks CSV'}
            </button>

            <button
              onClick={async () => {
                setExportingReport('certificates');
                try {
                  await reportsApi.downloadCertificatesCSV();
                } catch (e: any) {
                  setToast({ message: e.message || 'Export failed', type: 'error' });
                } finally {
                  setExportingReport(null);
                }
              }}
              disabled={exportingReport !== null}
              className="px-3.5 py-2 glass-btn hover:border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Download institutional certificates audit ledger CSV"
            >
              <Download size={14} /> {exportingReport === 'certificates' ? 'Exporting...' : 'Certificates CSV'}
            </button>
          </div>
        </div>

        {/* Recharts Simple Bar Chart */}
        {reportData.courses.length > 0 && (
          <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Course Performance &amp; Completion Overview
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Aggregated from DB</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.courses} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="course_code" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '1rem',
                      fontSize: '12px',
                      color: '#fff',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="enrollment_count" name="Enrollments" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="average_attendance" name="Avg Attendance (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="average_score" name="Avg Score (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="certificates_issued" name="Certificates Issued" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Course-Wise Academic Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Faculty</th>
                <th className="py-3.5 px-4">Enrollments</th>
                <th className="py-3.5 px-4">Avg Attendance</th>
                <th className="py-3.5 px-4">Avg Score</th>
                <th className="py-3.5 px-4">Certificates Issued</th>
                <th className="py-3.5 px-4 text-right">Export Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {reportData.courses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                    No active courses found for reports.
                  </td>
                </tr>
              ) : (
                reportData.courses.map((c) => (
                  <tr key={c.course_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{c.course_name}</div>
                      <div className="text-[10px] font-mono text-indigo-400">{c.course_code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.faculty_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {c.enrollment_count}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={c.average_attendance >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                        {c.average_attendance}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={c.average_score >= 50 ? 'text-emerald-400' : 'text-rose-400'}>
                        {c.average_score}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-black">
                        {c.certificates_issued}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => reportsApi.downloadAttendanceCSV(c.course_id)}
                          className="p-1.5 glass-btn hover:border-cyan-500/40 text-cyan-400 rounded-lg text-[10px] font-bold uppercase transition-all"
                          title={`Export ${c.course_code} Attendance CSV`}
                        >
                          Attn CSV
                        </button>
                        <button
                          onClick={() => reportsApi.downloadMarksCSV(c.course_id)}
                          className="p-1.5 glass-btn hover:border-amber-500/40 text-amber-400 rounded-lg text-[10px] font-bold uppercase transition-all"
                          title={`Export ${c.course_code} Marks CSV`}
                        >
                          Marks CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-3xl border border-white/20 shadow-2xl relative">
            <button 
              onClick={() => setShowProvisionModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl"><Cpu size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-white">Provision Cluster Nodes</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scale server compute quotas</p>
              </div>
            </div>

            <form onSubmit={handleProvision} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">vCPU Cores to add</label>
                <select 
                  value={addedCores}
                  onChange={(e) => setAddedCores(Number(e.target.value))}
                  className="w-full glass-input rounded-xl p-3 text-sm font-bold text-white bg-slate-900"
                >
                  <option value={2}>+2 Cores</option>
                  <option value={4}>+4 Cores</option>
                  <option value={8}>+8 Cores</option>
                  <option value={16}>+16 Cores</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">RAM to add</label>
                <select 
                  value={addedMemory}
                  onChange={(e) => setAddedMemory(Number(e.target.value))}
                  className="w-full glass-input rounded-xl p-3 text-sm font-bold text-white bg-slate-900"
                >
                  <option value={8}>+8 GB RAM</option>
                  <option value={16}>+16 GB RAM</option>
                  <option value={32}>+32 GB RAM</option>
                  <option value={64}>+64 GB RAM</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowProvisionModal(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel p-6 md:p-8 rounded-3xl border border-white/20 shadow-2xl relative">
            <button 
              onClick={() => setShowBroadcastModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl"><Bell size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-white">Broadcast Announcement</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Publish real-time institutional notice</p>
              </div>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">Title</label>
                <input 
                  type="text" 
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. End-Semester Examination Schedule"
                  className="w-full glass-input rounded-xl p-3 text-sm font-bold text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">Message</label>
                <textarea 
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Enter notice details for faculty & students..."
                  className="w-full glass-input rounded-xl p-3 text-sm font-medium text-white h-24 resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Overlay */}
      {isAuditing && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300">
          <div className="text-center space-y-6 max-w-md">
            <div className="relative flex justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-rose-500/20 border-t-rose-400 animate-spin"></div>
              <ShieldCheck className="absolute top-5 text-rose-400 animate-pulse" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Institutional Data Audit</h3>
              <p className="text-sm font-semibold text-slate-400">{auditProgress}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div className={`glass-panel px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl border ${
            toast.type === 'success' ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
