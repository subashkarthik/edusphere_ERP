import React, { useState } from 'react';
import { UserRole, LearningMetric, Recommendation, StudyTask } from '../types';
import { MOCK_ATTENDANCE, MOCK_TIMETABLE } from '../constants';
import { 
  TrendingUp, TrendingDown, Calendar, ChevronRight,
  GraduationCap, Award, BrainCircuit, Sparkles, AlertTriangle, CheckCircle2,
  Activity, Clock, LayoutGrid, ListFilter, RefreshCw, ShieldCheck,
  Zap, ListChecks, ArrowRight, Target, Flame, Cpu, Fingerprint, Network
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useApi } from '../hooks';
import { intelligenceApi, attendanceApi, timetableApi } from '../services/api';
import GlassCard from '../components/GlassCard';

// Role-based Dashboards
import FacultyDashboard from './FacultyDashboard';
import AdminDashboard from './AdminDashboard';

interface DashboardProps {
  role: UserRole;
}

const IntelligenceSimulator: React.FC<{ initialGpa: number }> = ({ initialGpa }) => {
  const [effort, setEffort] = useState(70);
  const [attendance, setAttendance] = useState(85);
  
  const predictedGpa = Math.min(10, (initialGpa * 0.4) + (effort * 0.04) + (attendance * 0.02)).toFixed(2);
  const gpaDelta = (parseFloat(predictedGpa) - initialGpa).toFixed(2);

  return (
    <GlassCard className="p-8 rounded-[2.5rem] relative overflow-hidden" hover={false}>
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Cpu size={120} className="text-indigo-400" />
      </div>
      
      <div className="flex flex-col md:flex-row gap-10 items-center">
        <div className="w-full md:w-1/2 space-y-8">
          <div>
            <h3 className="text-lg font-black text-slate-100 uppercase tracking-widest flex items-center gap-3 mb-2">
              <Fingerprint className="text-indigo-400" size={20} />
              Intelligence Simulator
            </h3>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Adjust vectors to simulate academic trajectory impacts.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Study Velocity</span>
                <span className="text-xs font-black text-indigo-400">{effort}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={effort} 
                onChange={(e) => setEffort(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Consistency</span>
                <span className="text-xs font-black text-emerald-400">{attendance}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={attendance} 
                onChange={(e) => setAttendance(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center justify-center py-6 glass rounded-[2rem] border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Predicted GPA Proxy</p>
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
             <h4 className="text-6xl font-black text-white relative z-10 tracking-tighter">{predictedGpa}</h4>
          </div>
          <div className={`mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${parseFloat(gpaDelta) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {parseFloat(gpaDelta) >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            {gpaDelta} vs Current
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

const StudyPlanner: React.FC<{ tasks: StudyTask[], onToggle: (id: string) => void, onRefresh: () => void }> = ({ tasks, onToggle, onRefresh }) => {
  return (
    <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/15 rounded-xl text-amber-400"><Flame size={20}/></div>
          <h3 className="font-bold text-lg text-slate-100 tracking-tight">AI Study Planner</h3>
        </div>
        <div className="px-3 py-1 glass text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-lg">Today: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
      </div>
      
      <div className="space-y-3">
        {tasks.length > 0 ? tasks.map((t) => (
          <div 
            key={t.id} 
            onClick={() => onToggle(t.id)}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${t.completed ? 'bg-white/[0.02] border-white/[0.04] opacity-60' : 'glass border-white/[0.06] hover:border-indigo-500/30'}`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors ${t.completed ? 'bg-emerald-500/80 border-emerald-500 text-white' : 'border-white/20'}`}>
              {t.completed && <CheckCircle2 size={14}/>}
            </div>
            <div className="flex-1">
              <h4 className={`text-xs font-bold ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{t.title}</h4>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{t.duration}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${t.priority === 'URGENT' ? 'text-rose-400' : 'text-indigo-400'}`}>{t.priority}</span>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-600" />
          </div>
        )) : (
          <div className="py-8 text-center text-slate-500 text-xs font-medium">No tasks for today. Stay relaxed!</div>
        )}
      </div>
      <button 
        onClick={onRefresh}
        className="w-full mt-6 py-4 glass-btn-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
      >
        Optimize My Day
      </button>
    </GlassCard>
  );
};

const StudentIntelligenceDashboard: React.FC<{ 
  metric: LearningMetric | null, 
  recommendations: Recommendation[], 
  attendance: any[], 
  timetable: any[],
  tasks: StudyTask[],
  onToggleTask: (id: string) => void,
  onDeepAudit: () => void
}> = ({ metric, recommendations, attendance, timetable, tasks, onToggleTask, onDeepAudit }) => {
  const healthData = [
    { name: 'Health', value: metric?.overall_score || 0 },
    { name: 'Remaining', value: 100 - (metric?.overall_score || 0) },
  ];
  const HEALTH_COLORS = [metric?.risk_level === 'CRITICAL' ? '#fb7185' : '#818cf8', 'rgba(255,255,255,0.05)'];

  const trendData = metric?.velocity_json ? JSON.parse(metric.velocity_json) : [
    { name: 'Week 1', score: 78 },
    { name: 'Week 2', score: 82 },
    { name: 'Week 3', score: 80 },
    { name: 'Week 4', score: 88 },
    { name: 'Current', score: metric?.overall_score || 88 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Intelligence Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <ShieldCheck size={12} className="text-emerald-400" />
            EduSphere LMS Intelligence • v5.0 Quantum
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Intelligence Hub</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Neural Sync Active</span>
          </div>
        </div>
      </div>

      {/* Hero Signal */}
      <div className="glass glass-edge p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(15,23,42,0.8))'}}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
        <div className="relative z-10 flex items-center gap-8">
           <div className="w-24 h-24 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={healthData} cx="50%" cy="50%" innerRadius={35} outerRadius={45} paddingAngle={0} dataKey="value" startAngle={90} endAngle={450}>
                    {healthData.map((_, index) => <Cell key={`cell-${index}`} fill={HEALTH_COLORS[index % HEALTH_COLORS.length]} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-slate-100">{Math.round(metric?.overall_score || 0)}%</div>
           </div>
           <div>
             <h2 className="text-2xl font-black tracking-tight leading-tight mb-2 text-slate-100">Academic Trajectory: <span className={metric?.risk_level === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}>{metric?.risk_level || 'NORMAL'}</span></h2>
             <p className="text-slate-400 text-sm font-medium max-w-md">Your overall learning health is calculated using predictive attendance and assessment velocity.</p>
           </div>
        </div>
        <div className="flex gap-4 relative z-10 w-full md:w-auto">
           <div className="flex-1 md:flex-none px-8 py-5 glass rounded-3xl text-center">
             <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">GPA Proxy</p>
             <p className="text-2xl font-black text-slate-100">{metric?.gpa_proxy?.toFixed(2) || '0.00'}</p>
           </div>
           <button 
             onClick={onDeepAudit}
             className="flex-1 md:flex-none px-8 py-5 glass-btn-primary rounded-3xl transition-all active:scale-95 text-center font-black uppercase text-[10px] tracking-widest"
           >
             Deep Audit
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Next Level: Intelligence Simulator */}
          <IntelligenceSimulator initialGpa={metric?.gpa_proxy || 8.5} />

          {/* Trend Analysis */}
          <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
             <div className="flex justify-between items-center mb-8">
               <h3 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-2"><Target size={20} className="text-indigo-400"/> Learning Velocity</h3>
               <div className="flex gap-2">
                 <button className="px-3 py-1.5 badge-indigo text-[9px] font-black uppercase rounded-lg">Live Trend</button>
               </div>
             </div>
             <div className="h-72 -ml-4">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={trendData}>
                   <defs>
                     <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} domain={[0, 100]} />
                   <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)', color: '#f1f5f9', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} />
                   <Area type="monotone" dataKey="score" stroke="#818cf8" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={4} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </GlassCard>

          {/* AI Insights */}
          <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
             <h3 className="font-bold text-lg text-slate-100 mb-8 flex items-center gap-3"><BrainCircuit className="text-indigo-400" size={24}/> Strategic Focus</h3>
             <div className="space-y-3">
               {recommendations.map((rec, i) => (
                 <div key={i} className="p-5 rounded-2xl glass border border-white/[0.06] hover:border-indigo-500/20 transition-all flex items-center gap-5 group cursor-pointer">
                   <div className={`p-4 rounded-xl ${rec.priority === 'URGENT' ? 'bg-rose-500/15 text-rose-400' : 'bg-white/[0.06] text-slate-400'}`}>
                     <Zap size={20}/>
                   </div>
                   <div className="flex-1">
                     <h4 className="font-bold text-sm text-slate-200">{rec.title}</h4>
                     <p className="text-xs text-slate-500 mt-1">{rec.message}</p>
                   </div>
                   <ChevronRight className="text-slate-600 group-hover:text-indigo-400 transition-colors" size={20}/>
                 </div>
               ))}
             </div>
          </GlassCard>
        </div>

        <div className="space-y-8">
           <StudyPlanner tasks={tasks} onToggle={onToggleTask} onRefresh={onDeepAudit} />
           
           {/* Agenda Context */}
           <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h3 className="font-bold text-slate-100 mb-6 flex items-center gap-2"><Calendar size={18} className="text-indigo-400"/> Next Sessions</h3>
              <div className="space-y-4">
                {timetable.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-right min-w-[45px]">
                       <p className="text-[10px] font-black text-slate-500 uppercase leading-none">{t.time.split(' ')[0]}</p>
                       <p className="text-[9px] font-black text-indigo-400 mt-1">{t.time.split(' ')[1]}</p>
                    </div>
                    <div className="flex-1">
                       <p className="text-xs font-bold text-slate-200 leading-tight">{t.course}</p>
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t.venue}</p>
                    </div>
                  </div>
                ))}
              </div>
           </GlassCard>

           <div className="glass glass-edge p-8 rounded-[2.5rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(15,23,42,0.6))'}}>
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Network size={80} className="text-emerald-400" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                 <CheckCircle2 size={24} className="text-emerald-400"/>
                 <h4 className="font-bold text-sm text-slate-100 uppercase tracking-widest">Quantum Encryption</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Session is encrypted with AES-256-GCM. Institutional data access is audited by Neural Sentinel.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

import ExecutiveCommandCenter from './ExecutiveCommandCenter';
import FacultyWorkspace from './FacultyWorkspace';
import StudentJourneyWorkspace from './StudentJourneyWorkspace';

interface DashboardProps {
  role: UserRole;
}

const Dashboard: React.FC<DashboardProps> = ({ role }) => {
  if (role === UserRole.ADMIN) {
    return <ExecutiveCommandCenter />;
  }
  if (role === UserRole.FACULTY) {
    return <FacultyWorkspace />;
  }
  return <StudentJourneyWorkspace />;
};

export default Dashboard;
