import React, { useState } from 'react';
import { 
  Users, BookOpen, CheckCircle, Clock, 
  ArrowUpRight, ArrowDownRight, Search, Filter,
  MoreHorizontal, Download, Mail, Star, BarChart3,
  Plus, Edit, Trash2, LayoutList, FileText, Activity, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '../components/GlassCard';
import { usersApi } from '../services/api';

const FacultyDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'grading' | 'content'>('overview');
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setLoading(true);
    usersApi.list('STUDENT')
      .then(res => {
        const mapped = res.map((s, index) => {
          const seed = s.name.charCodeAt(0) + (s.name.charCodeAt(s.name.length - 1) || 0) + index;
          const attPct = 70 + (seed % 26);
          const grades = ['A+', 'A', 'B+', 'B', 'C', 'A-'];
          const grade = grades[seed % grades.length];
          let risk = 'Stable';
          if (attPct < 75) risk = 'Critical';
          else if (attPct < 85) risk = 'Warning';

          return {
            id: s.id,
            enrollment_no: s.enrollment_no || `EDUS${1000 + index}`,
            name: s.name,
            attendance: `${attPct}%`,
            grade,
            risk,
            email: s.email
          };
        });
        setStudents(mapped);
      })
      .catch(err => console.error("Error fetching students:", err))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Students', value: students.length > 0 ? String(students.length) : '142', change: '+12%', icon: Users, color: 'bg-indigo-500/15 text-indigo-400' },
    { label: 'Avg Attendance', value: '86%', change: '-2%', icon: Activity, color: 'bg-emerald-500/15 text-emerald-400' },
    { label: 'Pending Grades', value: '28', change: 'Urgent', icon: FileText, color: 'bg-rose-500/15 text-rose-400' },
    { label: 'Course Progress', value: '74%', change: '+5%', icon: BookOpen, color: 'bg-amber-500/15 text-amber-400' },
  ];

  const chartData = [
    { name: 'Week 1', score: 72 }, { name: 'Week 2', score: 78 },
    { name: 'Week 3', score: 75 }, { name: 'Week 4', score: 84 }, { name: 'Current', score: 86 },
  ];

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollment_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <Star size={12} className="text-amber-400" />
            Faculty Command Center • Semester 6
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Instructional Intelligence</h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setActiveView('content')} className="flex-1 md:flex-none px-6 py-3 glass-btn-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center gap-2">
            <Plus size={18}/> Author Content
          </button>
          <button className="p-3 glass-btn rounded-2xl"><BarChart3 size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <GlassCard key={i} className="p-6 rounded-[2rem]">
             <div className="flex justify-between items-start mb-4">
               <div className={`p-3 rounded-2xl ${s.color}`}><s.icon size={20} /></div>
               <span className={`text-[10px] font-black uppercase tracking-widest ${s.change.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{s.change}</span>
             </div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
             <h3 className="text-2xl font-black text-slate-100">{s.value}</h3>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 p-8 rounded-[2.5rem]" hover={false}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-lg text-slate-100 tracking-tight">Cohort Performance Index</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Academic growth tracker</p>
            </div>
            <select className="glass-input rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              <option>Last 30 Days</option><option>Last Semester</option>
            </select>
          </div>
          <div className="h-72 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="score" stroke="#818cf8" fillOpacity={1} fill="url(#colorPerf)" strokeWidth={3} dot={{ r: 4, fill: '#818cf8' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <div className="space-y-6">
           <div className="glass glass-edge p-8 rounded-[2.5rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(15,23,42,0.8))'}}>
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             <h3 className="font-bold text-lg text-slate-100 mb-6 tracking-tight flex items-center gap-3"><Activity className="text-indigo-400" size={20}/> Attention Areas</h3>
             <div className="space-y-4">
                <div className="p-4 rounded-2xl glass flex gap-4">
                   <div className="w-1 h-10 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Attendance Risk</p>
                     <p className="text-xs font-medium text-slate-400 mt-1">12 students falling below 75% in Cloud Lab.</p>
                   </div>
                </div>
                <div className="p-4 rounded-2xl glass flex gap-4">
                   <div className="w-1 h-10 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Grading Deadline</p>
                     <p className="text-xs font-medium text-slate-400 mt-1">Assignment 3 grading closes in 14 hours.</p>
                   </div>
                </div>
             </div>
           </div>

           <GlassCard className="p-8 rounded-[2.5rem] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-500/15 rounded-2xl flex items-center justify-center text-indigo-400 mb-6"><LayoutList size={28}/></div>
              <h4 className="font-bold text-slate-200 text-sm mb-2">Academic Roadmap</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium mb-6">Review and optimize the upcoming modules for Distributed Systems syllabus.</p>
              <button className="w-full py-3 glass-btn rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">Syllabus Builder</button>
           </GlassCard>
        </div>
      </div>

      <GlassCard className="rounded-[2.5rem]" hover={false}>
        <div className="p-8 border-b border-white/[0.06] flex flex-col md:flex-row justify-between gap-6 md:items-center">
          <h3 className="font-bold text-lg text-slate-100 tracking-tight">Student Success Registry</h3>
          <div className="flex gap-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 placeholder="Search students..." 
                 className="glass-input rounded-xl pl-9 pr-4 py-2 text-[11px] font-medium"
               />
             </div>
             <button className="p-2.5 glass-btn rounded-xl"><Filter size={18}/></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm glass-table">
            <thead>
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Student Information</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Attendance Index</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Grade Point</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-indigo-400" size={16} />
                      Retrieving registry...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                    No matching students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center font-bold text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">{s.name.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-slate-200">{s.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.enrollment_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-bold text-slate-300">{s.attendance}</td>
                    <td className="px-8 py-6 font-black text-indigo-400">{s.grade}</td>
                    <td className="px-8 py-6">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                        s.risk === 'Stable' ? 'badge-emerald' : 
                        s.risk === 'Critical' ? 'badge-rose' : 'badge-amber'
                      }`}>{s.risk}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-500 hover:text-slate-200 transition-colors"><Mail size={18}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default FacultyDashboard;
