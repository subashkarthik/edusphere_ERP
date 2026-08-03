import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
  CheckCircle2, Circle, Clock, Award, 
  Download, QrCode, ExternalLink, 
  ShieldCheck, BrainCircuit, Zap, BarChart3, Star, Loader2,
  Network, Share2, Map, Layers, Target, ArrowRight
} from 'lucide-react';
import { ROLE_THEMES } from '../constants';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useApi } from '../hooks';
import { videosApi } from '../services/api';
import GlassCard from '../components/GlassCard';

const fallbackJourney = [
  {
    id: 'cat1', title: 'Semester 1: C Programming Masterclass',
    courses: [
      {
        id: 'c1',
        title: 'C Programming Fundamentals',
        lessons: [
          { id: 'c-l1', title: '1. Getting Started with C Programming', duration: '12:45', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711172/vidssave.com_1__Getting_Started_with_C_Programming_2025___C_Programming_for_Beginners_1080P_p4zh7l.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711172/vidssave.com_1__Getting_Started_with_C_Programming_2025___C_Programming_for_Beginners_1080P_p4zh7l.mp4' },
          { id: 'c-l2', title: '2. C Variables and Print Output', duration: '15:30', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711662/vidssave.com_2__C_Variables_and_Print_Output___2025_C_Programming_for_Beginners_1080P_zvbax2.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711662/vidssave.com_2__C_Variables_and_Print_Output___2025_C_Programming_for_Beginners_1080P_zvbax2.mp4' },
          { id: 'c-l3', title: '3. Get User Input in C Programming', duration: '10:15', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711316/vidssave.com_4__Get_User_Input_in_C_Programming_1080P_k3ca6n.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711316/vidssave.com_4__Get_User_Input_in_C_Programming_1080P_k3ca6n.mp4' },
          { id: 'c-l4', title: '4. Type Conversion in C (Implicit & Explicit)', duration: '14:20', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711479/vidssave.com_7__Type_Conversion_in_C___Implicit_and_Explicit_Type_Conversion_1080P_d9tobz.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711479/vidssave.com_7__Type_Conversion_in_C___Implicit_and_Explicit_Type_Conversion_1080P_d9tobz.mp4' }
        ]
      }
    ]
  },
  {
    id: 'cat2', title: 'Semester 2: Java Programming & OOP Architecture',
    courses: [
      {
        id: 'c2',
        title: 'Java Core & Object Oriented Programming',
        lessons: [
          { id: 'java-l1', title: '1. Java Development Kit (JDK) Setup', duration: '08:50', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711546/vidssave.com_2_Java_Development_Kit_JDK_Setup_1080P_lzfrg0.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711546/vidssave.com_2_Java_Development_Kit_JDK_Setup_1080P_lzfrg0.mp4' },
          { id: 'java-l2', title: '2. First Code in Java', duration: '11:10', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711745/vidssave.com_3_First_Code_in_Java_1080P_u6v7fr.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711745/vidssave.com_3_First_Code_in_Java_1080P_u6v7fr.mp4' },
          { id: 'java-l3', title: '3. How Java Works (JVM, JRE & Bytecode)', duration: '13:40', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711883/vidssave.com_4_How_Java_Works_1080P_eril9s.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785711883/vidssave.com_4_How_Java_Works_1080P_eril9s.mp4' },
          { id: 'java-l4', title: '4. Variables & Data Types in Java', duration: '16:05', type: 'video', contentUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785712079/vidssave.com_5_Variables_in_Java_1080P_ugfhwt.mp4', videoUrl: 'https://res.cloudinary.com/ducisa7vu/video/upload/v1785712079/vidssave.com_5_Variables_in_Java_1080P_ugfhwt.mp4' }
        ]
      }
    ]
  }
];

const NeuralMap: React.FC<{ milestones: any[], onSelectCourse: (c: any) => void }> = ({ milestones, onSelectCourse }) => {
  return (
    <div className="relative w-full aspect-square md:aspect-video glass rounded-[3rem] p-10 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-white/10 rounded-full"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] border border-white/5 rounded-full"></div>
      </div>
      
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <defs>
          <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0)" />
            <stop offset="50%" stopColor="rgba(99, 102, 241, 0.4)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
          </linearGradient>
        </defs>
        {/* We can dynamically draw lines here in a real graph, for now a stylized representation */}
        <path d="M 100 200 Q 400 100 700 200" stroke="url(#linkGrad)" strokeWidth="2" fill="none" className="animate-pulse" />
        <path d="M 100 400 Q 400 500 700 400" stroke="url(#linkGrad)" strokeWidth="2" fill="none" className="animate-pulse delay-700" />
      </svg>

      <div className="relative z-10 flex flex-wrap justify-center gap-10">
        {milestones.map((m, i) => (
          <div key={m.id} className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className={`w-20 h-20 rounded-[2rem] glass-edge flex items-center justify-center transition-all duration-500 cursor-pointer hover:scale-110 active:scale-95 ${m.status === 'COMPLETED' ? 'bg-emerald-500/10 border-emerald-500/40' : m.status === 'IN_PROGRESS' ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white/5'}`}>
                 <Layers size={32} className={m.status === 'COMPLETED' ? 'text-emerald-400' : m.status === 'IN_PROGRESS' ? 'text-indigo-400' : 'text-slate-600'} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-100 uppercase tracking-widest">{m.title.split(':')[0]}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Status: {m.status}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="absolute bottom-8 left-8 flex items-center gap-2">
         <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantum Neural Sync Active</span>
      </div>
    </div>
  );
};

const LearningJourney: React.FC = () => {
  const { data: journeyData, loading } = useApi(() => videosApi.journey(), fallbackJourney, [], 'journey-data');
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'neural'>('timeline');

  const handleVideoClick = (category: any, course: any, lessonIndex: number) => {
    window.dispatchEvent(new CustomEvent('universe-navigate', { 
      detail: { 
        tab: 'workspace', 
        courseData: {
          id: course.id,
          title: `${category.title} - ${course.title}`,
          activeLessonIndex: lessonIndex,
          modules: [{ id: 'm1', title: course.title, lessons: course.lessons }]
        }
      } 
    }));
  };

  const milestones = (journeyData || []).map((category: any, index: number) => {
    let sumProgress = 0;
    const totalCourses = category.courses?.length || 1;
    category.courses?.forEach((c: any) => {
      const saved = localStorage.getItem(`course_progress_${c.id}`);
      if (saved) sumProgress += parseInt(saved, 10);
    });
    const categoryProgress = sumProgress > 0 ? Math.round(sumProgress / totalCourses) : (index === 0 ? 45 : 0);
    const isActive = index === 0 || categoryProgress > 0;
    return {
      id: category.id, title: category.title,
      status: categoryProgress >= 100 ? 'COMPLETED' : (isActive ? 'IN_PROGRESS' : 'UPCOMING'),
      date: 'Institutional Track', courses: category.courses, progress: categoryProgress,
      credits: (category.courses?.length || 0) * 4, categoryRef: category
    };
  });

  const certificates = [
    { id: 'CERT-8812-X', title: 'Data Structures & System Design', issued: 'Jan 2025', authority: 'EduSphere Academic Board' },
    { id: 'CERT-9904-B', title: 'Professional Web Architecture', issued: 'Feb 2025', authority: 'Cloud Engineering Dept' },
  ];

  const skillData = [
    { subject: 'Algorithms', A: 90, fullMark: 100 },
    { subject: 'System Design', A: 75, fullMark: 100 },
    { subject: 'Cloud Arch', A: 85, fullMark: 100 },
    { subject: 'Database', A: 95, fullMark: 100 },
    { subject: 'Security', A: 70, fullMark: 100 },
    { subject: 'UI/UX', A: 60, fullMark: 100 },
  ];

  const renderLevel1 = () => (
    <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
             <Target size={24}/>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100 tracking-tight">Academic Execution</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Quantum Ledger v5.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 glass rounded-2xl">
          <button 
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'timeline' ? 'glass-btn-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Timeline
          </button>
          <button 
            onClick={() => setViewMode('neural')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'neural' ? 'glass-btn-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Neural Map
          </button>
        </div>
      </div>

      {viewMode === 'neural' ? (
        <NeuralMap milestones={milestones} onSelectCourse={(c) => {}} />
      ) : (
        <div className="relative ml-4">
          <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-white/[0.06]"></div>
          <div className="space-y-12">
            {milestones.map((m) => (
              <div key={m.id} className="relative flex gap-10 group cursor-pointer" onClick={() => setSelectedCategory(m)}>
                <div className={`z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2 border-white/10 ${
                  m.status === 'COMPLETED' ? 'bg-emerald-500/80 text-white shadow-[0_0_12px_rgba(52,211,153,0.4)]' : 
                  m.status === 'IN_PROGRESS' ? 'bg-indigo-500/80 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 
                  'glass text-slate-500'
                }`}>
                  {m.status === 'COMPLETED' ? <CheckCircle2 size={18}/> : m.status === 'IN_PROGRESS' ? <Zap size={18} className="animate-pulse" /> : <Circle size={14}/>}
                </div>

                <div className="flex-1 transition-all group-hover:translate-x-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className={`font-black text-base ${m.status === 'UPCOMING' ? 'text-slate-500' : 'text-slate-100'} group-hover:text-indigo-400 transition-colors`}>{m.title}</h4>
                        {m.status === 'COMPLETED' && <Star size={14} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{m.date} • {m.credits} Units</p>
                    </div>
                    <div className="px-3 py-1 glass text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                      View Subtopics
                    </div>
                  </div>

                  {/* Progress Bar - Hidden by default, smoothly expands & displays on HOVER */}
                  <div className="max-h-0 opacity-0 group-hover:max-h-28 group-hover:opacity-100 transition-all duration-500 ease-in-out overflow-hidden mt-1 pointer-events-none">
                    <div className="glass p-4 rounded-2xl max-w-md border-white/10 group-hover:border-indigo-500/30 transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Learning Progress</span>
                        <span className="text-xs font-black text-indigo-400">{m.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full progress-glow transition-all duration-500" style={{ width: `${m.progress}%`, color: '#818cf8' }}></div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );

  const renderLevel2 = () => (
    <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
      <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 text-[10px] font-black uppercase tracking-widest">
        &larr; Back to Timeline
      </button>
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-indigo-400">
           <Layers size={24}/>
        </div>
        <div>
           <h3 className="text-xl font-black text-slate-100 tracking-tight">{selectedCategory.title}</h3>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Institutional Curriculum Ledger</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedCategory.courses.map((course: any) => (
          <div 
            key={course.id} 
            onClick={() => setSelectedCourse(course)}
            className="p-6 rounded-[2rem] glass border border-white/[0.06] hover:border-indigo-500/20 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                <BrainCircuit size={20}/>
              </div>
              <div className="px-2 py-1 glass rounded-lg text-[8px] font-black text-indigo-400 uppercase tracking-widest">Core Engineering</div>
            </div>
            <h4 className="font-bold text-slate-200 mb-2 group-hover:text-white transition-colors">{course.title}</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">{course.lessons.length} Modules • Accredited</p>
            <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-widest">
              Access Assets <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );

  const renderLevel3 = () => (
    <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
      <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 text-[10px] font-black uppercase tracking-widest">
        &larr; Back to {selectedCategory.title}
      </button>
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-indigo-400">
           <Network size={24}/>
        </div>
        <div>
           <h3 className="text-xl font-black text-slate-100 tracking-tight">{selectedCourse.title}</h3>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Active Learning Workspace</p>
        </div>
      </div>
      <div className="space-y-4">
        {selectedCourse.lessons.map((lesson: any, idx: number) => (
          <div 
            key={idx} 
            onClick={() => handleVideoClick(selectedCategory, selectedCourse, idx)}
            className="p-5 rounded-2xl glass border border-white/[0.06] hover:border-indigo-500/20 transition-all group cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                <Zap size={18}/>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">{lesson.title}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{lesson.duration} • Video Lesson</p>
              </div>
            </div>
            <div className="w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
               <ArrowRight size={16} className="text-indigo-400" />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {selectedCourse ? renderLevel3() : (selectedCategory ? renderLevel2() : renderLevel1())}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
                <h3 className="font-bold text-slate-100 mb-8 flex items-center gap-3"><Award className="text-indigo-400" size={20}/> Certified Credentials</h3>
                <div className="space-y-4">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="p-5 rounded-2xl glass border border-white/[0.06] group cursor-pointer hover:border-indigo-500/20 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <QrCode size={32} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{cert.id}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-200 leading-tight group-hover:text-white transition-colors">{cert.title}</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">{cert.issued} • {cert.authority}</p>
                    </div>
                  ))}
                </div>
             </GlassCard>

             <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
                <h3 className="font-bold text-slate-100 mb-8 flex items-center gap-3"><ShieldCheck className="text-emerald-400" size={20}/> Institutional Access</h3>
                <div className="p-6 rounded-[2rem] glass border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-16 h-16 glass rounded-full flex items-center justify-center text-slate-600">
                      <ExternalLink size={24}/>
                   </div>
                   <div>
                      <p className="text-xs font-bold text-slate-300">Request Degree Audit</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Requires Dean's Approval</p>
                   </div>
                   <button className="w-full py-3 glass rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Apply for Access</button>
                </div>
             </GlassCard>
          </div>
        </div>

        <div className="space-y-8">
          <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-3">
                <BrainCircuit className="text-indigo-400" size={20}/>
                Skill Pulse
              </h3>
              <div className="p-2 glass rounded-lg text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer">
                <Share2 size={16}/>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Proficiency"
                    dataKey="A"
                    stroke="#818cf8"
                    fill="#818cf8"
                    fillOpacity={0.4}
                    strokeWidth={3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-3">
               <div className="p-4 rounded-2xl glass border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Theoretical IQ</span>
                  </div>
                  <span className="text-xs font-black text-slate-100">88%</span>
               </div>
               <div className="p-4 rounded-2xl glass border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Execution Velocity</span>
                  </div>
                  <span className="text-xs font-black text-slate-100">74%</span>
               </div>
            </div>
          </GlassCard>

          <div className="glass glass-edge p-8 rounded-[2.5rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(15,23,42,0.8))'}}>
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
             <div className="flex items-center gap-3 mb-6">
                <Star size={24} className="text-amber-400 fill-amber-400"/>
                <h4 className="font-bold text-sm text-slate-100 uppercase tracking-widest">Elite Status</h4>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed font-medium mb-6">You are in the top 5% of your cohort. Maintain this velocity to unlock Executive Placement assets.</p>
             <button className="w-full py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest">View Elite Perks</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningJourney;
