
import React, { useState } from 'react';
import { UserRole } from '../types';
import { ROLE_THEMES } from '../constants';
import { Megaphone, Pin, Plus, Clock, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApi } from '../hooks';
import { announcementsApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface AnnouncementsViewProps { role: UserRole; }

const priorityStyles: Record<string, string> = {
  HIGH: 'badge-rose',
  MEDIUM: 'badge-amber',
  LOW: 'badge-emerald',
};

const fallbackAnnouncements = [
  { id: '1', title: 'Semester 7 Internal Exam Schedule Released', content: 'Internal Assessment II for all departments will commence from October 24, 2024. Students are advised to check the exam portal for detailed schedules and venue allotments.', author_name: 'Institutional Admin', priority: 'HIGH', is_pinned: true, published_at: '2024-10-12T10:00:00', target_roles: 'ADMIN,FACULTY,STUDENT' },
  { id: '2', title: 'Cloud Computing Lab — Submission Deadline Extended', content: 'The deadline for Lab Assignment 4 (Docker & Kubernetes) has been extended to October 18, 2024. Submit via the EduSphere portal.', author_name: 'Dr. Arun Kumar', priority: 'MEDIUM', is_pinned: false, published_at: '2024-10-10T14:30:00', target_roles: 'STUDENT' },
  { id: '3', title: 'Annual Sports Day Registration Open', content: 'Registrations for the Annual Sports Day 2024 are now open. Students can sign up for individual and team events through the Student Affairs office or the EduSphere app.', author_name: 'Student Affairs', priority: 'LOW', is_pinned: false, published_at: '2024-10-08T09:00:00', target_roles: 'STUDENT,FACULTY' },
  { id: '4', title: 'Faculty Development Program — AI in Education', content: 'A 3-day FDP on "Leveraging AI for Personalized Learning" will be conducted from November 1-3. All faculty members are encouraged to register.', author_name: 'Institutional Admin', priority: 'MEDIUM', is_pinned: true, published_at: '2024-10-05T11:00:00', target_roles: 'FACULTY' },
];

const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ role }) => {
  const theme = ROLE_THEMES[role] || ROLE_THEMES[UserRole.STUDENT];
  const canCreate = role === UserRole.ADMIN || role === UserRole.FACULTY;
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: announcements, loading, refetch } = useApi(() => announcementsApi.list(), fallbackAnnouncements, [role]);

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSubmitLoading(true);
    try {
      await announcementsApi.create({ title: formTitle, content: formContent, priority: formPriority });
      setSubmitSuccess(true);
      setFormTitle('');
      setFormContent('');
      setTimeout(() => { setSubmitSuccess(false); setShowForm(false); refetch(); }, 1500);
    } catch (err) {
      console.error('Failed to create announcement:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <FullPageLoader />;

  const pinned = (announcements || []).filter((a: any) => a.is_pinned);
  const regular = (announcements || []).filter((a: any) => !a.is_pinned);

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Notice Board</h2>
          <p className="text-slate-500 text-sm font-medium">Institutional announcements and circulars.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="glass-btn-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={16} /> New Notice
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <GlassCard className="p-8 rounded-[2rem]" hover={false}>
          <h3 className="font-black text-lg text-slate-100 mb-6 tracking-tight">Publish Announcement</h3>
          <div className="space-y-4">
            <input
              type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Announcement Title"
              className="w-full glass-input rounded-2xl px-6 py-4 text-sm font-bold"
            />
            <textarea
              value={formContent} onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write the announcement content..." rows={4}
              className="w-full glass-input rounded-2xl px-6 py-4 text-sm font-medium resize-none"
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex glass p-1 rounded-xl">
                {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                  <button
                    key={p} onClick={() => setFormPriority(p)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formPriority === p ? 'glass-btn-primary text-white' : 'text-slate-500'}`}
                  >{p}</button>
                ))}
              </div>
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setShowForm(false)} className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-200">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitLoading || !formTitle.trim() || !formContent.trim()}
                  className="glass-btn-primary text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {submitSuccess ? <><CheckCircle2 size={16} /> Published!</> : submitLoading ? 'Publishing...' : <><Send size={16} /> Publish</>}
                </button>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {pinned.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
            <Pin size={12} /> Pinned
          </h3>
          {pinned.map((a: any) => {
            const pStyle = priorityStyles[a.priority] || priorityStyles.MEDIUM;
            return (
              <div key={a.id} className="glass glass-edge p-8 rounded-[2rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(255,255,255,0.05))'}}>
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500"></div>
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Pin size={16} className="text-indigo-400 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-black text-lg text-slate-100 tracking-tight">{a.title}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{a.author_name} • {formatDate(a.published_at)}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest self-start shrink-0 ${pStyle}`}>{a.priority}</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-medium pl-7">{a.content}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        {pinned.length > 0 && regular.length > 0 && (
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
            <Megaphone size={12} /> Recent
          </h3>
        )}
        {regular.map((a: any) => {
          const pStyle = priorityStyles[a.priority] || priorityStyles.MEDIUM;
          return (
            <GlassCard key={a.id} className="p-8 rounded-[2rem]" hover={false}>
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-black text-lg text-slate-100 tracking-tight">{a.title}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{a.author_name} • {formatDate(a.published_at)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest self-start shrink-0 ${pStyle}`}>{a.priority}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">{a.content}</p>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default AnnouncementsView;
