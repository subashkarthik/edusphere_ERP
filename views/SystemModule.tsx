import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Activity, Wifi, WifiOff, Terminal, Cpu, HardDrive, 
  Layers, RefreshCw, CheckCircle2, AlertCircle, Loader2, Server 
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import GlassCard from '../components/GlassCard';
import { systemApi, dashboardApi, financeApi, videosApi } from '../services/api';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  LineChart, Line 
} from 'recharts';

interface SystemModuleProps {
  user: UserProfile;
}

interface TelemetryPoint {
  time: string;
  cpu: number;
  memory: number;
  queries: number;
}

const SystemModule: React.FC<SystemModuleProps> = ({ user }) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState('');
  
  // WebSocket States
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('DISCONNECTED');
  const [wsMessages, setWsMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Activity Log States
  const [activities, setActivities] = useState<any[]>([]);
  const [actLoading, setActLoading] = useState(false);

  // Telemetry Chart State
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);

  // Financial Ledger State
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);


  // 1. Fetch DB Health
  const checkDbHealth = async () => {
    setDbLoading(true);
    setDbError('');
    try {
      const data = await systemApi.dbHealth();
      setDbStatus(data);
    } catch (err: any) {
      setDbError(err.message || 'Failed to communicate with system health probe.');
    } finally {
      setDbLoading(false);
    }
  };

  // 2. Fetch Activity Logs
  const fetchActivities = async () => {
    setActLoading(true);
    try {
      const logs = await dashboardApi.getActivity();
      setActivities(logs);
    } catch (err) {
      console.error('Failed to retrieve system logs:', err);
    } finally {
      setActLoading(false);
    }
  };

  const [cloudStatus, setCloudStatus] = useState<any>({
    cloud_provider: "AWS S3 / Cloudflare R2",
    bucket_name: "edusphere-course-assets",
    region: "us-east-1",
    cdn_url: "https://edusphere-course-assets.s3.us-east-1.amazonaws.com",
    is_cloud_active: true,
    local_video_count: 0,
    local_storage_mb: 0,
    sync_script: "python upload_to_s3.py --bucket edusphere-course-assets"
  });

  const fetchCloudStatus = async () => {
    try {
      const data = await videosApi.cloudStatus();
      setCloudStatus(data);
    } catch (err) {
      console.error('Failed to fetch cloud status:', err);
    }
  };

  useEffect(() => {
    fetchCloudStatus();
  }, []);

  // Fetch Institutional Ledger Entries

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const data = await financeApi.getLedger();
      setLedger(data);
    } catch (err) {
      console.error('Failed to fetch financial ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };


  // 3. Telemetry Simulation
  useEffect(() => {
    // Generate initial history
    const initialData: TelemetryPoint[] = [];
    const now = new Date();
    for (let i = 10; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 5000);
      initialData.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cpu: Math.floor(20 + Math.random() * 25),
        memory: Math.floor(45 + Math.random() * 10),
        queries: Math.floor(10 + Math.random() * 40),
      });
    }
    setTelemetry(initialData);

    const interval = setInterval(() => {
      const currTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTelemetry(prev => {
        const next = [...prev.slice(1)];
        next.push({
          time: currTime,
          cpu: Math.floor(20 + Math.random() * 45),
          memory: Math.floor(48 + Math.random() * 8),
          queries: Math.floor(5 + Math.random() * 65),
        });
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 4. WebSocket setup
  useEffect(() => {
    setWsStatus('CONNECTING');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.port === '3000' ? `${window.location.hostname}:5000` : window.location.host;
    const orgId = user.org_id || 'org_edusphere';
    const userId = user.id || 'user_anon';
    const wsUrl = `${wsProtocol}//${wsHost}/ws/${orgId}/${userId}`;
    
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    let socket: WebSocket;
    
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsStatus('CONNECTED');
        setWsMessages(prev => [
          { time: new Date().toLocaleTimeString(), text: 'System WebSocket Connected successfully.', type: 'sys' },
          ...prev
        ]);
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setWsMessages(prev => [
            { 
              time: new Date().toLocaleTimeString(), 
              text: `Event: ${parsed.type || 'RAW'} — User: ${parsed.user_id || 'System'}`, 
              type: 'msg',
              detail: parsed
            },
            ...prev.slice(0, 49) // Keep last 50
          ]);
        } catch {
          setWsMessages(prev => [
            { time: new Date().toLocaleTimeString(), text: `Pulse: ${event.data}`, type: 'msg' },
            ...prev.slice(0, 49)
          ]);
        }
      };

      socket.onclose = () => {
        setWsStatus('DISCONNECTED');
        setWsMessages(prev => [
          { time: new Date().toLocaleTimeString(), text: 'System WebSocket disconnected.', type: 'sys' },
          ...prev
        ]);
      };

      socket.onerror = (err) => {
        console.error('WS Error:', err);
        setWsStatus('DISCONNECTED');
      };
    } catch (e) {
      console.error('WS Connection Exception:', e);
      setWsStatus('DISCONNECTED');
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [user.org_id, user.id]);

  useEffect(() => {
    checkDbHealth();
    fetchActivities();
    fetchLedger();
  }, []);


  const latestCpu = telemetry.length > 0 ? telemetry[telemetry.length - 1].cpu : 0;
  const latestMem = telemetry.length > 0 ? telemetry[telemetry.length - 1].memory : 0;
  const latestQueries = telemetry.length > 0 ? telemetry[telemetry.length - 1].queries : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Banner */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              <Server size={12} className="text-emerald-400" />
              SaaS Engine • Live Telemetry & Health Monitoring
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">System Infrastructure Console</h1>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => {
                checkDbHealth();
                fetchActivities();
              }}
              className="flex-1 md:flex-none px-6 py-4 glass-btn text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={dbLoading ? 'animate-spin' : ''} /> Refresh Telemetry
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Network Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* DB Connection Status */}
        <GlassCard className="p-6 rounded-[2rem]" hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <Database size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100 tracking-tight">Database Clusters</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Multi-backend Status</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
              dbStatus?.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {dbStatus?.status || 'Unknown'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 glass rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase">SQLite Database</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                {dbStatus?.databases?.sqlite === 'connected' ? 'CONNECTED' : dbStatus?.databases?.sqlite || 'CHECKING...'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 glass rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase">MS Access (LMS)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                {dbStatus?.databases?.access === 'healthy' || dbStatus?.databases?.access === 'connected' ? 'HEALTHY' : dbStatus?.databases?.access || 'CHECKING...'}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* WebSocket Realtime Status */}
        <GlassCard className="p-6 rounded-[2rem]" hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <Activity size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100 tracking-tight">WebSocket Network</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Activity Bridge</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
              wsStatus === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              wsStatus === 'CONNECTING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {wsStatus === 'CONNECTED' ? <Wifi size={10} /> : <WifiOff size={10} />}
              {wsStatus}
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 glass rounded-xl flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400 uppercase">Institution Route</span>
              <span className="text-indigo-400 font-mono text-[9px] truncate max-w-[140px]">{user.org_id || 'org_edusphere'}</span>
            </div>
            <div className="p-3 glass rounded-xl flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400 uppercase">Device Handshake</span>
              <span className="text-slate-300">Active</span>
            </div>
          </div>
        </GlassCard>

        {/* Server Hardware Usage */}
        <GlassCard className="p-6 rounded-[2rem]" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400">
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100 tracking-tight">Host Utilization</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Virtual CPU Core</p>
              </div>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase">PROD-TIER</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1.5">
                <span>CPU UTILIZATION</span>
                <span className="text-slate-200">{latestCpu}%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${latestCpu}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1.5">
                <span>VIRTUAL MEMORY</span>
                <span className="text-slate-200">{latestMem}%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${latestMem}%` }}
                ></div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Cloud Video Storage Banner */}
      <GlassCard className="p-6 rounded-[2rem] bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20" hover={false}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
              <HardDrive size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base text-white">AWS S3 / Cloudflare R2 Video Assets</h4>
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {cloudStatus.is_cloud_active ? 'ACTIVE CDN' : 'LOCAL FALLBACK'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bucket: <span className="font-mono text-indigo-300">{cloudStatus.bucket_name}</span> ({cloudStatus.region}) • {cloudStatus.local_video_count} Video files ({cloudStatus.local_storage_mb} MB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <code className="px-3 py-2 bg-slate-950 rounded-xl text-xs font-mono text-indigo-300 border border-slate-800 select-all overflow-x-auto max-w-full">
              {cloudStatus.sync_script}
            </code>
            <button
              onClick={fetchCloudStatus}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shrink-0"
            >
              Sync Storage
            </button>
          </div>
        </div>
      </GlassCard>


      {/* Analytics Telemetry Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 lg:col-span-2 rounded-[2.5rem]" hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-bold text-slate-100 tracking-tight">Live Server Cluster Metrics</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Real-time system telemetry</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-400">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div> CPU LOAD
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> QUERIES/SEC
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke="#475569" 
                  fontSize={8} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ background: '#0a0f1e', borderColor: '#334155', borderRadius: '1rem', color: '#cbd5e1', fontSize: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#6366f1" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorCpu)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="queries" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorQueries)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* WebSocket Activity Terminal */}
        <GlassCard className="p-6 rounded-[2.5rem] flex flex-col justify-between" hover={false}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={16} className="text-indigo-400" />
              <h4 className="font-bold text-slate-100 tracking-tight">Institutional Event Stream</h4>
            </div>

            <div className="bg-black/40 rounded-2xl p-4 font-mono text-[9px] text-slate-400 h-64 overflow-y-auto space-y-2 border border-white/5 scrollbar-thin">
              {wsMessages.length > 0 ? (
                wsMessages.map((m, i) => (
                  <div key={i} className="leading-relaxed border-b border-white/[0.02] pb-1">
                    <span className="text-slate-600">[{m.time}]</span>{' '}
                    <span className={m.type === 'sys' ? 'text-indigo-400 font-bold' : 'text-emerald-400'}>
                      {m.text}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-center py-20 uppercase tracking-widest">
                  Listening for institutional pulse...
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.04] text-[9px] text-slate-500 font-bold uppercase tracking-wider flex justify-between">
            <span>Client State Sync</span>
            <span className="text-indigo-400">READY</span>
          </div>
        </GlassCard>
      </div>

      {/* Enterprise Audit Logs (SQLite + MS Access Hybrid) */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="font-bold text-lg text-slate-100 tracking-tight">Administrative Logs</h4>
            <p className="text-xs text-slate-500 font-medium">Recent server events and client security logs.</p>
          </div>
          <button 
            onClick={fetchActivities} 
            disabled={actLoading}
            className="p-3 glass-btn rounded-xl hover:text-white"
          >
            {actLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <th className="pb-4 font-black">LOG ID/LABEL</th>
                <th className="pb-4 font-black">DESCRIPTION</th>
                <th className="pb-4 font-black">RESOURCE</th>
                <th className="pb-4 font-black">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {activities.map((a, i) => (
                <tr key={i} className="text-xs text-slate-400 hover:bg-white/[0.01]">
                  <td className="py-4 font-bold text-slate-200">{a.label}</td>
                  <td className="py-4 text-slate-400 font-medium">{a.description}</td>
                  <td className="py-4 font-semibold">
                    <span className="px-2 py-1 rounded bg-white/5 text-[9px] text-indigo-300 border border-white/10 uppercase">
                      {a.type}
                    </span>
                  </td>
                  <td className="py-4 text-[10px] text-slate-500 font-bold uppercase">{a.time}</td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-500 uppercase tracking-widest text-[10px]">
                    No recent database transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Financial Ledger Section */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="font-bold text-lg text-slate-100 tracking-tight">Institutional Financial Ledger</h4>
            <p className="text-xs text-slate-500 font-medium">Real-time transactional log of debits and credits across the institution.</p>
          </div>
          <button 
            onClick={fetchLedger} 
            disabled={ledgerLoading}
            className="p-3 glass-btn rounded-xl hover:text-white"
          >
            {ledgerLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <th className="pb-4 font-black">Transaction ID</th>
                <th className="pb-4 font-black">Student</th>
                <th className="pb-4 font-black">Description</th>
                <th className="pb-4 font-black">Amount</th>
                <th className="pb-4 font-black">Type</th>
                <th className="pb-4 font-black">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {ledger.map((entry, idx) => (
                <tr key={idx} className="text-xs text-slate-400 hover:bg-white/[0.01]">
                  <td className="py-4 font-mono font-bold text-slate-300">{entry.transaction_id || `TXN-${entry.id.slice(0,8)}`}</td>
                  <td className="py-4 font-medium text-slate-200">{entry.student_name}</td>
                  <td className="py-4 text-slate-400 font-medium">{entry.label}</td>
                  <td className="py-4 font-bold text-slate-100">₹{entry.amount.toLocaleString('en-IN')}</td>
                  <td className="py-4 font-semibold">
                    <span className={`px-2 py-0.5 rounded text-[8px] border uppercase ${
                      entry.entry_type === 'CREDIT' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="py-4 text-[10px] text-slate-500 font-bold uppercase">{entry.created_at ? entry.created_at.slice(0, 19).replace('T', ' ') : '-'}</td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 uppercase tracking-widest text-[10px]">
                    No ledger transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};


export default SystemModule;
