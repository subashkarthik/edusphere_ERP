import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, CheckCircle2, AlertCircle, ArrowRight, UserPlus, Sparkles, GraduationCap } from 'lucide-react';
import Logo from './Logo';
import { authApi } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: any, tokens: { access_token: string; refresh_token: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REG_STUDENT' | 'REG_FACULTY'>('LOGIN');

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regDept, setRegDept] = useState('dept-cse');
  const [regDesignation, setRegDesignation] = useState('Assistant Professor');
  const [regFacultyKey, setRegFacultyKey] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please enter your Email, Register No, or Mobile Phone.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await authApi.login(identifier, password);
      onLoginSuccess(res.user, { access_token: res.access_token, refresh_token: res.refresh_token });
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !password) {
      setErrorMsg('Please fill in all required registration fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const isFaculty = authMode === 'REG_FACULTY';
    const roleStr = isFaculty ? 'FACULTY' : 'STUDENT';
    const codeVal = regCode || (isFaculty ? `FAC/2026/${Math.floor(Math.random() * 899 + 100)}` : `UNI/2026/CS/${Math.floor(Math.random() * 899 + 100)}`);

    try {
      const newUser = await authApi.registerPublic({
        email: regEmail,
        password,
        name: regName,
        role: roleStr,
        department_id: regDept,
        enrollment_no: codeVal,
        designation: isFaculty ? regDesignation : undefined,
        phone: regPhone || undefined,
        faculty_key: isFaculty ? regFacultyKey : undefined
      });

      setSuccessMsg(`Registration complete for ${newUser.name}. Please sign in.`);
      setIdentifier(regEmail);
      setAuthMode('LOGIN');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Check if email/ID already exists.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredential = (idVal: string, passVal: string) => {
    setIdentifier(idVal);
    setPassword(passVal);
    setAuthMode('LOGIN');
    setErrorMsg(null);
  };

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-[#030612] overflow-y-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 glass-panel rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10">
        
        {/* Top Header */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <Logo size={56} variant="full" className="mb-3" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Universal University Portal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Sleek Info & Quick Select */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} /> Enterprise Authentication
              </span>
              <h2 className="text-2xl font-black text-white leading-tight">
                Unified Portal Access
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Log in with your Email, Student Register Number, Faculty ID, or Mobile Phone.
              </p>
            </div>

            {/* Quick Demo Access Pills - Shown ONLY when VITE_DEMO_MODE=true */}
            {isDemoMode && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  ⚡ Demo Quick Access:
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fillQuickCredential('alex.j@edusphere.edu.in', 'student123')}
                    className="w-full text-left px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-between"
                  >
                    <span>🎓 Student Demo</span>
                    <span className="text-[10px] text-slate-400 font-normal">UNI/2021/CS/042</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredential('arun.kumar@edusphere.edu.in', 'faculty123')}
                    className="w-full text-left px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-between"
                  >
                    <span>👨‍🏫 Faculty Demo</span>
                    <span className="text-[10px] text-slate-400 font-normal">FAC/2026/001</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredential('admin@edusphere.edu.in', 'admin123')}
                    className="w-full text-left px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-between"
                  >
                    <span>🔑 Admin Demo</span>
                    <span className="text-[10px] text-slate-400 font-normal">admin@edusphere</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Clean Form Container */}
          <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-2xl border border-white/10 space-y-6">
            
            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => { setAuthMode('LOGIN'); setErrorMsg(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  authMode === 'LOGIN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('REG_STUDENT'); setErrorMsg(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  authMode === 'REG_STUDENT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Student Reg
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('REG_FACULTY'); setErrorMsg(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  authMode === 'REG_FACULTY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Faculty Reg
              </button>
            </div>

            {/* Error / Success Notifications */}
            {errorMsg && (
              <div className="flex items-center gap-2.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {authMode === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Email / Register No / Mobile Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. alex.j@edusphere.edu.in"
                      className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500"
                    />
                    <UserCheck size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500"
                    />
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Authenticating...' : 'Sign In To Portal'} <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* REGISTRATION FORM */}
            {authMode !== 'LOGIN' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">
                      {authMode === 'REG_STUDENT' ? 'Register No' : 'Faculty ID'}
                    </label>
                    <input
                      type="text"
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      placeholder={authMode === 'REG_STUDENT' ? 'UNI/2026/CS/001' : 'FAC/2026/001'}
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Institutional Email</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="user@edusphere.edu.in"
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                {authMode === 'REG_FACULTY' && (
                  <div>
                    <label className="text-[9px] font-bold text-amber-400 uppercase block mb-1">Faculty Key</label>
                    <input
                      type="password"
                      required
                      value={regFacultyKey}
                      onChange={(e) => setRegFacultyKey(e.target.value)}
                      placeholder="Enter Faculty Authorization Key"
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-amber-300 border-amber-500/30 font-bold"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} /> Complete {authMode === 'REG_FACULTY' ? 'Faculty' : 'Student'} Registration
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
