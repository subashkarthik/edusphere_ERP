
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot } from 'lucide-react';
import { askCMSAssistant } from '../services/geminiService';
import { UserRole } from '../types';
import { ROLE_THEMES } from '../constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  role: UserRole;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Greetings! I am your EduSphere AI. How may I assist your ${role.toLowerCase()} activities today?` }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = ROLE_THEMES[role] || ROLE_THEMES[UserRole.STUDENT];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    const response = await askCMSAssistant(userMsg, role);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const samplePrompts = {
    [UserRole.STUDENT]: [
      "What is my attendance in Cloud Computing?",
      "When is my next exam?",
      "Suggest some placement tips for Google.",
      "Summarize my GPA progress."
    ],
    [UserRole.FACULTY]: [
      "Show my grading summary for CS8701.",
      "What is my timetable for tomorrow?",
      "Who are the top performers in my class?",
      "Generate a lesson plan for Unit 3."
    ],
    [UserRole.ADMIN]: [
      "Show institutional revenue this month.",
      "What is the current faculty-student ratio?",
      "List all active placement drives.",
      "Generate a system health report."
    ],
  };

  return (
    <div className={`fixed z-[100] transition-all duration-500 ${isOpen ? 'inset-0 md:inset-auto md:bottom-8 md:right-8' : 'bottom-6 right-6 md:bottom-8 md:right-8'}`}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 md:w-16 md:h-16 glass-btn-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <Sparkles size={24} className="animate-pulse" />
        </button>
      ) : (
        <div className="w-full h-full md:w-96 md:h-[650px] glass glass-edge md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" style={{background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(40px) saturate(180%)'}}>
          <div className="p-5 flex items-center justify-between border-b border-white/[0.06] safe-top" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(15,23,42,0.8))'}}>
            <div className="flex items-center gap-3">
              <div className="p-2 glass rounded-xl"><Bot size={22} className="text-indigo-400" /></div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-100">EduSphere AI</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{role} Priority Channel</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5" style={{background: 'rgba(5,8,22,0.6)'}}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed font-medium ${
                  msg.role === 'user' 
                    ? 'glass-btn-primary text-white rounded-tr-none' 
                    : 'glass text-slate-300 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {messages.length === 1 && !loading && (
              <div className="pt-4 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {samplePrompts[role]?.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(prompt); }}
                      className="text-left p-3 glass rounded-xl text-xs font-bold text-slate-400 hover:border-indigo-500/20 hover:text-indigo-400 transition-all active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl rounded-tl-none p-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-white/[0.06] safe-bottom" style={{background: 'rgba(255,255,255,0.02)'}}>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Query ${role.toLowerCase()} portal...`}
                className="flex-1 glass-input rounded-2xl px-5 py-3 text-sm font-bold"
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="glass-btn-primary text-white p-4 rounded-2xl disabled:opacity-50 transition-all active:scale-90"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-tighter mt-4">
              AI model: Gemini 3 Flash • Context-aware institutional assistant
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;