import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Sparkles, GraduationCap, ArrowRight, Layers, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { coursesApi, getAccessToken } from '../services/api';

interface CourseItem {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  semester: number;
  department: string;
  faculty_name: string;
}

const PublicCatalog: React.FC = () => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  useEffect(() => {
    // Fetch public courses
    fetch('/api/public/courses')
      .then(res => res.json())
      .then(data => {
        if (data.courses) {
          setCourses(data.courses);
        }
      })
      .catch(err => console.error("Error fetching public catalog:", err))
      .finally(() => setLoading(false));

    // If logged in, fetch user's enrollments to show enrolled state
    if (getAccessToken()) {
      coursesApi.myEnrollments()
        .then(enrollments => {
          if (Array.isArray(enrollments)) {
            const ids = new Set<string>(enrollments.map((e: any) => e.course_id || e.id));
            setEnrolledCourseIds(ids);
          }
        })
        .catch(err => console.warn("Could not load enrollments in catalog:", err));
    }
  }, []);

  const handleEnroll = async (course: CourseItem) => {
    if (!getAccessToken()) {
      setFeedback({ type: 'error', text: 'Please sign in with your student account to enroll in courses.' });
      setTimeout(() => {
        if (window.location.pathname.startsWith('/public-catalog')) {
          window.location.href = '/';
        }
      }, 1500);
      return;
    }

    setEnrollingId(course.id);
    setFeedback(null);

    try {
      await coursesApi.selfEnroll(course.id);
      setEnrolledCourseIds(prev => new Set(prev).add(course.id));
      setFeedback({ type: 'success', text: `Enrolled in ${course.code}: ${course.name}!` });
      window.dispatchEvent(new CustomEvent('institution-data-sync'));
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Enrollment failed' });
    } finally {
      setEnrollingId(null);
    }
  };

  const handleContinue = (course: CourseItem) => {
    window.dispatchEvent(new CustomEvent('universe-navigate', {
      detail: {
        tab: 'workspace',
        courseData: {
          id: course.id,
          title: course.name,
          name: course.name,
          code: course.code,
          modules: [{ id: 'm1', title: 'Main Stream', lessons: [] }]
        }
      }
    }));

    if (window.location.pathname.startsWith('/public-catalog')) {
      window.location.href = `/?tab=workspace&courseId=${course.id}`;
    }
  };

  const departments = ['ALL', 'Computer Science and Engineering', 'Artificial Intelligence and Data Science', 'Information Technology', 'Electronics and Communication Engineering', 'Mechanical Engineering'];

  const filtered = courses.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === 'ALL' || c.department.includes(selectedDept) || selectedDept.includes(c.department);
    return matchSearch && matchDept;
  });

  return (
    <div className="min-h-screen bg-[#030712] text-white p-4 md:p-12 space-y-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto space-y-4 text-center py-8 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest">
          <Sparkles size={12} /> Institutional Public Directory
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
          EduSphere <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Course Catalog</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto font-medium">
          Explore accredited university programs, core engineering modules, and advanced elective syllabi.
        </p>

        {feedback && (
          <div className={`max-w-md mx-auto p-3.5 rounded-2xl flex items-center gap-3 border text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {feedback.type === 'success' ? <CheckCircle size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by course code or title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
          {departments.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                selectedDept === d ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {d === 'ALL' ? 'All Departments' : d.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium">
            Loading course directory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium">
            No courses found matching your criteria.
          </div>
        ) : (
          filtered.map(c => {
            const isEnrolled = enrolledCourseIds.has(c.id);
            const isEnrolling = enrollingId === c.id;

            return (
              <div key={c.id} className="glass-card-hover p-6 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {c.code}
                    </span>
                    <div className="flex items-center gap-2">
                      {isEnrolled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md text-[9px] font-black uppercase tracking-wider">
                          <CheckCircle size={10} /> Enrolled
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-400">Semester {c.semester}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-white group-hover:text-indigo-300 transition">{c.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium line-clamp-3">{c.description}</p>
                </div>

                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Credits</span>
                      <span className="text-sm font-black text-emerald-400">{c.credits} Credits</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Faculty</span>
                      <span className="text-xs font-bold text-slate-300">{c.faculty_name}</span>
                    </div>
                  </div>

                  {/* Enroll / Continue Action Buttons */}
                  <div className="pt-2">
                    {isEnrolled ? (
                      <button
                        type="button"
                        onClick={() => handleContinue(c)}
                        className="w-full py-2.5 px-4 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <GraduationCap size={16} /> Continue Learning <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(c)}
                        disabled={isEnrolling}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                      >
                        {isEnrolling ? (
                          <>
                            <Loader2 size={15} className="animate-spin" /> Enrolling...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={15} /> Enroll in Course
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PublicCatalog;
