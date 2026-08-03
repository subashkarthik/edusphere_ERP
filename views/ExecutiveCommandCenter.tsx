import React, { useState } from 'react';
import { 
  ShieldCheck, TrendingUp, DollarSign, Users, Award, 
  Activity, ArrowUpRight, CheckCircle2, AlertTriangle, 
  Globe, ChevronRight, Zap, Database, Lock, Terminal
} from 'lucide-react';
import { EXECUTIVE_KPIS, RECENT_AUDIT_LOGS, RECENT_PLACEMENT_DRIVES, RESEARCH_GRANTS } from '../constants';

const ExecutiveCommandCenter: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState<'Q1' | 'Q2' | 'YTD'>('YTD');
  const [activeCampus, setActiveCampus] = useState<'ALL' | 'MAIN' | 'TECH_PARK' | 'SOUTH'>('ALL');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Executive Command Header Banner */}
      <div className="relative glass-panel rounded-[32px] p-8 md:p-10 overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-rose-500/10 via-orange-500/10 to-transparent blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                Executive Command Center
              </span>
              <span className="text-xs font-bold text-slate-400">University OS v4.0</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Institutional Operations & Health
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-medium max-w-2xl mt-2 leading-relaxed">
              Real-time enterprise metrics across 3 campuses, outcome-based accreditation compliance, and financial bursar clearance.
            </p>
          </div>

          {/* Controls: Campus & Timeframe */}
          <div className="flex flex-wrap items-center gap-3 bg-white/[0.03] p-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1">
              {(['ALL', 'MAIN', 'TECH_PARK'] as const).map((campus) => (
                <button
                  key={campus}
                  onClick={() => setActiveCampus(campus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all ${
                    activeCampus === campus
                      ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {campus}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10"></div>

            <div className="flex items-center gap-1">
              {(['Q1', 'Q2', 'YTD'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeTimeframe === tf
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {EXECUTIVE_KPIS.map((kpi, idx) => (
          <div 
            key={idx} 
            className="glass-card-hover p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</span>
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg flex items-center gap-1">
                <TrendingUp size={12} /> {kpi.change}
              </span>
            </div>

            <div>
              <div className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
                {kpi.value}
              </div>
              <p className="text-xs text-slate-400 font-medium leading-normal">
                {kpi.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Health Matrix & Departmental Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Institutional Health Breakdown (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-[32px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Departmental Performance & Accreditation Matrix</h3>
                <p className="text-xs text-slate-400 font-medium">Outcome-Based Education (OBE) & Research Output</p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full text-xs font-bold">
                NAAC A++ Ready
              </span>
            </div>

            {/* Department Table */}
            <div className="space-y-4">
              {[
                { name: 'Computer Science & Engg', students: '1,840', attendance: '94.2%', placement: '96.8%', grants: '₹4.8 Cr', status: 'EXCELLENT' },
                { name: 'Electronics & Comm Engg', students: '1,220', attendance: '91.5%', placement: '92.4%', grants: '₹3.2 Cr', status: 'SAFE' },
                { name: 'Mechanical & Automation', students: '980', attendance: '88.0%', placement: '85.2%', grants: '₹1.9 Cr', status: 'SAFE' },
                { name: 'School of Management', students: '1,100', attendance: '95.1%', placement: '94.0%', grants: '₹1.1 Cr', status: 'EXCELLENT' },
                { name: 'Biotechnology & Sciences', students: '700', attendance: '92.8%', placement: '89.5%', grants: '₹3.8 Cr', status: 'SAFE' },
              ].map((dept, index) => (
                <div key={index} className="p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                  <div>
                    <h4 className="text-sm font-extrabold text-white">{dept.name}</h4>
                    <span className="text-[11px] font-semibold text-slate-400">{dept.students} Enrolled Students</span>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-right">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Attendance</span>
                      <span className="text-xs font-black text-emerald-400">{dept.attendance}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Placement</span>
                      <span className="text-xs font-black text-indigo-400">{dept.placement}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Grants</span>
                      <span className="text-xs font-black text-amber-300">{dept.grants}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Research & Placement High-Value Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Research Grants */}
            <div className="glass-card p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Active DST/SERB Research Grants</h4>
                <Award size={18} className="text-amber-400" />
              </div>
              <div className="space-y-3">
                {RESEARCH_GRANTS.map(grant => (
                  <div key={grant.id} className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="text-xs font-bold text-white max-w-[200px] truncate">{grant.title}</h5>
                      <span className="text-xs font-black text-emerald-400">{grant.amount}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 block">{grant.principalInvestigator} • {grant.agency}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Corporate Placement Drives */}
            <div className="glass-card p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Top Corporate Recruitment Drives</h4>
                <ArrowUpRight size={18} className="text-indigo-400" />
              </div>
              <div className="space-y-3">
                {RECENT_PLACEMENT_DRIVES.map(drive => (
                  <div key={drive.id} className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={drive.logo} alt={drive.company} className="w-8 h-8 rounded-xl" />
                      <div>
                        <h5 className="text-xs font-bold text-white">{drive.company}</h5>
                        <span className="text-[10px] font-semibold text-slate-400">{drive.role}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-indigo-300">{drive.ctc}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Right Sidebar: Real-Time Audit Log & System Infrastructure */}
        <div className="space-y-6">
          
          {/* Real-time System Audit Stream */}
          <div className="glass-panel p-6 rounded-[32px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Live Audit & Security Stream</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>

            <div className="space-y-3">
              {RECENT_AUDIT_LOGS.map(log => (
                <div key={log.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-extrabold text-indigo-300">{log.actor} ({log.role})</span>
                    <span className="text-slate-500 font-bold">{log.timestamp}</span>
                  </div>
                  <p className="font-semibold text-slate-200 text-[11px]">{log.action}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Resource: {log.resource} • IP: {log.ipAddress}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="glass-card p-6 rounded-[32px] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Database size={16} className="text-indigo-400" />
                Database Engine Status
              </h4>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-black uppercase">
                Hybrid Synced
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Core Auth Database</span>
                <span className="text-slate-200 font-bold">SQLite (edusphere.db)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Academic Access Engine</span>
                <span className="text-slate-200 font-bold">MS Access PyODBC</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">API Response Latency</span>
                <span className="text-emerald-400 font-black">1.24 ms avg</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ExecutiveCommandCenter;
