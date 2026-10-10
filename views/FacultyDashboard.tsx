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
    overall_attendance_pct: number;
    courses: any[];
    pending_submissions: any[];
  }>({
    my_courses_count: 0,
    total_students_count: 0,
    pending_grading_count: 0,
    today_sessions_count: 0,
    overall_attendance_pct: 0,
    courses: [],
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

      {/* Main Course Breakdown Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
              My Instructional Courses &amp; Class Attendance
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
            <FileText size={16} className="text-amber-400" /> Pending Submissions Awaiting Evaluation
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
