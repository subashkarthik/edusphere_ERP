import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, FileText, Calendar, MessageSquare, ArrowRight, Command, Cpu, Terminal, Zap, Shield } from 'lucide-react';

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
    { id: 'dashboard', title: 'Intelligence Hub Console', type: 'system', meta: 'SYSTEM_DASHBOARD', relevance: 100 },
    { id: 'attendance', title: 'Engagement Analytics', type: 'module', meta: 'TELEMETRY_DATA', relevance: 95 },
    { id: 'academics', title: 'Curriculum Architecture', type: 'course', meta: 'ACADEMIC_LEDGER', relevance: 88 },
    { id: 'exams', title: 'Quantum Assessments', type: 'assignment', meta: 'GRADE_REPORT', relevance: 92 },
    { id: 'timetable', title: 'Institutional Calendar', type: 'system', meta: 'EVENT_STREAM', relevance: 85 },
    { id: 'library', title: 'Neural Assets Library', type: 'discussion', meta: 'KNOWLEDGE_BASE', relevance: 80 },
    { id: 'journey', title: 'Neural Learning Map', type: 'module', meta: 'SKILL_TRAJECTORY', relevance: 98 },
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
      <div className="w-full max-w-2xl glass glass-edge rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-top-10 duration-500" style={{background: 'rgba(10,15,35,0.9)', backdropFilter: 'blur(60px) saturate(200%)'}}>
        
        {/* Command Header */}
        <div className="p-8 border-b border-white/[0.06] flex items-center gap-5 relative">
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
          <div className="p-3 glass rounded-2xl text-indigo-400">
            <Terminal size={24} />
          </div>
          <input 
            autoFocus
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Neural Search Protocol..." 
            className="flex-1 bg-transparent border-none text-xl font-black text-white outline-none placeholder:text-slate-700 tracking-tight"
          />
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 glass rounded-xl border-white/10">
                <span className="text-[10px] font-black text-slate-500">ESC</span>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-rose-500/10 rounded-2xl text-slate-500 hover:text-rose-400 transition-all"><X size={20}/></button>
          </div>
        </div>

        {/* Intelligence Stream */}
        <div className="flex-1 overflow-y-auto max-h-[450px] p-6 space-y-3 custom-scrollbar">
          {results.length > 0 ? results.map((r, i) => (
            <button 
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className="w-full flex items-center gap-5 p-5 rounded-3xl hover:bg-indigo-500/[0.08] transition-all border border-transparent hover:border-indigo-500/20 group text-left animate-in fade-in slide-in-from-left-4 duration-500"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${r.type === 'system' ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'} group-hover:scale-110`}>
                {r.type === 'system' ? <Cpu size={22}/> : r.type === 'course' ? <BookOpen size={22}/> : r.type === 'module' ? <Zap size={22}/> : r.type === 'assignment' ? <Shield size={22}/> : <MessageSquare size={22}/>}
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
               <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">No Neural Matches Found</p>
            </div>
          )}
        </div>

        {/* Footer Protocol */}
        <div className="p-6 border-t border-white/[0.06] flex items-center justify-between" style={{background: 'rgba(255,255,255,0.02)'}}>
           <div className="flex items-center gap-8">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Core Intelligence Online</span>
             </div>
             <div className="hidden md:flex items-center gap-2">
                <span className="p-1 glass rounded text-[9px] font-black text-slate-600">⌘K</span>
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Global Protocol</span>
             </div>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 glass rounded-2xl border-white/5">
              <Zap size={12} className="text-amber-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">V5.0 Neural Engine</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
