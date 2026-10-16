import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, 
  PlayCircle, Sparkles, GraduationCap, CheckCircle, Search, 
  LayoutGrid, List, AlertCircle, Users, Award, Play, RotateCcw
} from 'lucide-react';
import { useApi } from '../hooks';
import { coursesApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface ModuleProps { id: string; role: UserRole; }

const SubjectsModule: React.FC<ModuleProps> = ({ role }) => {
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my_courses' | 'catalog'>('my_courses');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Faculty/Admin student roster state
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch courses from backend
  const fetcher = role === UserRole.STUDENT 
    ? (activeTab === 'catalog' ? () => coursesApi.list(true) : () => coursesApi.myEnrollments())
    : () => coursesApi.list();

  const { data: rawCourses, loading, error, refetch } = useApi(fetcher, [], [role, activeTab], `subjects-${role}-${activeTab}`);

  const courses = (rawCourses || []).map((c: any) => ({
    ...c,
    modules: c.modules || [],
    syllabus_topics: c.syllabus_topics || []
  }));

  // If faculty/admin selects a course, load enrolled students
  useEffect(() => {
    if (selectedCourse && (role === UserRole.FACULTY || role === UserRole.ADMIN)) {
      setLoadingStudents(true);
      coursesApi.getEnrolledStudents(selectedCourse.id)
        .then(res => setEnrolledStudents(res?.students || []))
        .catch(err => {
          console.warn('Failed to load course students:', err);
          setEnrolledStudents([]);
        })
        .finally(() => setLoadingStudents(false));
    }
  }, [selectedCourse, role]);

  const handleSelfEnroll = async (c: any) => {
    setEnrollingId(c.id);
    setFeedback(null);
    try {
      await coursesApi.selfEnroll(c.id);
      setFeedback({ type: 'success', text: `Enrolled successfully in ${c.code}: ${c.name}!` });
      window.dispatchEvent(new CustomEvent('institution-data-sync'));
      refetch();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to enroll in course' });
    } finally {
      setEnrollingId(null);
    }
  };

  const handleLaunchVideoPlayer = (course: any, lessonIndex: number = 0) => {
    window.dispatchEvent(new CustomEvent('universe-navigate', { 
      detail: { 
        tab: 'workspace', 
        courseData: {
          id: course.id,
          title: `${course.name} - Video Lecture Series`,
          activeLessonIndex: lessonIndex,
          modules: course.modules || []
        }
      } 
    }));
  };

  const filteredCourses = courses.filter((c: any) => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !rawCourses) return <FullPageLoader />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass rounded-3xl text-center space-y-4 my-8">
        <AlertCircle size={48} className="text-rose-400" />
        <h3 className="text-lg font-bold text-white">Failed to load courses</h3>
        <p className="text-xs text-slate-400 max-w-md">{error}</p>
        <button
          onClick={refetch}
          className="px-6 py-2.5 glass-btn-primary rounded-xl text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"
        >
          <RotateCcw size={14} /> Retry
        </button>
      </div>
    );
  }

  // Detailed Course View with Lessons Stream & Scoped Intel
  if (selectedCourse) {
    const lessonsList = selectedCourse.modules?.flatMap((m: any) => m.lessons || []) || [];

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 font-sans pb-12">
        {/* Course Header Banner */}
        <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <button 
                onClick={() => setSelectedCourse(null)} 
                className="p-3 glass rounded-2xl text-slate-300 hover:text-white transition-all shrink-0 mt-1"
              >
                <ArrowLeft size={20}/>
              </button>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                    {selectedCourse.code} • {selectedCourse.semester ? `Semester ${selectedCourse.semester}` : 'Core Curriculum'}
                  </span>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    {selectedCourse.credits || 3} Credits
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{selectedCourse.name}</h1>
                <p className="text-xs text-slate-400 font-medium mt-1 max-w-2xl leading-relaxed">
                  {selectedCourse.description || 'No description provided.'}
                </p>

                {/* Free-form Syllabus Topics entered by faculty */}
                {selectedCourse.syllabus_topics && selectedCourse.syllabus_topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedCourse.syllabus_topics.map((topic: string) => (
                      <span key={topic} className="px-3 py-1 glass text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-500/20">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {lessonsList.length > 0 && (
              <button 
                onClick={() => handleLaunchVideoPlayer(selectedCourse, 0)}
                className="glass-btn-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all w-full lg:w-auto justify-center"
              >
                <PlayCircle size={18} /> Open Lessons
              </button>
            )}
          </div>
        </GlassCard>

        {/* Video Lessons Stream & Course Intel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lessons Stream */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2.5">
                    <PlayCircle className="text-indigo-400" size={22} /> Course Lessons ({lessonsList.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Structured modules and curriculum materials.
                  </p>
                </div>
                {lessonsList.length > 0 && (
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                    Published
                  </span>
                )}
              </div>

              {lessonsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs">
                  No lessons published yet
                </div>
              ) : (
                <div className="space-y-3.5">
                  {lessonsList.map((lesson: any, idx: number) => (
                    <div 
                      key={lesson.id || idx}
                      onClick={() => handleLaunchVideoPlayer(selectedCourse, idx)}
                      className="p-5 rounded-2xl glass border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.04] transition-all flex items-center gap-4 group cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                        <Play size={18} fill="currentColor" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                          {lesson.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Clock size={11} /> {lesson.duration || `${lesson.duration_minutes || 0} min`}</span>
                          <span className="text-indigo-400">Type: {lesson.content_type || lesson.type || 'Lesson'}</span>
                        </div>
                      </div>

                      <button className="px-4 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Enrolled Students Roster (Faculty/Admin only) */}
            {(role === UserRole.FACULTY || role === UserRole.ADMIN) && (
              <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
                <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2.5">
                      <Users className="text-emerald-400" size={22} /> Enrolled Students ({enrolledStudents.length})
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">Active enrollments for {selectedCourse.code}</p>
                  </div>
                </div>

                {loadingStudents ? (
                  <div className="text-center py-8 text-slate-400 text-xs">Loading roster...</div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">No students currently enrolled.</div>
                ) : (
                  <div className="space-y-3">
                    {enrolledStudents.map((st: any) => (
                      <div key={st.id || st.student_id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{st.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{st.enrollment_no || st.email}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          {st.status || 'Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Student Performance for THIS Course Only */}
            {role === UserRole.STUDENT && (
              <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Award size={18} className="text-indigo-400" /> My Course Performance
                </h3>
                <div className="space-y-3.5">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">My Attendance</p>
                      <p className="text-[11px] text-slate-500 font-medium">This course only</p>
                    </div>
                    <span className="text-base font-black text-white">
                      {selectedCourse.my_attendance !== null && selectedCourse.my_attendance !== undefined 
                        ? `${selectedCourse.my_attendance}%` 
                        : 'No classes held yet'}
                    </span>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">My Marks</p>
                      <p className="text-[11px] text-slate-500 font-medium">Graded assessments</p>
                    </div>
                    <span className="text-base font-black text-white">
                      {selectedCourse.my_marks !== null && selectedCourse.my_marks !== undefined 
                        ? `${selectedCourse.my_marks}%` 
                        : 'No assessments graded yet'}
                    </span>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Course Progress</p>
                      <p className="text-[11px] text-slate-500 font-medium">Completed lessons</p>
                    </div>
                    <span className="text-base font-black text-indigo-400">
                      {selectedCourse.progress ?? 0}%
                    </span>
                  </div>
                </div>
              </GlassCard>
            )}

            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Users size={18} className="text-indigo-400" /> Course Faculty
              </h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-indigo-400 font-black text-lg bg-indigo-500/10 border border-indigo-500/20">
                  {selectedCourse.faculty_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'FA'}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{selectedCourse.faculty_name || 'Assigned Faculty'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Faculty In-Charge</p>
                  <p className="text-[10px] text-indigo-400 font-medium mt-1">{selectedCourse.schedule || 'Scheduled Sessions'}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // Main Course Catalog & My Courses View
  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <BookOpen size={14} />
            Academic Curricula &amp; Courses
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {role === UserRole.STUDENT 
              ? (activeTab === 'catalog' ? 'Course Catalog & Self-Enrollment' : 'My Enrolled Courses')
              : 'Institutional Courses'}
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Official institutional courses with curriculum modules, lessons, and performance metrics.
          </p>
        </div>

        {/* Student View Switcher */}
        {role === UserRole.STUDENT && (
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => { setActiveTab('my_courses'); setFeedback(null); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'my_courses' ? 'glass-btn-primary text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => { setActiveTab('catalog'); setFeedback(null); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'catalog' ? 'glass-btn-primary text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Course Catalog
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 p-1.5 glass rounded-2xl w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search course titles or codes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div className="flex bg-white/5 rounded-xl p-1">
            <button onClick={() => setViewType('grid')} className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'glass-btn-primary text-white' : 'text-slate-400 hover:text-slate-200'}`}><LayoutGrid size={18}/></button>
            <button onClick={() => setViewType('list')} className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'glass-btn-primary text-white' : 'text-slate-400 hover:text-slate-200'}`}><List size={18}/></button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border text-xs font-bold animate-in fade-in duration-300 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Courses List or Empty State */}
      {filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 glass rounded-3xl text-center space-y-3 my-6">
          <BookOpen size={48} className="text-slate-600 mb-2" />
          <h3 className="text-base font-bold text-white">No Courses Found</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {role === UserRole.STUDENT && activeTab === 'my_courses'
              ? "You haven't enrolled in any courses yet. Switch to the Course Catalog to browse and enroll."
              : "No courses are currently available in the database. When courses are registered, they will appear here."}
          </p>
        </div>
      ) : (
        <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "space-y-4"}>
          {filteredCourses.map((c: any) => {
            const isEnrolled = activeTab === 'my_courses' || c.is_enrolled;
            const isEnrolling = enrollingId === c.id;

            return (
              <GlassCard key={c.id || c.code} className="p-8 rounded-[2.5rem] flex flex-col justify-between group">
                <div>
                  {/* Header Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-lg">
                        {c.code}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                        {c.semester ? `Semester ${c.semester}` : 'Core Course'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{c.credits || 4} Credits</span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-2 line-clamp-2 leading-relaxed">
                    {c.description || 'No description provided.'}
                  </p>

                  {/* Syllabus Topics Badges (rendered ONLY if faculty added them) */}
                  {c.syllabus_topics && c.syllabus_topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 my-5">
                      {c.syllabus_topics.map((s: string) => (
                        <span key={s} className="px-2.5 py-1 glass text-indigo-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Real Lessons Summary */}
                  {(() => {
                    const courseLessons = c.modules?.flatMap((m: any) => m.lessons || []) || [];
                    const totalLessons = c.lessons_count ?? courseLessons.length;
                    const typeSummary = c.lesson_types && c.lesson_types.length > 0 
                      ? c.lesson_types.map((t: string) => t.toUpperCase()).join(', ') 
                      : (courseLessons.length > 0 ? Array.from(new Set(courseLessons.map((l: any) => (l.content_type || l.type || 'Lesson').toUpperCase()))).join(', ') : null);

                    return (
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <PlayCircle size={18} />
                          </div>
                          <div>
                            {totalLessons === 0 ? (
                              <p className="text-xs font-bold text-slate-400">No lessons published yet</p>
                            ) : (
                              <>
                                <p className="text-xs font-bold text-slate-200">
                                  {totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'} {typeSummary ? `(${typeSummary})` : ''}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">{c.modules?.length || 0} Modules</p>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Faculty: {c.faculty_name || 'Assigned'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  {role === UserRole.STUDENT && activeTab === 'catalog' && !isEnrolled ? (
                    <button
                      onClick={() => handleSelfEnroll(c)}
                      disabled={isEnrolling}
                      className="flex-1 glass-btn-primary text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isEnrolling ? 'Enrolling...' : 'Enroll in Course'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLaunchVideoPlayer(c, 0)}
                      className="flex-1 glass-btn-primary text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                      <PlayCircle size={16} /> Open Course
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCourse(c)}
                    className="px-5 py-3.5 glass hover:bg-white/10 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Curriculum
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubjectsModule;
