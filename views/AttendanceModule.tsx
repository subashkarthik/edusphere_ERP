import React, { useState } from 'react';
import { UserRole } from '../types';
import { ROLE_THEMES, MOCK_ATTENDANCE } from '../constants';
import { 
  Plus, Download, ArrowLeft, Filter, Search, 
  ChevronRight, AlertCircle, CheckCircle2, MoreHorizontal,
  BrainCircuit, TrendingDown, Info, LayoutList, History
} from 'lucide-react';
import { useApi } from '../hooks';
import { attendanceApi } from '../services/api';
import { FullPageLoader } from '../components/LoadingSkeleton';
import GlassCard from '../components/GlassCard';

interface ModuleProps { id: string; role: UserRole; }

const AttendanceModule: React.FC<ModuleProps> = ({ role }) => {
  const theme = ROLE_THEMES[role];
  const isFaculty = role === UserRole.FACULTY;

  const fallbackAttendance = MOCK_ATTENDANCE.map(a => ({
    course_code: a.courseCode, course_name: a.courseName, percentage: a.percentage,
    classes_held: a.classesHeld, classes_attended: a.classesAttended,
  }));

  const { data: attendance, loading } = useApi(() => attendanceApi.summary(), fallbackAttendance, [role], 'attendance-summary');
  if (loading) return <FullPageLoader />;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <GlassCard className="p-6 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between gap-6 md:items-center">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              <LayoutList size={12} className="text-indigo-400" />
              Attendance Records • Attendance Intelligence
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Attendance Ledger</h1>
          </div>
          <div className="flex gap-2">
            {isFaculty && (
              <button className="flex-1 md:flex-none glass-btn-primary text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <Plus size={18}/> New Session
              </button>
            )}
            <button className="flex-1 md:flex-none glass-btn px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              <Download size={18}/> Export Report
            </button>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input type="text" placeholder="Search by course or code..." className="w-full glass-input rounded-xl pl-12 pr-4 py-2.5 text-sm font-medium" />
          </div>
          <div className="flex items-center gap-2">
             <button className="px-4 py-2.5 glass-btn rounded-xl flex items-center gap-2 text-xs font-bold">
               <Filter size={14} /> Filters
             </button>
             <button className="px-4 py-2.5 badge-indigo rounded-xl flex items-center gap-2 text-xs font-bold">
               Semester 6
             </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="rounded-[2rem]" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-left glass-table">
                <thead>
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Academic Unit</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Attendance Index</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Data Point</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(attendance || []).map((item: any, i: number) => {
                    const isLow = item.percentage < 75;
                    const isWarning = item.percentage >= 75 && item.percentage < 85;
                    return (
                      <tr key={i} className="hover:bg-white/[0.03] transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{item.course_name}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">{item.course_code}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4 max-w-[200px]">
                            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div className={`h-full ${isLow ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full transition-all duration-1000 progress-glow`} style={{width: `${item.percentage}%`}}></div>
                            </div>
                            <span className={`text-xs font-black w-10 ${isLow ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>{item.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-300">{item.classes_attended} / {item.classes_held}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Sessions Tracked</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isLow ? 'badge-rose' : isWarning ? 'badge-amber' : 'badge-emerald'}`}>
                            {isLow ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                            {isLow ? 'Critical' : isWarning ? 'Warning' : 'Stable'}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="p-2 hover:bg-white/[0.06] rounded-lg text-slate-500 hover:text-slate-200 transition-all">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-white/[0.06] flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Displaying {(attendance || []).length} Attendance Units</span>
              <div className="flex items-center gap-4">
                <button className="hover:text-indigo-400 transition-colors">Previous</button>
                <span className="px-2 py-1 glass-btn-primary text-white rounded-md">1</span>
                <button className="hover:text-indigo-400 transition-colors">Next</button>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <div className="glass glass-edge p-8 rounded-[2.5rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(15,23,42,0.8))'}}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h3 className="font-bold text-lg text-slate-100 mb-6 tracking-tight flex items-center gap-3">
              <BrainCircuit className="text-indigo-400" size={20}/> 
              Predictive Analysis
            </h3>
            <div className="space-y-5">
              {(attendance || []).filter((a: any) => a.percentage < 80).map((item: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl glass space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{item.course_code}</span>
                    <span className="text-[10px] font-black text-rose-400 uppercase flex items-center gap-1"><TrendingDown size={10} /> Shortage Risk</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Shortage predicted in <span className="text-slate-200 font-bold">2 sessions</span>. Estimated drop to <span className="text-rose-400 font-black">72.4%</span>.
                  </p>
                  <button className="w-full py-2.5 glass-btn rounded-xl text-[9px] font-black uppercase tracking-widest">Resolve Pathway</button>
                </div>
              ))}
            </div>
          </div>

          <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-indigo-500/15 rounded-xl text-indigo-400"><History size={20}/></div>
               <h4 className="font-bold text-slate-100">Recent Logs</h4>
             </div>
             <div className="space-y-6">
               {[
                 { action: 'Session Marked', course: 'CS8701', time: '12:45 PM', status: 'Present' },
                 { action: 'Proxy Detected', course: 'CS8702', time: '10:15 AM', status: 'Flagged' },
                 { action: 'Session Closed', course: 'CS8711', time: 'Yesterday', status: 'Present' }
               ].map((log, i) => (
                 <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'Present' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]'}`}></div>
                      <div className="w-[1px] flex-1 bg-white/[0.06] mt-2"></div>
                    </div>
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-200">{log.action}: {log.course}</h5>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{log.time} • {log.status}</p>
                    </div>
                 </div>
               ))}
             </div>
             <button className="mt-8 w-full py-3 glass-btn rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Audit Trail</button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default AttendanceModule;
