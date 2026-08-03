import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Volume2, Settings, Maximize, List,
  MessageSquare, BookOpen, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, Download, ThumbsUp, HelpCircle,
  X, LayoutList, Lock, Send
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import VideoPlayer from '../components/VideoPlayer';
import { useSocket } from '../hooks/useSocket';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'document' | 'quiz';
  videoUrl?: string;
  contentUrl?: string;
}


interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface LearningWorkspaceProps {
  courseData: {
    id: string;
    title: string;
    activeLessonIndex?: number;
    modules: Module[];
  };
  onBack?: () => void;
}

const LearningWorkspace: React.FC<LearningWorkspaceProps> = ({ courseData, onBack }) => {
  const [activeModule, setActiveModule] = useState(0);
  const [activeLesson, setActiveLesson] = useState(courseData.activeLessonIndex || 0);
  const [activeTab, setActiveTab] = useState<'content' | 'discussion' | 'notes'>('content');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  
  // Real-time Intelligence
  const userId = localStorage.getItem('user_id') || 'student_1';
  const { pulse, messages, send: sendSocket } = useSocket(userId);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentLesson = courseData.modules[activeModule].lessons[activeLesson];
  const courseTitle = courseData.title;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    sendSocket({
      type: 'CLASS_CHAT',
      user: 'Student', // In a real app, this would be from Auth
      text: newMessage,
      timestamp: new Date().toISOString()
    });
    setNewMessage('');
  };

  // Record progress when video passes 80%
  const handleVideoProgress = async (percentage: number) => {
    if (percentage > 80 && currentLesson?.id) {
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/videos/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ lesson_id: currentLesson.id, completed: true })
        });
      } catch (err) {
        console.error("Progress record error:", err);
      }
    }
  };

  const videoSource = currentLesson?.contentUrl || currentLesson?.videoUrl || "https://res.cloudinary.com/ducisa7vu/video/upload/v1785711172/vidssave.com_1__Getting_Started_with_C_Programming_2025___C_Programming_for_Beginners_1080P_p4zh7l.mp4";

  return (
    <div className="fixed inset-0 top-16 lg:left-64 flex overflow-hidden bg-[#050816] animate-in fade-in duration-700">
      {/* Sidebar - Course Structure */}
      <aside className={`
        ${isSidebarOpen ? 'w-80' : 'w-0'} 
        glass border-r border-white/[0.06] transition-all duration-500 overflow-hidden flex flex-col z-30
      `}>
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            {onBack && (
              <button 
                onClick={onBack}
                className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest mb-3 transition-colors active:scale-95 duration-200"
              >
                <ChevronLeft size={12}/> Back to Journey
              </button>
            )}
            <h1 className="text-sm font-black text-slate-100 tracking-tight leading-none mb-1">{courseTitle}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentLesson?.title}</p>
          </div>
        </div>
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex justify-between items-center mb-2 px-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
            <span className="text-xs font-black text-indigo-400">Active Learning</span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 progress-glow transition-all duration-500 w-full" style={{color: '#818cf8'}}></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {courseData.modules.map((m, mIdx) => (
            <div key={m.id} className="space-y-2">
              <h3 className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">{m.title}</h3>
              <div className="space-y-1">
                {m.lessons.map((l, lIdx) => (
                  <button
                    key={l.id}
                    onClick={() => { setActiveModule(mIdx); setActiveLesson(lIdx); }}
                    className={`
                      w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group
                      ${activeModule === mIdx && activeLesson === lIdx 
                        ? 'glass-btn-primary text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'}
                    `}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      activeModule === mIdx && activeLesson === lIdx ? 'bg-white/20 border-white/20' : 'glass border-white/[0.06]'
                    }`}>
                      {l.type === 'video' ? <Play size={14}/> : <BookOpen size={14}/>}
                    </div>
                    <div className="flex-1 overflow-hidden text-left">
                      <p className={`text-xs font-bold truncate ${activeModule === mIdx && activeLesson === lIdx ? 'text-white' : 'text-slate-300'}`}>{l.title}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">{l.duration} • {l.type.toUpperCase()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="p-4 flex items-center gap-4 glass-header lg:hidden">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 glass rounded-lg text-slate-400"><List size={18}/></button>
          <h2 className="text-xs font-black text-slate-100 uppercase tracking-widest truncate">{currentLesson.title}</h2>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative aspect-video bg-black/40 group">
            {currentLesson.type === 'video' ? (
              <VideoPlayer 
                src={videoSource}
                title={currentLesson.title}
                onProgress={handleVideoProgress}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="text-center animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 glass rounded-full flex items-center justify-center mx-auto mb-8 text-indigo-400 shadow-xl shadow-indigo-500/10">
                    <BookOpen size={48}/>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight mb-4">{currentLesson.title}</h2>
                  <p className="text-slate-400 max-w-md mb-8 text-sm font-medium">This module contains reading materials and institutional documentation for offline review.</p>
                  <button className="px-8 py-4 glass-btn-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 active:scale-95 transition-all">
                    <Download size={18}/> Access Document
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="glass glass-edge mx-8 mt-8 mb-8 p-6 flex items-center justify-between rounded-[2rem]">
            <div className="flex items-center gap-8">
               <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-all"><ThumbsUp size={16}/> 142 Likes</button>
               <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-all"><HelpCircle size={16}/> Doubt Help</button>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveLesson(prev => Math.max(0, prev - 1))}
                className="px-6 py-2.5 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-2"
              >
                <ChevronLeft size={16}/> Prev
              </button>
              <button 
                onClick={() => setActiveLesson(prev => Math.min(courseData.modules[activeModule].lessons.length - 1, prev + 1))}
                className="px-6 py-2.5 glass-btn-primary rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
              >
                Next <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Real-Time Context Sidebar */}
      <aside className="w-96 glass border-l border-white/[0.06] hidden xl:flex flex-col overflow-hidden">
        <div className="flex border-b border-white/[0.04]">
          {['content', 'discussion', 'notes'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-5 text-[9px] font-black uppercase tracking-[0.2em] transition-all relative ${
                activeTab === tab ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col">
          {activeTab === 'discussion' ? (
            <>
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h4 className="font-black text-slate-100 text-[10px] uppercase tracking-widest">Real-Time Chat</h4>
                <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[8px] font-black">
                   <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></div>
                   {pulse.active_users} WATCHING
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-2">
                {messages.filter(m => m.type === 'CLASS_CHAT').map((m, i) => (
                  <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-indigo-400 uppercase">{m.user}</span>
                      <span className="text-[8px] text-slate-600 font-bold">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="glass p-3 rounded-2xl rounded-tl-none border-white/5 text-xs text-slate-300 leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 glass border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all"
                />
                <button type="submit" className="p-2.5 glass-btn-primary text-white rounded-xl active:scale-95 transition-all">
                  <Send size={16}/>
                </button>
              </form>
            </>
          ) : activeTab === 'notes' ? (
             <div className="space-y-6">
                <div className="p-6 rounded-[2rem] glass border border-white/[0.06] flex flex-col items-center justify-center text-center space-y-4 py-12">
                   <div className="w-16 h-16 glass rounded-full flex items-center justify-center text-slate-700 border-white/10"><Lock size={24}/></div>
                   <div>
                     <p className="text-[10px] font-black text-slate-100 uppercase tracking-widest mb-1">Private Session Notes</p>
                     <p className="text-[10px] text-slate-500 font-bold">Only you can see these notes.</p>
                   </div>
                   <button className="px-6 py-2.5 glass-btn text-xs font-black uppercase tracking-widest text-slate-300 rounded-xl">Create Note</button>
                </div>
             </div>
          ) : (
            <div className="space-y-6">
              <h4 className="font-black text-slate-100 text-[10px] uppercase tracking-widest">Lesson Intelligence</h4>
              <div className="p-6 rounded-[2rem] glass border border-white/[0.06] space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      <p className="text-xs text-slate-300 font-medium">Core concept overview</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      <p className="text-xs text-slate-300 font-medium">Key technical definitions</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      <p className="text-xs text-slate-300 font-medium">Institutional guidelines</p>
                   </div>
                </div>
                <button className="w-full py-4 glass text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white rounded-2xl transition-all">Download PDF Summary</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default LearningWorkspace;
