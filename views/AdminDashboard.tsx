import React from 'react';
import { 
  Building2, Users, GraduationCap, ShieldCheck, 
  Settings, Download, Activity, Database, Server,
  ArrowUpRight, ArrowDownRight, Globe, BarChart2,
  Lock, Bell, Layers, Cpu, X, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '../components/GlassCard';
import { dashboardApi, systemApi, announcementsApi } from '../services/api';

const AdminDashboard: React.FC = () => {
  const [cores, setCores] = React.useState(64);
  const [memory, setMemory] = React.useState(256);
  const [showProvisionModal, setShowProvisionModal] = React.useState(false);
  const [addedCores, setAddedCores] = React.useState(4);
  const [addedMemory, setAddedMemory] = React.useState(16);

  const [showBroadcastModal, setShowBroadcastModal] = React.useState(false);
  const [broadcastTitle, setBroadcastTitle] = React.useState('');
  const [broadcastContent, setBroadcastContent] = React.useState('');
  const [broadcastPriority, setBroadcastPriority] = React.useState('MEDIUM');
  const [targetRoles, setTargetRoles] = React.useState({ ADMIN: true, FACULTY: true, STUDENT: true });

  const [isAuditing, setIsAuditing] = React.useState(false);
  const [auditProgress, setAuditProgress] = React.useState<string | null>(null);
  
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [liveMetrics, setLiveMetrics] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Fetch live system configuration
    systemApi.getConfig()
      .then(res => {
        setCores(res.cores);
        memory !== res.memory && setMemory(res.memory);
      })
      .catch(err => console.error("Error loading system config:", err));

    // Fetch dashboard metrics
    dashboardApi.getMetrics()
      .then(data => {
        if (data && data.length > 0) {
          setLiveMetrics(data);
        }
      })
      .catch(err => console.error("Error loading dashboard metrics:", err));
  }, []);

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await systemApi.provision({ cores: addedCores, memory: addedMemory });
      setCores(res.cores);
      setMemory(res.memory);
      setShowProvisionModal(false);
      setToast({ message: `Provisioned +${addedCores} Cores, +${addedMemory} GB RAM successfully!`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || "Provisioning failed", type: 'error' });
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    const steps = [
      "Initializing governance protocol...",
      "Decrypting credentials database integrity...",
      "Analyzing active TLS and AES-256 parameters...",
      "Running server vulnerability and CORS audits...",
      "Updating system logs with COMPLIANT rating..."
    ];
    
    for (let i = 0; i < steps.length; i++) {
      setAuditProgress(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    try {
      const res = await systemApi.runAudit();
      setToast({ message: res.message || "Audit completed: 100% Secure & Compliant!", type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || "Security compliance audit failed", type: 'error' });
    } finally {
      setIsAuditing(false);
      setAuditProgress(null);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastContent) {
      setToast({ message: "Title and content are required", type: 'error' });
      return;
    }

    const roles = Object.entries(targetRoles)
      .filter(([_, active]) => active)
      .map(([role]) => role)
      .join(',');

    if (!roles) {
      setToast({ message: "Select at least one target role", type: 'error' });
      return;
    }

    try {
      await announcementsApi.create({
        title: broadcastTitle,
        content: broadcastContent,
        target_roles: roles,
        priority: broadcastPriority,
        is_pinned: false
      });
      setToast({ message: "Broadcasted new announcement dynamically!", type: 'success' });
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastContent('');
    } catch (err: any) {
      setToast({ message: err.message || "Failed to broadcast", type: 'error' });
    }
  };

  const stats = [
    { label: 'Institutional Load', value: '4,280', change: 'Active Students', icon: Users, color: 'bg-indigo-500/15 text-indigo-400' },
    { label: 'System Health', value: '99.9%', change: 'All Nodes OK', icon: ShieldCheck, color: 'bg-emerald-500/15 text-emerald-400' },
    { label: 'Placement Index', value: '82%', change: '+4% QoQ', icon: GraduationCap, color: 'bg-amber-500/15 text-amber-400' },
    { label: 'Data Throughput', value: '1.2 GB', change: 'Real-time', icon: Database, color: 'bg-rose-500/15 text-rose-400' },
  ];

  const renderedStats = liveMetrics.length > 0 ? liveMetrics.map(lm => {
    let icon = Database;
    let color = 'bg-rose-500/15 text-rose-400';
    if (lm.label.toLowerCase().includes('faculty')) {
      icon = Users;
      color = 'bg-indigo-500/15 text-indigo-400';
    } else if (lm.label.toLowerCase().includes('subject')) {
      icon = Layers;
      color = 'bg-amber-500/15 text-amber-400';
    } else if (lm.label.toLowerCase().includes('registration') || lm.label.toLowerCase().includes('enroll')) {
      icon = ShieldCheck;
      color = 'bg-emerald-500/15 text-emerald-400';
    } else if (lm.label.toLowerCase().includes('placement')) {
      icon = GraduationCap;
      color = 'bg-rose-500/15 text-rose-400';
    }
    return {
      label: lm.label,
      value: lm.value,
      change: lm.change,
      icon,
      color
    };
  }) : stats;

  const enrollmentData = [
    { name: '2020', students: 3200 }, { name: '2021', students: 3500 },
    { name: '2022', students: 3800 }, { name: '2023', students: 4100 }, { name: '2024', students: 4280 },
  ];

  const deptPerformance = [
    { dept: 'CSE', score: 92 }, { dept: 'ECE', score: 84 },
    { dept: 'MECH', score: 78 }, { dept: 'CIVIL', score: 81 }, { dept: 'MBA', score: 88 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <Building2 size={12} className="text-indigo-400" />
            Institutional Governance • Global HQ
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">System Infrastructure Hub</h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setShowProvisionModal(true)}
            className="flex-1 md:flex-none px-6 py-3 glass-btn-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
          >
            Provision Resource
          </button>
          <button className="p-3 glass-btn rounded-2xl"><Settings size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderedStats.map((s, i) => (
          <GlassCard key={i} className="p-6 rounded-[2rem]">
             <div className="flex justify-between items-start mb-4">
               <div className={`p-3 rounded-2xl ${s.color}`}><s.icon size={20} /></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.change}</span>
             </div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
             <h3 className="text-2xl font-black text-slate-100">{s.value}</h3>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 p-8 rounded-[2.5rem]" hover={false}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-2"><BarChart2 size={20} className="text-indigo-400"/> Enrollment Trajectory</h3>
            <div className="flex gap-2">
               <button className="px-3 py-1 glass-btn-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Yearly</button>
               <button className="px-3 py-1 glass rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500">Monthly</button>
            </div>
          </div>
          <div className="h-80 -ml-4">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentData}>
                  <defs>
                    <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', color: '#f1f5f9' }} />
                  <Area type="monotone" dataKey="students" stroke="#818cf8" fillOpacity={1} fill="url(#colorEnroll)" strokeWidth={4} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </GlassCard>

        <div className="space-y-6">
           <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <h3 className="font-bold text-lg text-slate-100 mb-6 tracking-tight flex items-center gap-2"><Server size={20} className="text-indigo-400"/> Node Monitoring</h3>
              <div className="space-y-6">
                 {[
                   { label: 'Central Database', status: 'Online', load: '14%', color: 'bg-emerald-500' },
                   { label: 'CDN Edge (Global)', status: 'Online', load: '42%', color: 'bg-emerald-500' },
                   { label: 'Intelligence Worker', status: 'Processing', load: '88%', color: 'bg-indigo-500' },
                   { label: 'Legacy Access Connector', status: 'Idle', load: '0%', color: 'bg-slate-600' }
                 ].map((node, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-300">{node.label}</span>
                        <div className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${node.color} ${node.status === 'Processing' ? 'animate-pulse shadow-[0_0_6px_rgba(99,102,241,0.6)]' : node.status === 'Online' ? 'shadow-[0_0_6px_rgba(52,211,153,0.6)]' : ''}`}></div>
                           <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{node.status}</span>
                        </div>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full ${node.color} progress-glow`} style={{width: node.load}}></div>
                      </div>
                   </div>
                 ))}
              </div>
           </GlassCard>

           <div className="glass glass-edge p-8 rounded-[2.5rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(15,23,42,0.8))'}}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 glass rounded-2xl text-indigo-400"><Cpu size={20}/></div>
                <h4 className="font-bold text-sm text-slate-100">Cluster Management</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium mb-6">All institutional sub-domains are currently operating within optimal resource quotas.</p>
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 glass rounded-xl">
                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Cores</p>
                    <p className="text-sm font-black text-slate-200">{cores} vCPU</p>
                 </div>
                 <div className="p-3 glass rounded-xl">
                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Memory</p>
                    <p className="text-sm font-black text-slate-200">{memory} GB</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <GlassCard className="p-8 rounded-[2.5rem] lg:col-span-1" hover={false}>
            <h3 className="font-bold text-lg text-slate-100 mb-8 flex items-center gap-2"><Globe size={20} className="text-indigo-400"/> Dept Performance</h3>
            <div className="space-y-6">
               {deptPerformance.map((d, i) => (
                 <div key={i} className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl glass flex items-center justify-center font-black text-slate-400 text-xs">{d.dept}</div>
                   <div className="flex-1">
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">{d.dept} Academic Index</span>
                       <span className="text-[10px] font-black text-indigo-400">{d.score}%</span>
                     </div>
                     <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 progress-glow" style={{width: `${d.score}%`}}></div>
                     </div>
                   </div>
                 </div>
               ))}
            </div>
         </GlassCard>

         <div className="lg:col-span-2 glass glass-edge p-10 rounded-[3rem] relative overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.15))'}}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 h-full">
               <div className="max-w-md">
                 <div className="p-4 glass rounded-3xl w-fit mb-6"><Lock size={32} className="text-indigo-400"/></div>
                 <h3 className="text-2xl font-black text-slate-100 tracking-tight mb-4 leading-tight">Institutional Compliance & Data Privacy</h3>
                 <p className="text-slate-400 text-sm font-medium leading-relaxed">Your institution is currently operating under full AES-256 data encryption and GDPR compliance standards.</p>
               </div>
               <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                 <button 
                   onClick={handleRunAudit}
                   disabled={isAuditing}
                   className="px-6 py-8 glass rounded-[2.5rem] transition-all text-center flex flex-col items-center gap-2 hover:bg-white/[0.08] active:scale-95 disabled:opacity-50"
                 >
                    <ShieldCheck size={24} className="text-emerald-400"/>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Run Audit</span>
                 </button>
                 <button 
                   onClick={() => setShowBroadcastModal(true)}
                   className="px-6 py-8 glass-btn-primary rounded-[2.5rem] transition-all active:scale-95 text-center flex flex-col items-center gap-2 text-white"
                 >
                    <Bell size={24}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Broadcast</span>
                 </button>
               </div>
            </div>
         </div>
      </div>

      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setShowProvisionModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><Cpu size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Provision Resources</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Simulate scaling of infrastructure quotas</p>
              </div>
            </div>

            <form onSubmit={handleProvision} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cores to add</label>
                <select 
                  value={addedCores}
                  onChange={(e) => setAddedCores(Number(e.target.value))}
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <option className="bg-slate-900" value={2}>2 Cores</option>
                  <option className="bg-slate-900" value={4}>4 Cores</option>
                  <option className="bg-slate-900" value={8}>8 Cores</option>
                  <option className="bg-slate-900" value={16}>16 Cores</option>
                  <option className="bg-slate-900" value={32}>32 Cores</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">RAM to add</label>
                <select 
                  value={addedMemory}
                  onChange={(e) => setAddedMemory(Number(e.target.value))}
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <option className="bg-slate-900" value={8}>8 GB RAM</option>
                  <option className="bg-slate-900" value={16}>16 GB RAM</option>
                  <option className="bg-slate-900" value={32}>32 GB RAM</option>
                  <option className="bg-slate-900" value={64}>64 GB RAM</option>
                  <option className="bg-slate-900" value={128}>128 GB RAM</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 glass-btn-primary rounded-2xl text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all mt-4"
              >
                Provision Cluster
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setShowBroadcastModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><Bell size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Live Broadcast</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Broadcast WebSocket notifications to all users</p>
              </div>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Broadcast Title</label>
                <input 
                  type="text" 
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Schedule Maintenance Notice"
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Message Content</label>
                <textarea 
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Enter details about this broadcast announcement..."
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200 h-28 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Priority</label>
                  <select 
                    value={broadcastPriority}
                    onChange={(e) => setBroadcastPriority(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <option className="bg-slate-900" value="LOW">Low Priority</option>
                    <option className="bg-slate-900" value="MEDIUM">Medium Priority</option>
                    <option className="bg-slate-900" value="HIGH">High Priority</option>
                    <option className="bg-slate-900" value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Target Audiences</label>
                  <div className="space-y-1 mt-1">
                    {Object.keys(targetRoles).map((role) => (
                      <label key={role} className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={(targetRoles as any)[role]}
                          onChange={(e) => setTargetRoles({ ...targetRoles, [role]: e.target.checked })}
                          className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 glass-btn-primary rounded-2xl text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all mt-4"
              >
                Broadcast Announcement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Audit Scanning Progress Overlay */}
      {isAuditing && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300">
          <div className="text-center space-y-6 max-w-md">
            <div className="relative flex justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin"></div>
              <ShieldCheck className="absolute top-5 text-indigo-400 animate-pulse" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-wider">System Governance Audit</h3>
              <p className="text-sm font-semibold text-slate-400 transition-all duration-300">{auditProgress}</p>
            </div>
            <div className="flex justify-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div 
            className={`glass glass-edge px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl border ${
              toast.type === 'success' ? 'border-emerald-500/30' : 'border-rose-500/30'
            }`} 
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="text-rose-400" />
            )}
            <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

