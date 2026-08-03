
import React from 'react';
import { UserRole } from '../types';
import { ROLE_THEMES } from '../constants';
import { Calendar, Clock, MapPin, BookOpen } from 'lucide-react';
import { useApi } from '../hooks';
import { timetableApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface TimetableViewProps { role: UserRole; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fallbackTimetable = [
  { id: '1', day: 'Monday', time: '09:00 - 10:00', course: 'Advanced Algorithms', venue: 'LH-302', faculty: 'Dr. Arun Kumar', entry_type: 'LECTURE' },
  { id: '2', day: 'Monday', time: '10:15 - 11:15', course: 'Computer Networks', venue: 'Lab-1', faculty: 'Prof. S. Devi', entry_type: 'LECTURE' },
  { id: '3', day: 'Tuesday', time: '09:00 - 11:00', course: 'Operating Systems Lab', venue: 'Lab-4', faculty: 'Dr. P. Raj', entry_type: 'LAB' },
  { id: '4', day: 'Wednesday', time: '11:30 - 12:30', course: 'Web Engineering', venue: 'LH-101', faculty: 'Mrs. K. Priya', entry_type: 'LECTURE' },
  { id: '5', day: 'Thursday', time: '09:00 - 10:00', course: 'Cloud Computing', venue: 'LH-302', faculty: 'Dr. Arun Kumar', entry_type: 'LECTURE' },
  { id: '6', day: 'Friday', time: '02:00 - 04:00', course: 'Cloud Computing Lab', venue: 'Lab-2', faculty: 'Dr. Arun Kumar', entry_type: 'LAB' },
];

const typeColors: Record<string, string> = {
  LECTURE: 'badge-indigo',
  LAB: 'badge-emerald',
  TUTORIAL: 'badge-amber',
  SEMINAR: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
};

const TimetableView: React.FC<TimetableViewProps> = ({ role }) => {
  const theme = ROLE_THEMES[role] || ROLE_THEMES[UserRole.STUDENT];

  const { data: timetable, loading } = useApi(() => timetableApi.list(), fallbackTimetable, [role], 'timetable-list');
  if (loading) return <FullPageLoader />;

  const entries = timetable || [];
  const groupedByDay: Record<string, any[]> = {};
  DAYS.forEach(day => { groupedByDay[day] = []; });
  entries.forEach((entry: any) => { if (groupedByDay[entry.day]) groupedByDay[entry.day].push(entry); });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Class Schedule</h2>
          <p className="text-slate-400 text-sm font-medium">Weekly timetable for enrolled courses.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-btn-primary text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">
            <Calendar size={14} className="inline mr-2" />
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-1">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${color}`}>
            {type}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {DAYS.map(day => {
          const dayEntries = groupedByDay[day] || [];
          if (dayEntries.length === 0) return null;
          return (
            <GlassCard key={day} className="rounded-[2rem]" hover={false}>
              <div className="px-8 py-4 flex items-center gap-3 border-b border-white/[0.06]" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.15), transparent)'}}>
                <Calendar size={16} className="text-indigo-400" />
                <h3 className="font-black text-sm uppercase tracking-[0.2em] text-slate-200">{day}</h3>
                <span className="text-[10px] text-slate-400 font-bold ml-auto">{dayEntries.length} session{dayEntries.length > 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {dayEntries.map((entry: any, i: number) => {
                  const typeClass = typeColors[entry.entry_type] || typeColors.LECTURE;
                  return (
                    <div key={i} className="px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/[0.03] transition-colors group">
                      <div className="flex items-center gap-4 sm:w-40 shrink-0">
                        <Clock size={16} className="text-slate-600" />
                        <span className="text-sm font-black text-slate-300">{entry.time}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-slate-200 text-sm group-hover:text-indigo-400 transition-colors">{entry.course}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-500 font-bold inline-flex items-center gap-1">
                            <MapPin size={10} /> {entry.venue}
                          </span>
                          {entry.faculty && <span className="text-[10px] text-slate-500 font-bold">• {entry.faculty}</span>}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest self-start ${typeClass}`}>
                        {entry.entry_type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default TimetableView;
