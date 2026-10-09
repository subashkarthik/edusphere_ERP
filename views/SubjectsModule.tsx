import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { ROLE_THEMES } from '../constants';
import { 
  Filter, ArrowLeft, ArrowRight, Download, Info, 
  List, History, LayoutGrid, Search, BookOpen,
  CheckCircle2, Clock, BarChart2, ShieldCheck, MoreVertical,
  Layers, ChevronRight, GraduationCap, CheckCircle, Loader2,
  Users, Sparkles, AlertCircle
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

  const fallbackCourses = [
    { id: 'crs-cc', code: 'CYB101', name: 'Ethical Hacking & AI', credits: 4, enrolled_count: 87, progress: 94, faculty_name: 'Dr. Arun Kumar', schedule: 'Mon, Wed 09:00 AM', category: 'Cyber Security' },
    { id: 'crs-mad', code: 'PRG201', name: 'Python Programming', credits: 3, enrolled_count: 65, progress: 88, faculty_name: 'Prof. S. Devi', schedule: 'Tue, Thu 11:30 AM', category: 'Programming Languages' },
    { id: 'crs-ml', code: 'PRG205', name: 'SQL Database Engineering', credits: 4, enrolled_count: 54, progress: 92, faculty_name: 'Dr. P. Raj', schedule: 'Fri 02:00 PM', category: 'Programming Languages' },
  ];

  // For students, fetch my-enrollments. For faculty/admins, fetch all courses.
  const fetcher = role === UserRole.STUDENT 
    ? (activeTab === 'catalog' ? () => coursesApi.list(true) : () => coursesApi.myEnrollments())
    : () => coursesApi.list();

  const { data: courses, loading, refetch } = useApi(fetcher, fallbackCourses, [role, activeTab], `subjects-${role}-${activeTab}`);
  const { data: materials } = useApi(() => selectedCourse ? coursesApi.materials(selectedCourse.id) : Promise.resolve([]), [], [selectedCourse?.id]);

  // If faculty/admin selects a course, load enrolled students
  useEffect(() => {
    if (selectedCourse && (role === UserRole.FACULTY || role === UserRole.ADMIN)) {
      setLoadingStudents(true);
      coursesApi.getEnrolledStudents(selectedCourse.id)
        .then(res => setEnrolledStudents(res.students || []))
        .catch(err => {
          console.warn('Failed to load course students:', err);
          setEnrolledStudents([]);
        })
        .finally(() => setLoadingStudents(false));
    }
  }, [selectedCourse, role]);

  // Ensure data refreshes on institutional events
  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener('institution-data-sync', handleRefresh);
    return () => window.removeEventListener('institution-data-sync', handleRefresh);
  }, [refetch]);

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

  const handleEnterClassroom = (c: any) => {
    window.dispatchEvent(new CustomEvent('universe-navigate', { 
      detail: { 
        tab: 'workspace', 
        courseData: {
          id: c.id,
          title: c.name,
          name: c.name,
          code: c.code,
          modules: [{ id: 'm1', title: 'Main Stream', lessons: materials || [] }]
        }
      } 
    }));
  };

  const filteredCourses = (courses || []).filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Instead of a blocking loader, we use a softer transition if we have data
  if (loading && !courses) return <FullPageLoader />;

  if (selectedCourse) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <GlassCard className="p-6 rounded-3xl" hover={false}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full sm:w-auto">
              <button onClick={() => setSelectedCourse(null)} className="p-2.5 glass-btn rounded-xl shrink-0"><ArrowLeft size={20}/></button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest badge-indigo px-2 py-0.5 rounded-md">{selectedCourse.code}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section A</span>
                </div>
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">{selectedCourse.name}</h2>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('universe-navigate', { 
                  detail: { 
                    tab: 'workspace', 
                    courseData: {
                      id: selectedCourse.id,
                      title: selectedCourse.name,
                      modules: [{ id: 'm1', title: 'Main Stream', lessons: materials || [] }]
                    }
                  } 
                }))}
                className="flex-1 sm:flex-none glass-btn-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <GraduationCap size={16}/>
                Enter Classroom
              </button>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h3 className="font-bold text-slate-100 mb-8 flex items-center gap-3"><BookOpen className="text-indigo-400" size={20}/> Learning Assets</h3>
              <div className="space-y-3">
                {(materials || []).length > 0 ? (materials || []).map((m: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl glass border border-white/[0.06] hover:border-indigo-500/20 transition-all flex items-center gap-4 group cursor-pointer">
                    <div className="w-12 h-12 glass rounded-xl flex items-center justify-center font-black text-slate-400 text-[10px] group-hover:text-indigo-400 transition-colors">{m.type || 'DOC'}</div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-slate-200 truncate">{m.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{m.date || 'Jan 2025'} • {m.size || 'N/A'}</p>
                    </div>
                    <Download size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors"/>
                  </div>
                )) : (
                   <div className="py-12 text-center text-slate-500 text-xs font-medium border border-dashed border-white/10 rounded-2xl">
                     Connecting to academic vault... No assets found.
                   </div>
                )}
              </div>
            </GlassCard>

            {/* Enrolled Students Roster for Faculty / Admin */}
            {(role === UserRole.FACULTY || role === UserRole.ADMIN) && (
              <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-100 flex items-center gap-3">
                    <Users className="text-indigo-400" size={20}/> Enrolled Student Roster
                  </h3>
                  <span className="px-3 py-1 glass rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    {enrolledStudents.length} Students
                  </span>
                </div>

                {loadingStudents ? (
                  <div className="py-12 flex items-center justify-center gap-3 text-slate-400 text-xs font-bold">
                    <Loader2 size={20} className="animate-spin text-indigo-400" />
                    <span>Loading student roster...</span>
                  </div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-medium border border-dashed border-white/10 rounded-2xl">
                    No students currently enrolled in this course.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-hide">
                    {enrolledStudents.map((st, i) => (
                      <div key={st.enrollment_id || i} className="p-3.5 rounded-xl glass border border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={st.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name)}&background=4f46e5&color=fff`} 
                            alt={st.name} 
                            className="w-8 h-8 rounded-lg object-cover" 
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-200">{st.name}</p>
                            <p className="text-[10px] text-slate-400">{st.email} • {st.enrollment_no || 'N/A'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider badge-emerald">
                          {st.status || 'ACTIVE'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h3 className="font-bold text-slate-100 mb-8 flex items-center gap-3"><History className="text-indigo-400" size={20}/> Session Intelligence</h3>
              <div className="overflow-hidden glass rounded-2xl">
                <table className="w-full text-left text-sm glass-table">
                  <thead>
                    <tr><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Session Date</th><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Timing</th><th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th></tr>
                  </thead>
                  <tbody>
                    {[{ date: 'Oct 12, 2024', status: 'Present', time: '09:05 AM' },{ date: 'Oct 10, 2024', status: 'Present', time: '09:02 AM' },{ date: 'Oct 08, 2024', status: 'Absent', time: '-' }].map((h, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 font-bold text-slate-200 text-xs">{h.date}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-medium">{h.time}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${h.status === 'Present' ? 'badge-emerald' : 'badge-rose'}`}>{h.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
             <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
               <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 rounded-xl glass flex items-center justify-center text-slate-400 font-bold">AK</div>
                 <div>
                   <p className="text-sm font-black text-slate-200">{selectedCourse.faculty_name || 'TBA'}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Senior Professor</p>
                 </div>
               </div>
               <button className="w-full py-3 glass-btn-primary rounded-xl font-bold text-[10px] uppercase tracking-widest text-white">Request Consultation</button>
             </GlassCard>

             <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
               <h3 className="font-bold text-slate-100 mb-6 flex items-center gap-2"><BarChart2 size={18} className="text-indigo-400"/> Cohort Metrics</h3>
               <div className="space-y-5">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                   <span>Attendance</span>
                   <span className="text-slate-100">92%</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                   <span>Avg Grade</span>
                   <span className="text-slate-100">8.4 CGPA</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                   <span>Activity</span>
                   <span className="text-slate-100">High</span>
                 </div>
               </div>
             </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <BookOpen size={12} className="text-indigo-400" />
            Curriculum Architecture
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            {role === UserRole.STUDENT 
              ? (activeTab === 'catalog' ? 'Course Catalog & Self-Enrollment' : 'My Enrolled Courses')
              : 'Active Courses'}
          </h1>
        </div>

        {/* Student View Switcher */}
        {role === UserRole.STUDENT && (
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => { setActiveTab('my_courses'); setFeedback(null); }}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'my_courses' ? 'glass-btn-primary text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => { setActiveTab('catalog'); setFeedback(null); }}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'catalog' ? 'glass-btn-primary text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Explore Catalog
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 p-1.5 glass rounded-2xl w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search courses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
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

      {/* Empty state for students with no enrollments */}
      {role === UserRole.STUDENT && activeTab === 'my_courses' && filteredCourses.length === 0 ? (
        <GlassCard className="p-12 rounded-[2.5rem] text-center space-y-4 max-w-lg mx-auto" hover={false}>
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-lg font-black text-white">No Enrolled Courses Found</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            You are not currently enrolled in any institutional modules. Explore the course catalog to self-enroll in your semester subjects.
          </p>
          <button
            onClick={() => setActiveTab('catalog')}
            className="glass-btn-primary px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white inline-flex items-center gap-2"
          >
            <Sparkles size={14} /> Browse Course Catalog
          </button>
        </GlassCard>
      ) : (
        <div className={viewType === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredCourses.map((c: any) => {
            const isEnrolling = enrollingId === c.id;

            return (
              <GlassCard key={c.id || c.code} onClick={() => setSelectedCourse(c)} className={viewType === 'grid' ? 'p-8 rounded-[2.5rem] flex flex-col justify-between' : 'p-5 rounded-2xl'}>
                <div className={viewType === 'list' ? 'flex items-center gap-8' : ''}>
                  <div className={`shrink-0 flex items-center justify-center font-black text-[11px] ${viewType === 'grid' ? 'w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 mb-8' : 'w-10 h-10 rounded-lg bg-indigo-500/15 text-indigo-400'}`}>
                    {c.code?.slice(-2) || 'XX'}
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 overflow-hidden">
                        <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">{c.name || 'Untitled Course'}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">{c.code} • {c.category || 'Academic'}</p>
                      </div>
                      {viewType === 'grid' && (
                         <div className="text-right shrink-0">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Credits</p>
                           <p className="text-xs font-black text-slate-200">{c.credits || 0}</p>
                         </div>
                      )}
                    </div>

                    {viewType === 'grid' && (
                      <div className="flex flex-wrap gap-1.5 my-6 h-[40px] overflow-hidden">
                        {(c.code === 'CS8701' ? ['AWS', 'Docker', 'Kubernetes'] : c.code === 'CS8702' ? ['Network Security', 'Cryptography'] : ['Core Engineering', 'System Design']).map((skill: string) => (
                          <span key={skill} className="px-2 py-0.5 glass text-slate-400 text-[8px] font-black uppercase rounded">{skill}</span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                        <span>Course Velocity</span>
                        <span className="text-indigo-400">{c.progress || 0}%</span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000 progress-glow" style={{width: `${c.progress || 0}%`, color: '#818cf8'}}></div></div>
                    </div>
                  </div>

                  {viewType === 'list' && (
                     <div className="flex items-center gap-10 shrink-0">
                       <div className="text-center min-w-[60px]">
                         <p className="text-[9px] font-black text-slate-500 uppercase">Credits</p>
                         <p className="text-xs font-black text-slate-200">{c.credits || 0}</p>
                       </div>
                       <div className="p-3 rounded-xl glass text-slate-400"><ArrowRight size={16}/></div>
                     </div>
                  )}

                  {viewType === 'grid' && (
                     <div className="mt-8 pt-5 border-t border-white/[0.06] space-y-3">
                       <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <Clock size={12} className="text-indigo-400" />
                           {c.schedule || 'Institutional Stream'}
                         </div>
                         <div className="w-8 h-8 rounded-full glass flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors"><ArrowRight size={14}/></div>
                       </div>

                       {/* Action Buttons inside Course Card */}
                       {role === UserRole.STUDENT && activeTab === 'catalog' && (
                         <div className="pt-2" onClick={e => e.stopPropagation()}>
                           <button
                             type="button"
                             onClick={() => handleSelfEnroll(c)}
                             disabled={isEnrolling}
                             className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
                           >
                             {isEnrolling ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
                             {isEnrolling ? 'Enrolling...' : 'Enroll In Course'}
                           </button>
                         </div>
                       )}

                       {role === UserRole.STUDENT && activeTab === 'my_courses' && (
                         <div className="pt-2" onClick={e => e.stopPropagation()}>
                           <button
                             type="button"
                             onClick={() => handleEnterClassroom(c)}
                             className="w-full py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
                           >
                             <GraduationCap size={14} /> Continue Learning
                           </button>
                         </div>
                       )}
                     </div>
                  )}
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
