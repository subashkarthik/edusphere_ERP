import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, 
  PlayCircle, Sparkles, GraduationCap, CheckCircle, Search, 
  LayoutGrid, List, AlertCircle, Users, Award, Play
} from 'lucide-react';
import { useApi } from '../hooks';
import { coursesApi, videosApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface ModuleProps { id: string; role: UserRole; }

const COURSE_VIDEOS_DATA: Record<string, any> = {
  'course-cs101': {
    id: 'course-cs101',
    code: 'CS101',
    semesterLabel: 'Semester 1',
    name: 'C Programming Masterclass',
    category: 'Computer Science',
    credits: 4,
    faculty_name: 'Dr. Alan Turing',
    schedule: 'Mon, Wed 10:00 AM',
    description: 'Comprehensive hands-on course in C programming fundamentals, memory pointers, input/output operations, and type conversions.',
    skills: ['C Fundamentals', 'Pointers & Memory', 'Type Conversion', 'System IO'],
    modules: [
      {
        id: 'c-mod-1',
        title: 'C Programming Fundamentals',
        lessons: [
          { id: 'c-l1', title: '1. Getting Started with C Programming', duration: '12:45', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711172/vidssave.com_1__Getting_Started_with_C_Programming_2025___C_Programming_for_Beginners_1080P_p4zh7l.mp4' },
          { id: 'c-l2', title: '2. C Variables and Print Output', duration: '15:30', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711662/vidssave.com_2__C_Variables_and_Print_Output___2025_C_Programming_for_Beginners_1080P_zvbax2.mp4' },
          { id: 'c-l3', title: '3. Get User Input in C Programming', duration: '10:15', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711316/vidssave.com_4__Get_User_Input_in_C_Programming_1080P_k3ca6n.mp4' },
          { id: 'c-l4', title: '4. Type Conversion in C (Implicit & Explicit)', duration: '14:20', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711479/vidssave.com_7__Type_Conversion_in_C___Implicit_and_Explicit_Type_Conversion_1080P_d9tobz.mp4' }
        ]
      }
    ]
  },
  'course-cs201': {
    id: 'course-cs201',
    code: 'CS201',
    semesterLabel: 'Semester 2',
    name: 'Java Programming & OOP Architecture',
    category: 'Computer Science',
    credits: 4,
    faculty_name: 'Dr. Ada Lovelace',
    schedule: 'Tue, Thu 02:00 PM',
    description: 'Core Java, Object-Oriented Programming (OOP) design patterns, JVM internals, bytecode execution, and variable data types.',
    skills: ['Java Core', 'JVM & Bytecode', 'OOP Patterns', 'Data Types'],
    modules: [
      {
        id: 'java-mod-1',
        title: 'Java Core & Object Oriented Programming',
        lessons: [
          { id: 'java-l1', title: '1. Java Development Kit (JDK) Setup', duration: '08:50', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711546/vidssave.com_2_Java_Development_Kit_JDK_Setup_1080P_lzfrg0.mp4' },
          { id: 'java-l2', title: '2. First Code in Java', duration: '11:10', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711745/vidssave.com_3_First_Code_in_Java_1080P_u6v7fr.mp4' },
          { id: 'java-l3', title: '3. How Java Works (JVM, JRE & Bytecode)', duration: '13:40', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711883/vidssave.com_4_How_Java_Works_1080P_eril9s.mp4' },
          { id: 'java-l4', title: '4. Variables & Data Types in Java', duration: '16:05', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785712079/vidssave.com_5_Variables_in_Java_1080P_ugfhwt.mp4' }
        ]
      }
    ]
  }
};

const DEFAULT_COURSES_LIST = Object.values(COURSE_VIDEOS_DATA);

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

  // Fetch courses from backend or fallback to the two hero courses
  const fetcher = role === UserRole.STUDENT 
    ? (activeTab === 'catalog' ? () => coursesApi.list(true) : () => coursesApi.myEnrollments())
    : () => coursesApi.list();

  const { data: rawCourses, loading, refetch } = useApi(fetcher, DEFAULT_COURSES_LIST, [role, activeTab], `subjects-${role}-${activeTab}`);

  // Merge backend courses with video lessons
  const courses = (rawCourses && rawCourses.length > 0 ? rawCourses : DEFAULT_COURSES_LIST).map((c: any) => {
    const videoRef = COURSE_VIDEOS_DATA[c.id] || (c.code?.includes('201') ? COURSE_VIDEOS_DATA['course-cs201'] : COURSE_VIDEOS_DATA['course-cs101']);
    return {
      ...videoRef,
      ...c,
      modules: videoRef?.modules || c.modules || [],
      skills: videoRef?.skills || ['Software Engineering', 'Algorithms']
    };
  });

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
    const videoRef = COURSE_VIDEOS_DATA[course.id] || (course.code?.includes('201') ? COURSE_VIDEOS_DATA['course-cs201'] : COURSE_VIDEOS_DATA['course-cs101']);
    window.dispatchEvent(new CustomEvent('universe-navigate', { 
      detail: { 
        tab: 'workspace', 
        courseData: {
          id: course.id,
          title: `${course.name} - Video Lecture Series`,
          activeLessonIndex: lessonIndex,
          modules: videoRef.modules
        }
      } 
    }));
  };

  const filteredCourses = courses.filter((c: any) => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !courses) return <FullPageLoader />;

  // Detailed Course View with Video Lessons Stream
  if (selectedCourse) {
    const videoRef = COURSE_VIDEOS_DATA[selectedCourse.id] || (selectedCourse.code?.includes('201') ? COURSE_VIDEOS_DATA['course-cs201'] : COURSE_VIDEOS_DATA['course-cs101']);
    const lessonsList = videoRef.modules?.[0]?.lessons || [];

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
                    {selectedCourse.code} • {videoRef.semesterLabel || 'Semester Core'}
                  </span>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                    {selectedCourse.credits || 4} Credits
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{selectedCourse.name}</h1>
                <p className="text-xs text-slate-400 font-medium mt-1 max-w-2xl leading-relaxed">
                  {selectedCourse.description || videoRef.description}
                </p>
              </div>
            </div>

            <button 
              onClick={() => handleLaunchVideoPlayer(selectedCourse, 0)}
              className="glass-btn-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all w-full lg:w-auto justify-center"
            >
              <PlayCircle size={18} /> Watch Video Lectures
            </button>
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
                    <PlayCircle className="text-indigo-400" size={22} /> Structured Video Lessons ({lessonsList.length} Lectures)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Watch all video lessons to complete 100% course progress for certificate eligibility.
                  </p>
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                  Cloud Stream Ready
                </span>
              </div>

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
                        <span className="flex items-center gap-1"><Clock size={11} /> {lesson.duration}</span>
                        <span>•</span>
                        <span className="text-indigo-400">High Definition 1080P</span>
                      </div>
                    </div>

                    <button className="px-4 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right Sidebar: Faculty & Course Intel */}
          <div className="space-y-6">
            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Users size={18} className="text-indigo-400" /> Course Faculty
              </h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-indigo-400 font-black text-lg bg-indigo-500/10 border border-indigo-500/20">
                  {selectedCourse.faculty_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'FA'}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{selectedCourse.faculty_name || 'Dr. Alan Turing'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Professor of Computing</p>
                  <p className="text-[10px] text-indigo-400 font-medium mt-1">{selectedCourse.schedule || 'Regular Lectures'}</p>
                </div>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[11px] text-slate-300 leading-relaxed">
                Lectures, quizzes, and assignments for this course are directly tied to your academic transcript and automated certificate issuance.
              </div>
            </GlassCard>

            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Award size={18} className="text-amber-400" /> Certification Requirements
              </h3>
              <ul className="space-y-3 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Attendance: <strong>≥ 75%</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Assessment Score: <strong>≥ 50%</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Course Progress: <strong>100%</strong> (All 4 Videos)</span>
                </li>
              </ul>
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
            Academic Curricula &amp; Video Streams
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {role === UserRole.STUDENT 
              ? (activeTab === 'catalog' ? 'Course Catalog & Self-Enrollment' : 'My Enrolled Courses')
              : 'Institutional Courses'}
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Official semester curricula featuring complete video lectures, quizzes, and certification streams.
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

      {/* Course Cards */}
      <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "space-y-4"}>
        {filteredCourses.map((c: any) => {
          const videoRef = COURSE_VIDEOS_DATA[c.id] || (c.code?.includes('201') ? COURSE_VIDEOS_DATA['course-cs201'] : COURSE_VIDEOS_DATA['course-cs101']);
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
                      {videoRef.semesterLabel || 'Semester Core'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{c.credits || 4} Credits</span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  {c.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-2 line-clamp-2 leading-relaxed">
                  {c.description || videoRef.description}
                </p>

                {/* Skills Badges */}
                <div className="flex flex-wrap gap-2 my-5">
                  {(videoRef.skills || ['Computer Science']).map((s: string) => (
                    <span key={s} className="px-2.5 py-1 glass text-slate-300 text-[9px] font-black uppercase tracking-wider rounded-md">
                      {s}
                    </span>
                  ))}
                </div>

                {/* Video Lessons Summary */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <PlayCircle size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{videoRef.modules?.[0]?.lessons?.length || 4} Video Lectures</p>
                      <p className="text-[10px] text-slate-400 font-medium">Cloudinary 1080P Streams</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Instructor: {c.faculty_name}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => handleLaunchVideoPlayer(c, 0)}
                  className="flex-1 glass-btn-primary text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  <PlayCircle size={16} /> Watch Lectures
                </button>
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
    </div>
  );
};

export default SubjectsModule;
