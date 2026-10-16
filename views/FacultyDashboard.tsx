import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, CheckCircle, Clock, Activity, 
  FileText, Search, RefreshCw, AlertTriangle, Sparkles,
  ArrowRight, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { dashboardApi } from '../services/api';

const FacultyDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    my_courses_count: number;
    total_students_count: number;
    pending_grading_count: number;
    today_sessions_count: number;
    today_sessions: any[];
    overall_attendance_pct: number;
    courses: any[];
    students_below_75: any[];
    class_averages_per_assessment: any[];
    pending_submissions: any[];
  }>({
    my_courses_count: 0,
    total_students_count: 0,
    pending_grading_count: 0,
    today_sessions_count: 0,
    today_sessions: [],
    overall_attendance_pct: 0,
    courses: [],
    students_below_75: [],
    class_averages_per_assessment: [],
    pending_submissions: []
  });

  const [searchQuery, setSearchQuery] = useState('');

  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getFacultyDashboard();
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('[FacultyDashboard] Error fetching real metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const filteredCourses = data.courses.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-12">
      {/* Faculty Operations Header */}
      <div className="glass-panel p-6 md:p-8 rounded-[32px] border border-white/10 relative overflow-hidden bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-teal-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={13} /> Faculty Instructional Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Instructional &amp; Teaching <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">Operations Hub</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xl">
              Live statistics derived directly from your assigned courses, enrolled students, pending assignments, and attendance logs.
            </p>
          </div>

          <button
            onClick={fetchFacultyData}
            disabled={loading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 self-start md:self-auto"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
          </button>
        </div>
      </div>

      {/* 4 Core Real KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. My Courses */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl">
              <BookOpen size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.my_courses_count}</div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Assigned Courses</div>
          </div>
        </div>

        {/* 2. Enrolled Students */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-2xl">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Registered</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.total_students_count}</div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Enrolled Students</div>
          </div>
        </div>

        {/* 3. Pending Grading */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-2xl ${data.pending_grading_count > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-slate-400'}`}>
              <FileText size={20} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${data.pending_grading_count > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {data.pending_grading_count > 0 ? 'Review Needed' : 'Zero Pending'}
            </span>
          </div>
          <div>
            <div className={`text-2xl font-black ${data.pending_grading_count > 0 ? 'text-amber-400' : 'text-white'}`}>
              {data.pending_grading_count}
            </div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pending Submissions</div>
          </div>
        </div>

        {/* 4. Attendance Today & Rate */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-500/15 text-teal-400 rounded-2xl">
              <Activity size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Average Rate</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{data.overall_attendance_pct}%</div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {data.today_sessions_count} Session{data.today_sessions_count !== 1 ? 's' : ''} Today
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S SESSIONS & MARK ATTENDANCE SHORTCUT */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Clock size={16} className="text-teal-400" /> Today&apos;s Class Sessions &amp; Attendance Shortcut
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time attendance logs for lectures scheduled today.
            </p>
          </div>
          <button
            onClick={() => {
              // Dispatch event to switch tab to attendance
              window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'attendance' }));
            }}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto active:scale-95 shadow-md shadow-teal-600/30"
          >
            <Activity size={14} /> Mark Attendance Shortcut
          </button>
        </div>

        {data.today_sessions && data.today_sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.today_sessions.map((sess: any) => (
              <div key={sess.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 flex flex-col justify-between hover:border-teal-500/30 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 font-mono font-bold text-[10px] rounded-md">
                      {sess.course_code}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {sess.period}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1.5 leading-snug">{sess.course_name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Topic: {sess.topic}</p>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase">
                    Status: {sess.status}
                  </span>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'attendance' }));
                    }}
                    className="text-teal-300 hover:text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    Mark Attendance &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs font-medium bg-black/20 rounded-2xl border border-white/5">
            No class sessions recorded yet today. Click &quot;Mark Attendance Shortcut&quot; to initiate today&apos;s session ledger.
          </div>
        )}
      </div>

      {/* STUDENTS BELOW 75% ATTENDANCE (AT RISK) WITH RECOVERY FORMULA */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-300">
                Students Below 75% Attendance (At Risk)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Students across your courses requiring attendance recovery.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 text-[10px] font-black rounded-lg border border-rose-500/30">
            {data.students_below_75 ? data.students_below_75.length : 0} At Risk
          </span>
        </div>

        {data.students_below_75 && data.students_below_75.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll / Enrollment</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Recovery Classes Needed</th>
                  <th className="py-3 px-4 text-right">Policy Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {data.students_below_75.map((st: any, idx: number) => (
                  <tr key={`${st.student_id}-${st.course_id}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{st.student_name}</div>
                      <div className="text-[10px] text-slate-400">{st.student_email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-300 text-[11px]">{st.enrollment_no}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-slate-200">{st.course_code}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{st.course_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-rose-400 font-black font-mono">{st.attendance_pct}%</span>
                      <span className="text-[10px] text-slate-500 block">({st.classes_attended}/{st.classes_held} attended)</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-rose-500/20 text-rose-300 font-bold text-[11px] rounded-lg border border-rose-500/30">
                        {st.classes_needed_to_recover} consecutive classes
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
                      {st.formula}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs font-medium bg-black/20 rounded-2xl border border-white/5 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>All enrolled students across your courses maintain attendance &ge; 75%. No students at risk.</span>
          </div>
        )}
      </div>

      {/* CLASS AVERAGE PER ASSESSMENT */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity size={16} className="text-purple-400" /> Class Average Performance Per Assessment
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Aggregated quiz and assignment scores for your assigned courses.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {data.class_averages_per_assessment ? data.class_averages_per_assessment.length : 0} Assessments
          </span>
        </div>

        {data.class_averages_per_assessment && data.class_averages_per_assessment.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.class_averages_per_assessment.map((as: any, idx: number) => {
              const hasAvg = as.average_pct !== null && as.average_pct !== undefined;
              const isPassing = hasAvg && as.average_pct >= 50;

              return (
                <div key={`${as.id}-${idx}`} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 flex flex-col justify-between hover:border-purple-500/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] rounded-md">
                        {as.course_code}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase px-2 py-0.5 bg-white/5 rounded-md">
                        {as.type}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-2 leading-snug">{as.title}</h4>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">
                      {as.submissions_count} evaluated
                    </span>
                    <span className={`font-mono font-black text-xs ${!hasAvg ? 'text-slate-400' : isPassing ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {hasAvg ? `Avg: ${as.average_pct}%` : 'Pending evaluations'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs font-medium bg-black/20 rounded-2xl border border-white/5">
            No assessments published yet across your courses.
          </div>
        )}
      </div>

      {/* Main Course Breakdown Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
              My Instructional Courses &amp; Enrolled Count
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Real-time attendance rates and pending assignment reviews per course.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search course code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="glass-panel p-10 rounded-3xl text-center space-y-3 border border-white/10">
            <BookOpen size={36} className="mx-auto text-slate-500" />
            <h3 className="text-base font-black text-white">No Assigned Courses Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You are not currently assigned as an instructor to any active courses. Contact your department administrator or create courses from Faculty Operations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((c) => (
              <div key={c.id} className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md text-[10px] font-mono font-bold uppercase">
                      {c.code}
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/10 text-slate-300 rounded-full text-[9px] font-bold uppercase">
                      {c.credits} Credits
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white mt-2 leading-snug">{c.name}</h3>
                </div>

                <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Enrolled Students:</span>
                    <span className="font-mono font-bold text-[11px] text-white">
                      {c.enrolled_students_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Attendance Rate:</span>
                    <span className={`font-mono font-bold text-[11px] ${c.attendance_pct >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {c.attendance_pct}% ({c.sessions_count} sessions)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Pending Submissions:</span>
                    <span className={`font-mono font-bold text-[11px] ${c.pending_grading_count > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {c.pending_grading_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Submissions Queue */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <FileText size={16} className="text-amber-400" /> Pending Submissions Awaiting Evaluation ({data.pending_grading_count})
          </h3>
          <span className="text-[10px] font-mono text-slate-400">{data.pending_submissions.length} Total</span>
        </div>

        {data.pending_submissions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="text-emerald-400" />
            <span>All student submissions have been graded! Zero pending reviews.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Assignment Title</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {data.pending_submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{sub.student_name}</div>
                      <div className="text-[10px] text-slate-400">{sub.student_email}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">{sub.assignment_title}</td>
                    <td className="py-3 px-4 text-indigo-300 font-mono text-[11px]">{sub.course_code}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{sub.submitted_at}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-black uppercase">
                        Pending Grade
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyDashboard;
