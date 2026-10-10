import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, FileText, ArrowRight, Command, LayoutDashboard, Shield, Award, CheckCircle, FileCheck2, Settings } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  type: 'course' | 'module' | 'assignment' | 'discussion' | 'system';
  meta: string;
  relevance?: number;
}

const GlobalSearch: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const allResults: SearchResult[] = [
    { id: 'dashboard', title: 'Dashboard', type: 'system', meta: 'OVERVIEW', relevance: 100 },
    { id: 'academics', title: 'Courses & Curriculum', type: 'course', meta: 'ENROLLMENT', relevance: 98 },
    { id: 'attendance', title: 'Attendance Ledger', type: 'module', meta: 'ATTENDANCE', relevance: 95 },
    { id: 'exams', title: 'Quizzes & Assessments', type: 'assignment', meta: 'ASSESSMENTS', relevance: 92 },
    { id: 'assignments', title: 'Assignments', type: 'assignment', meta: 'SUBMISSIONS', relevance: 90 },
    { id: 'certificates', title: 'Certificates & Credentials', type: 'course', meta: 'CERTIFICATION', relevance: 88 },
    { id: 'settings', title: 'Account Settings', type: 'system', meta: 'PREFERENCES', relevance: 85 },
  ];

  const results = allResults.filter(r => 
    r.title.toLowerCase().includes(query.toLowerCase()) || 
    r.meta.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (id: string) => {
    window.dispatchEvent(new CustomEvent('universe-navigate', { detail: { tab: id } }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="w-full max-w-2xl glass glass-edge rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-top-10 duration-500" style={{background: 'rgba(10,15,35,0.95)', backdropFilter: 'blur(60px) saturate(200%)'}}>
        
        {/* Command Header */}
        <div className="p-8 border-b border-white/[0.06] flex items-center gap-5 relative">
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
          <div className="p-3 glass rounded-2xl text-indigo-400">
            <Search size={24} />
          </div>
          <input 
            autoFocus
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, attendance, quizzes, certs..." 
            className="flex-1 bg-transparent border-none text-xl font-black text-white outline-none placeholder:text-slate-600 tracking-tight"
          />
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl border-white/10">
                <span className="text-[10px] font-black text-slate-500">ESC</span>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-rose-500/10 rounded-2xl text-slate-500 hover:text-rose-400 transition-all"><X size={20}/></button>
          </div>
        </div>

        {/* Search Results Stream */}
        <div className="flex-1 overflow-y-auto max-h-[450px] p-6 space-y-3 custom-scrollbar">
          {results.length > 0 ? results.map((r, i) => (
            <button 
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className="w-full flex items-center gap-5 p-5 rounded-3xl hover:bg-indigo-500/[0.08] transition-all border border-transparent hover:border-indigo-500/20 group text-left animate-in fade-in slide-in-from-left-4 duration-500"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-indigo-500/15 text-indigo-400 group-hover:scale-110`}>
                {r.id === 'dashboard' ? <LayoutDashboard size={22}/> : r.id === 'academics' ? <BookOpen size={22}/> : r.id === 'attendance' ? <CheckCircle size={22}/> : r.id === 'certificates' ? <Award size={22}/> : r.id === 'settings' ? <Settings size={22}/> : <FileCheck2 size={22}/>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                   <h4 className="text-base font-black text-slate-100 group-hover:text-white transition-colors tracking-tight">{r.title}</h4>
                   <span className="text-[8px] font-black px-1.5 py-0.5 glass rounded-md text-slate-500 uppercase tracking-widest">{r.relevance}% Match</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                   <span className="w-1 h-1 bg-indigo-500/50 rounded-full"></span>
                   {r.meta}
                </p>
              </div>
              <div className="w-10 h-10 glass rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                 <ArrowRight size={18} className="text-indigo-400" />
              </div>
            </button>
          )) : (
            <div className="py-20 text-center space-y-4">
               <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto text-slate-700">
                  <Search size={32}/>
               </div>
               <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">No Matching Navigation Found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/[0.06] flex items-center justify-between" style={{background: 'rgba(255,255,255,0.02)'}}>
           <div className="flex items-center gap-8">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">EduSphere LMS</span>
             </div>
             <div className="hidden md:flex items-center gap-2">
                <span className="p-1 glass rounded text-[9px] font-black text-slate-600">⌘K</span>
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Navigation Shortcut</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
