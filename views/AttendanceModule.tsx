import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  Calendar, CheckCircle2, AlertTriangle, Clock, Save, 
  Users, CheckSquare, Search, RefreshCw, BookOpen, AlertCircle,
  XCircle, Check, ShieldAlert, Loader2, ArrowRight, Download
} from 'lucide-react';
import { attendanceApi, coursesApi, reportsApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface ModuleProps { 
  id: string; 
  role: UserRole; 
}

interface StudentRosterItem {
  student_id: string;
  name: string;
  email: string;
  enrollment_no: string;
  avatar: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
}

interface StudentCourseSummary {
  course_id: string;
  course_code: string;
  course_name: string;
  percentage: number | null;
  classes_held: number;
  classes_attended: number;
  status: string;
  is_low: boolean;
}

interface StudentHistoryLog {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  date: string;
  status: string;
  time: string;
  faculty_name: string;
}

const AttendanceModule: React.FC<ModuleProps> = ({ role }) => {
  const isFacultyOrAdmin = role === UserRole.FACULTY || role === UserRole.ADMIN;

  // -------------------------------------------------------------------------
  // Faculty State
  // -------------------------------------------------------------------------
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [marks, setMarks] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // -------------------------------------------------------------------------
  // Student State
  // -------------------------------------------------------------------------
  const [studentSummaries, setStudentSummaries] = useState<StudentCourseSummary[]>([]);
  const [studentHistory, setStudentHistory] = useState<StudentHistoryLog[]>([]);
  const [overallPercentage, setOverallPercentage] = useState<number | null>(null);
  const [hasWarning, setHasWarning] = useState<boolean>(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState<string>('');

  // -------------------------------------------------------------------------
  // Initial Data Fetching
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isFacultyOrAdmin) {
      coursesApi.list(true)
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setCourses(list);
          if (list.length > 0 && !selectedCourseId) {
            setSelectedCourseId(list[0].id);
          }
        })
        .catch((err) => console.error('Failed to load courses for attendance:', err));
    } else {
      loadStudentAttendance();
    }
  }, [role, isFacultyOrAdmin]);

  // Fetch roster whenever selectedCourseId or selectedDate changes for faculty
  useEffect(() => {
    if (isFacultyOrAdmin && selectedCourseId) {
      loadCourseRoster(selectedCourseId, selectedDate);
    }
  }, [selectedCourseId, selectedDate, isFacultyOrAdmin]);

  const loadCourseRoster = async (courseId: string, dateStr: string) => {
    setFacultyLoading(true);
    setSaveFeedback(null);
    try {
      const data = await attendanceApi.getCourseAttendance(courseId, dateStr);
      if (data && data.students) {
        setRoster(data.students);
        const initialMarks: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
        data.students.forEach((st: StudentRosterItem) => {
          initialMarks[st.student_id] = (st.status as any) || 'PRESENT';
        });
        setMarks(initialMarks);
      } else {
        setRoster([]);
        setMarks({});
      }
    } catch (err: any) {
      console.error('Error fetching course roster:', err);
      setRoster([]);
    } finally {
      setFacultyLoading(false);
    }
  };

  const loadStudentAttendance = async () => {
    setStudentLoading(true);
    try {
      const data = await attendanceApi.getMe();
      if (data) {
        setStudentSummaries(data.summary || []);
        setStudentHistory(data.history || []);
        setOverallPercentage(data.overall_percentage !== undefined ? data.overall_percentage : null);
        setHasWarning(data.has_warning || false);
      }
    } catch (err: any) {
      console.error('Error loading student attendance:', err);
    } finally {
      setStudentLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Faculty Actions
  // -------------------------------------------------------------------------
  const handleMarkChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    const updated: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
    roster.forEach((s) => {
      updated[s.student_id] = status;
    });
    setMarks(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourseId || !selectedDate) return;
    if (roster.length === 0) {
      setSaveFeedback({ type: 'error', text: 'No enrolled students to mark attendance for.' });
      return;
    }

    setSaving(true);
    setSaveFeedback(null);

    const markItems = roster.map((s) => ({
      student_id: s.student_id,
      status: marks[s.student_id] || 'PRESENT',
    }));

    try {
      const res = await attendanceApi.mark({
        course_id: selectedCourseId,
        date: selectedDate,
        marks: markItems,
      });
      setSaveFeedback({
        type: 'success',
        text: res.message || `Attendance saved for ${markItems.length} students on ${selectedDate}.`,
      });
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        text: err.message || 'Failed to save attendance. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render: FACULTY / ADMIN VIEW
  // -------------------------------------------------------------------------
  if (isFacultyOrAdmin) {
    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    const presentCount = Object.values(marks).filter((s) => s === 'PRESENT').length;
    const absentCount = Object.values(marks).filter((s) => s === 'ABSENT').length;
    const lateCount = Object.values(marks).filter((s) => s === 'LATE').length;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header and Controls */}
        <GlassCard className="p-6 rounded-[2rem]" hover={false}>
          <div className="flex flex-col lg:flex-row justify-between gap-6 lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">
                <Users size={14} />
                Faculty Attendance Portal
              </div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">Mark Attendance</h1>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={async () => {
                  if (!selectedCourseId) return;
                  setExporting(true);
                  try {
                    await reportsApi.downloadAttendanceCSV(selectedCourseId);
                  } catch (e: any) {
                    alert(e.message || 'Export failed');
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={!selectedCourseId || exporting}
                className="px-4 py-2.5 glass-btn hover:border-cyan-500/40 text-cyan-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
                title="Export course attendance ledger to CSV (Excel format)"
              >
                <Download size={16} /> {exporting ? 'Exporting...' : 'Export CSV'}
              </button>

              <button
                onClick={() => handleMarkAll('PRESENT')}
                disabled={roster.length === 0 || saving}
                className="px-4 py-2.5 glass-btn hover:border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <CheckSquare size={16} /> Mark All Present
              </button>

              <button
                onClick={handleSaveAttendance}
                disabled={roster.length === 0 || saving}
                className="px-6 py-2.5 glass-btn-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {/* Selector Bar */}
          <div className="mt-6 pt-6 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Course Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <BookOpen size={12} className="text-indigo-400" /> Select Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 bg-slate-900/60 cursor-pointer"
              >
                {courses.length === 0 && <option value="">No active courses found</option>}
                {courses.map((course) => (
                  <option key={course.id} value={course.id} className="bg-slate-900 text-slate-200">
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Calendar size={12} className="text-indigo-400" /> Attendance Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 bg-slate-900/60 cursor-pointer"
              />
            </div>
          </div>

          {/* Feedback Alert */}
          {saveFeedback && (
            <div
              className={`mt-4 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold ${
                saveFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}
            >
              {saveFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{saveFeedback.text}</span>
            </div>
          )}
        </GlassCard>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-4 rounded-2xl flex items-center justify-between" hover={false}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Enrolled</p>
              <p className="text-xl font-black text-slate-100 mt-0.5">{roster.length}</p>
            </div>
            <Users className="text-indigo-400" size={24} />
          </GlassCard>

          <GlassCard className="p-4 rounded-2xl flex items-center justify-between" hover={false}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Present</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{presentCount}</p>
            </div>
            <CheckCircle2 className="text-emerald-400" size={24} />
          </GlassCard>

          <GlassCard className="p-4 rounded-2xl flex items-center justify-between" hover={false}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Absent</p>
              <p className="text-xl font-black text-rose-400 mt-0.5">{absentCount}</p>
            </div>
            <XCircle className="text-rose-400" size={24} />
          </GlassCard>

          <GlassCard className="p-4 rounded-2xl flex items-center justify-between" hover={false}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Late</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">{lateCount}</p>
            </div>
            <Clock className="text-amber-400" size={24} />
          </GlassCard>
        </div>

        {/* Student Roster Table */}
        <GlassCard className="rounded-[2rem] overflow-hidden" hover={false}>
          <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-100">
                {selectedCourse ? `${selectedCourse.code}: ${selectedCourse.name}` : 'Course Roster'}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Roster for session on <span className="text-slate-200 font-semibold">{selectedDate}</span>
              </p>
            </div>
            <button
              onClick={() => loadCourseRoster(selectedCourseId, selectedDate)}
              className="p-2 glass-btn rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh Roster"
            >
              <RefreshCw size={16} className={facultyLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {facultyLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-indigo-400" size={32} />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Student Roster...</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Users className="mx-auto text-slate-600" size={40} />
              <h3 className="text-base font-bold text-slate-300">No Enrolled Students</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                There are currently no active students enrolled in this course. Students can enroll via the course catalog or admin enrollment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left glass-table">
                <thead>
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Enrollment ID</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {roster.map((student) => {
                    const currentMark = marks[student.student_id] || 'PRESENT';

                    return (
                      <tr key={student.student_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10"
                            />
                            <div>
                              <p className="text-sm font-bold text-slate-100">{student.name}</p>
                              <p className="text-xs text-slate-400 font-medium">{student.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-4">
                          <span className="text-xs font-mono font-bold text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {student.enrollment_no}
                          </span>
                        </td>

                        <td className="px-8 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Present Toggle */}
                            <button
                              type="button"
                              onClick={() => handleMarkChange(student.student_id, 'PRESENT')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                currentMark === 'PRESENT'
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                  : 'glass-btn text-slate-400 hover:text-emerald-400'
                              }`}
                            >
                              <Check size={14} /> Present
                            </button>

                            {/* Late Toggle */}
                            <button
                              type="button"
                              onClick={() => handleMarkChange(student.student_id, 'LATE')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                currentMark === 'LATE'
                                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                  : 'glass-btn text-slate-400 hover:text-amber-400'
                              }`}
                            >
                              <Clock size={14} /> Late
                            </button>

                            {/* Absent Toggle */}
                            <button
                              type="button"
                              onClick={() => handleMarkChange(student.student_id, 'ABSENT')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                currentMark === 'ABSENT'
                                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                  : 'glass-btn text-slate-400 hover:text-rose-400'
                              }`}
                            >
                              <XCircle size={14} /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: STUDENT VIEW
  // -------------------------------------------------------------------------
  if (studentLoading) {
    return <FullPageLoader />;
  }

  const filteredHistory = studentHistory.filter((item) => {
    if (!historySearch) return true;
    const query = historySearch.toLowerCase();
    return (
      item.course_name.toLowerCase().includes(query) ||
      item.course_code.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query) ||
      item.date.includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Student Top Warning Banner if < 75% in any enrolled course */}
      {hasWarning && (
        <div className="p-5 rounded-[2rem] bg-rose-500/15 border border-rose-500/30 text-rose-200 flex items-start gap-4 shadow-xl shadow-rose-500/10">
          <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400 shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-100 uppercase tracking-wider">
              Critical Attendance Notice
            </h3>
            <p className="text-xs text-rose-300 font-medium mt-1 leading-relaxed">
              Your attendance in one or more enrolled courses is below the institutional <span className="font-bold text-rose-100">75% requirement</span>. Immediate attendance regularity is required to maintain semester exam eligibility.
            </p>
          </div>
        </div>
      )}

      {/* Student Header */}
      <GlassCard className="p-6 rounded-[2rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">
              <Calendar size={14} />
              Academic Attendance Ledger
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">My Attendance Status</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aggregate Status:</span>
              <span
                className={`text-base font-black ${
                  overallPercentage === null
                    ? 'text-slate-400 text-xs'
                    : overallPercentage >= 75
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {overallPercentage !== null ? `${overallPercentage}%` : 'No classes held yet'}
              </span>
            </div>

            <button
              onClick={loadStudentAttendance}
              className="p-2.5 glass-btn rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh Attendance"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Per-Course Attendance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studentSummaries.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <BookOpen className="mx-auto text-slate-600 mb-3" size={36} />
            <p className="text-sm font-bold text-slate-400">No course enrollments found.</p>
          </div>
        ) : (
          studentSummaries.map((course) => {
            const hasSessions = course.percentage !== null && course.classes_held > 0;
            const isLow = hasSessions && course.percentage! < 75;
            const isWarning = hasSessions && course.percentage! >= 75 && course.percentage! < 85;

            return (
              <GlassCard key={course.course_id} className="p-6 rounded-[2rem] flex flex-col justify-between" hover={false}>
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-xs font-mono font-bold text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      {course.course_code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        !hasSessions
                          ? 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                          : isLow
                          ? 'badge-rose text-rose-300'
                          : isWarning
                          ? 'badge-amber text-amber-300'
                          : 'badge-emerald text-emerald-300'
                      }`}
                    >
                      {!hasSessions ? <Clock size={12} /> : isLow ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      {!hasSessions ? 'No Sessions' : isLow ? 'Below 75%' : isWarning ? 'Moderate' : 'Regular'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 tracking-tight">{course.course_name}</h3>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold">Attendance Rate</span>
                    <span
                      className={`text-base font-black ${
                        !hasSessions ? 'text-slate-400 text-xs' : isLow ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {hasSessions ? `${course.percentage}%` : 'No classes held yet'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        !hasSessions
                          ? 'bg-slate-700'
                          : isLow
                          ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                      }`}
                      style={{ width: `${hasSessions ? Math.min(100, course.percentage!) : 0}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 pt-1">
                    <span>Attended: <strong className="text-slate-200">{course.classes_attended}</strong></span>
                    <span>Held: <strong className="text-slate-200">{course.classes_held}</strong></span>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Attendance History Table */}
      <GlassCard className="rounded-[2rem] overflow-hidden" hover={false}>
        <div className="p-6 border-b border-white/[0.06] flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <div>
            <h2 className="text-lg font-black text-slate-100">Session Attendance Log</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Verified chronological records of your logged attendance sessions
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by course or status..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-200"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            No attendance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left glass-table">
              <thead>
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Course</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Marked Time</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Faculty</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredHistory.map((item) => {
                  const isPresent = item.status === 'PRESENT';
                  const isLate = item.status === 'LATE';

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-4 text-xs font-semibold text-slate-200">{item.date}</td>
                      <td className="px-8 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-100">{item.course_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.course_code}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-xs text-slate-400 font-medium">{item.time}</td>
                      <td className="px-8 py-4 text-xs text-slate-300 font-medium">{item.faculty_name}</td>
                      <td className="px-8 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            isPresent
                              ? 'badge-emerald text-emerald-300'
                              : isLate
                              ? 'badge-amber text-amber-300'
                              : 'badge-rose text-rose-300'
                          }`}
                        >
                          {isPresent ? <CheckCircle2 size={12} /> : isLate ? <Clock size={12} /> : <XCircle size={12} />}
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default AttendanceModule;
