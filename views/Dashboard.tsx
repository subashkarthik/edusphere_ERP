import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Activity, Award, BrainCircuit, CheckCircle2, 
  Clock, AlertTriangle, Download, ExternalLink, RefreshCw,
  FileCheck2, ShieldCheck, Sparkles, ChevronRight, Lock, ArrowUpRight
} from 'lucide-react';
import { UserRole } from '../types';
import { dashboardApi, getAccessToken } from '../services/api';
import GlassCard from '../components/GlassCard';
import FacultyDashboard from './FacultyDashboard';
import AdminDashboard from './AdminDashboard';

interface DashboardProps {
  role: UserRole;
}

const StudentIntelligenceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    enrolled_courses_count: number;
    overall_attendance_pct: number | null;
    average_assessment_score: number | null;
    certificates_earned_count: number;
    courses: any[];
    at_risk_courses: any[];
    upcoming_quizzes: any[];
    upcoming_assignments: any[];
    earned_certificates: any[];
  }>({
    enrolled_courses_count: 0,
    overall_attendance_pct: null,
    average_assessment_score: null,
    certificates_earned_count: 0,
    courses: [],
    at_risk_courses: [],
    upcoming_quizzes: [],
    upcoming_assignments: [],
    earned_certificates: []
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getStudentDashboard();
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('[StudentDashboard] Error fetching real metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDownloadCert = async (certCode: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/certificates/download-pdf/${certCode}.pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download certificate PDF');
    }
  };

  const hasSessions = data.overall_attendance_pct !== null && data.overall_attendance_pct !== undefined;
  const isAttendanceGood = hasSessions && data.overall_attendance_pct! >= 75;
  const hasAssessments = data.average_assessment_score !== null && data.average_assessment_score !== undefined;
  const isAssessmentGood = hasAssessments && data.average_assessment_score! >= 50;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-12">
      {/* Welcome & System Status Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-white/10 relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={13} /> Live Student Intelligence &amp; Academic Feed
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Student Academic <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">Command Dashboard</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xl">
              Real-time synchronization across your course enrollments, attendance ledgers, quiz evaluations, and institutional certificates.
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 self-start md:self-auto"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Feed
          </button>
        </div>
      </div>

      {/* "At Risk" Warning Banner when any course attendance < policy minimum */}
      {data.at_risk_courses && data.at_risk_courses.length > 0 && (
        <div className="p-6 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 shadow-xl shadow-rose-950/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Academic Attendance Warning: <span className="text-rose-400">{data.at_risk_courses.length} Course{data.at_risk_courses.length !== 1 ? 's' : ''} Below Minimum Threshold</span>
              </h2>
              <p className="text-xs text-rose-200/80 font-medium mt-0.5">
                Institutional policy requires minimum attendance to remain eligible for examinations and course certification.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {data.at_risk_courses.map((arc: any) => (
              <div key={arc.course_id} className="p-4 bg-black/60 border border-rose-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono font-bold text-xs rounded-md">
                    {arc.course_code}
                  </span>
                  <span className="text-xs font-black text-rose-400">
                    {arc.current_pct}% (Policy Min: {arc.policy_min_pct}%)
                  </span>
                </div>
                <div className="text-sm font-bold text-white leading-snug">{arc.course_name}</div>
                <div className="text-xs text-slate-400">Faculty: {arc.faculty_name}</div>
                <div className="p-2.5 bg-rose-950/30 border border-rose-500/20 rounded-xl space-y-1 text-xs">
                  <div className="text-rose-300 font-bold flex items-center justify-between">
                    <span>Consecutive Classes Needed:</span>
                    <span className="font-mono text-white text-sm bg-rose-500/30 px-2 py-0.5 rounded-lg">
                      {arc.classes_needed_to_recover} classes
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono pt-1">
                    <span className="text-slate-300 font-bold">Formula: </span>
                    {arc.formula_explanation || `⌈(${arc.policy_min_pct}% × ${arc.classes_held} - 100 × ${arc.classes_attended}) / (100 - ${arc.policy_min_pct}%)⌉`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Core Real KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Enrolled Courses */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-2xl">
              <BookOpen size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Database Feed</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.enrolled_courses_count}</div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Enrolled Courses</div>
          </div>
        </div>

        {/* 2. Overall Attendance */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${!hasSessions ? 'bg-slate-500/15 text-slate-400' : isAttendanceGood ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
              <Activity size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${!hasSessions ? 'text-slate-400' : isAttendanceGood ? 'text-emerald-400' : 'text-rose-400'}`}>
              {!hasSessions ? 'No Sessions' : isAttendanceGood ? 'Above 75% ✔' : 'Below 75% ✘'}
            </span>
          </div>
          <div>
            <div className={`text-2xl font-black ${!hasSessions ? 'text-slate-400 text-lg' : isAttendanceGood ? 'text-emerald-400' : 'text-rose-400'}`}>
              {hasSessions ? `${data.overall_attendance_pct}%` : '0% (No classes held yet)'}
            </div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Overall Attendance</div>
          </div>
        </div>

        {/* 3. Average Assessment */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${!hasAssessments ? 'bg-slate-500/15 text-slate-400' : isAssessmentGood ? 'bg-purple-500/15 text-purple-400' : 'bg-amber-500/15 text-amber-400'}`}>
              <BrainCircuit size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${!hasAssessments ? 'text-slate-400' : isAssessmentGood ? 'text-purple-400' : 'text-amber-400'}`}>
              {!hasAssessments ? 'Pending' : isAssessmentGood ? 'Passed (≥50%)' : 'Pending (<50%)'}
            </span>
          </div>
          <div>
            <div className={`text-2xl font-black ${!hasAssessments ? 'text-slate-400 text-lg' : 'text-white'}`}>
              {hasAssessments ? `${data.average_assessment_score}%` : '0% (No assessments yet)'}
            </div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Assessment Average</div>
          </div>
        </div>

        {/* 4. Certificates Earned */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl">
              <Award size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Verified</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.certificates_earned_count}</div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Certificates Issued</div>
          </div>
        </div>
      </div>

      {/* Main Enrolled Courses Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
            My Enrolled Courses &amp; Progress Metrics
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {data.courses.length} Course{data.courses.length !== 1 ? 's' : ''} Active
          </span>
        </div>

        {data.courses.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center space-y-3 border border-white/10">
            <BookOpen size={40} className="mx-auto text-slate-500" />
            <h3 className="text-base font-black text-white">No Enrolled Courses</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              You are not enrolled in any course yet. Contact your department office.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.courses.map((course) => {
              const hasCourseSessions = course.attendance_pct !== null && course.attendance_pct !== undefined;
              const attnGood = hasCourseSessions && course.attendance_pct >= (course.policy_min_pct || 75);
              const hasCourseAssess = course.assessment_pct !== null && course.assessment_pct !== undefined;
              const assessGood = hasCourseAssess && course.assessment_pct >= 50;
              const progGood = course.progress_pct !== null && course.progress_pct !== undefined && course.progress_pct >= 100;
              const isIssued = course.certificate_status === 'ISSUED';
              const isAtRisk = course.is_at_risk;

              return (
                <div key={course.id} className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between ${isAtRisk ? 'border-rose-500/40 bg-rose-950/10' : 'border-white/10 hover:border-indigo-500/30'}`}>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md text-[10px] font-mono font-bold uppercase">
                        {course.code}
                      </span>
                      {isAtRisk ? (
                        <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                          <AlertTriangle size={10} /> At Risk
                        </span>
                      ) : isIssued ? (
                        <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase">
                          Certified ✔
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-white/10 text-slate-300 rounded-full text-[9px] font-bold uppercase">
                          {course.credits} Credits
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-white mt-2 leading-snug">{course.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Faculty: {course.faculty_name}</p>
                  </div>

                  {/* Real Metrics Checklist */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-1.5 text-xs my-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Attendance:</span>
                      <span className={`font-mono font-bold text-[11px] ${!hasCourseSessions ? 'text-slate-400' : attnGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {hasCourseSessions ? `${course.attendance_pct}% (${course.attended || 0}/${course.held || 0} classes) ${attnGood ? '✔' : '✘'}` : 'No classes held yet'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Assessment:</span>
                      <span className={`font-mono font-bold text-[11px] ${!hasCourseAssess ? 'text-slate-400' : assessGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {hasCourseAssess ? `${course.assessment_pct}% ${assessGood ? '✔' : '✘'}` : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Progress:</span>
                      <span className={`font-mono font-bold text-[11px] ${progGood ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {course.progress_pct !== null && course.progress_pct !== undefined ? `${course.progress_pct}% ${progGood ? '✔' : '✘'}` : '0.0%'}
                      </span>
                    </div>

                    {isAtRisk && (
                      <div className="pt-2 border-t border-rose-500/20 text-[10px] space-y-0.5">
                        <div className="text-rose-300 font-bold">
                          Recover: {course.classes_needed_to_recover} consecutive classes needed
                        </div>
                        <div className="text-slate-400 font-mono text-[9px] leading-tight">
                          {course.formula_explanation}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  {isIssued && course.certificate_code && (
                    <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadCert(course.certificate_code)}
                        className="flex-1 px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download size={13} /> Download Cert
                      </button>
                      <a
                        href={`/verify/${course.certificate_code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition-colors"
                        title="Verify Authentic QR Code"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Columns: Upcoming Quizzes & Pending Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Quizzes */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <BrainCircuit size={16} className="text-indigo-400" /> Upcoming &amp; Active Quizzes
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{data.upcoming_quizzes.length} Available</span>
          </div>

          {data.upcoming_quizzes.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">
              No pending quizzes for your enrolled courses.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.upcoming_quizzes.map((quiz) => (
                <div key={quiz.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-500/20 transition-all">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-indigo-300 block">{quiz.course_code}</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{quiz.title}</h4>
                    <span className="text-[10px] text-slate-400">{quiz.time_limit_minutes} mins • {quiz.total_marks} Marks</span>
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg">
                    Ready
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Assignments */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileCheck2 size={16} className="text-purple-400" /> Pending Graded Assignments
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{data.upcoming_assignments.length} Due</span>
          </div>

          {data.upcoming_assignments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">
              All course assignments submitted or none due.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.upcoming_assignments.map((asg) => (
                <div key={asg.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:border-purple-500/20 transition-all">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-purple-300 block">{asg.course_code}</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{asg.title}</h4>
                    <span className="text-[10px] text-slate-400">Due: {asg.due_date || 'No deadline'} • {asg.max_marks} Max Marks</span>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider rounded-lg">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Earned Certificates Registry */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Award size={16} className="text-amber-400" /> Earned Certificates &amp; Credentials
          </h3>
          <span className="text-[10px] font-mono text-slate-400">{data.earned_certificates.length} Issued</span>
        </div>

        {data.earned_certificates.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium">
            No certificates issued yet. Fulfill attendance (&ge;75%), assessment (&ge;50%), and 100% progress criteria to unlock official credentials.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.earned_certificates.map((cert) => (
              <div key={cert.id} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{cert.certificate_code}</span>
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold text-white leading-snug">{cert.course_name}</h4>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Issued: {cert.issued_date}</span>
                  <button
                    onClick={() => handleDownloadCert(cert.certificate_code)}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Download size={12} /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ role }) => {
  if (role === UserRole.ADMIN) {
    return <AdminDashboard />;
  }
  if (role === UserRole.FACULTY) {
    return <FacultyDashboard />;
  }
  return <StudentIntelligenceDashboard />;
};

export default Dashboard;
