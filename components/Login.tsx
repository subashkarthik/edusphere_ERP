import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, Phone, Hash, Award, CheckCircle2, AlertCircle, ArrowRight, UserPlus, Sparkles, GraduationCap } from 'lucide-react';
import Logo from './Logo';
import { authApi } from '../services/api';
import { UserRole } from '../types';

interface LoginProps {
  onLoginSuccess: (user: any, tokens: { access_token: string; refresh_token: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REG_STUDENT' | 'REG_FACULTY'>('LOGIN');

  // Login Form State
  const [identifier, setIdentifier] = useState('alex.j@edusphere.edu.in');
  const [password, setPassword] = useState('student123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regDept, setRegDept] = useState('dept-cse');
  const [regDesignation, setRegDesignation] = useState('Assistant Professor');
  const [regFacultyKey, setRegFacultyKey] = useState('FACULTY-2026-KEY');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please enter your Email, Register No, or Mobile Phone Number.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await authApi.login(identifier, password);
      onLoginSuccess(res.user, { access_token: res.access_token, refresh_token: res.refresh_token });
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
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

      setSuccessMsg(`Registration successful for ${newUser.name}! You can now sign in with your ID or Email.`);
      setIdentifier(regEmail);
      setAuthMode('LOGIN');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Check if email/ID is already registered.');
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

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 z-50 overflow-y-auto bg-[#030612]">
      {/* Background Decorative Gradient Illumination */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-indigo-600/15 blur-[140px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-rose-600/15 blur-[140px] rounded-full animate-pulse delay-700" />

      <div className="w-full max-w-5xl relative z-10 glass-panel rounded-[40px] p-6 md:p-10 shadow-2xl border border-white/10 my-auto">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <Logo size={72} variant="full" className="mb-2" />
          <div className="h-px w-28 bg-gradient-to-r from-transparent via-white/30 to-transparent mb-2" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Enterprise University OS • Multi-Identifier Portal</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Brand & Feature Highlights */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 bg-slate-950/60 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={14} /> Production Enterprise System
              </div>
              <h2 className="text-2xl font-black text-slate-100 leading-tight">
                Unified Institutional Access Engine
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Log in seamlessly using any verified credential — Email Address, Student Register Number, Faculty ID, or Mobile Phone Number.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg"><CheckCircle2 size={14} /></div>
                  <span>Multi-Identifier JWT Authentication</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                  <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg"><CheckCircle2 size={14} /></div>
                  <span>Real MS Access 7-Database Live Connection</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg"><CheckCircle2 size={14} /></div>
                  <span>Role-Based Access Control (Student / Faculty / Admin)</span>
                </div>
              </div>
            </div>

            {/* Quick Test Login Pill Strip */}
            <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">⚡ 1-Click Fast Test Fill:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickCredential('UNI/2021/CS/001', 'student123')}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 rounded-xl text-[10px] font-black transition"
                >
                  🎓 Student Register No: UNI/2021/CS/001
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredential('FAC/2026/001', 'faculty123')}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 rounded-xl text-[10px] font-black transition"
                >
                  👨‍🏫 Faculty ID: FAC/2026/001
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredential('admin@edusphere.edu.in', 'admin123')}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 rounded-xl text-[10px] font-black transition"
                >
                  🔑 Admin Email: admin@edusphere.edu.in
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card & Form */}
          <div className="lg:col-span-6 glass-card p-6 md:p-8 rounded-3xl space-y-6 border border-white/10">
            
            {/* Auth Mode Toggle Tabs */}
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => { setAuthMode('LOGIN'); setErrorMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  authMode === 'LOGIN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('REG_STUDENT'); setErrorMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  authMode === 'REG_STUDENT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Student Reg
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('REG_FACULTY'); setErrorMsg(null); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  authMode === 'REG_FACULTY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Faculty Reg
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-rose-300 text-xs font-bold">{errorMsg}</p>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <p className="text-emerald-300 text-xs font-bold">{successMsg}</p>
              </div>
            )}

            {/* SIGN IN FORM */}
            {authMode === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block mb-1.5">
                    Email / Register No / Mobile Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. alex.j@edusphere.edu.in or UNI/2021/CS/001"
                      className="w-full glass-input pl-11 pr-4 py-3 rounded-2xl text-xs text-white placeholder-slate-500 font-medium"
                    />
                    <UserCheck size={18} className="absolute left-4 top-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block mb-1.5">
                    Password Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-input pl-11 pr-4 py-3 rounded-2xl text-xs text-white placeholder-slate-500 font-medium"
                    />
                    <Lock size={18} className="absolute left-4 top-3.5 text-slate-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  {isLoading ? 'Authenticating...' : 'Enter Institutional Portal'} <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* REGISTRATION FORM (STUDENT / FACULTY) */}
            {authMode !== 'LOGIN' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">
                      {authMode === 'REG_STUDENT' ? 'Register No' : 'Faculty ID'}
                    </label>
                    <input
                      type="text"
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      placeholder={authMode === 'REG_STUDENT' ? 'e.g. UNI/2026/CS/001' : 'e.g. FAC/2026/001'}
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Institutional Email</label>
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
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Department</label>
                    <select
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white bg-slate-900"
                    >
                      <option value="dept-cse">Computer Science (CSE)</option>
                      <option value="dept-ece">Electronics (ECE)</option>
                      <option value="dept-mech">Mechanical (MECH)</option>
                      <option value="dept-civil">Civil Engineering</option>
                      <option value="dept-eee">Electrical (EEE)</option>
                    </select>
                  </div>

                  {authMode === 'REG_FACULTY' ? (
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Designation</label>
                      <input
                        type="text"
                        value={regDesignation}
                        onChange={(e) => setRegDesignation(e.target.value)}
                        placeholder="Professor / HoD"
                        className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-white"
                      />
                    </div>
                  )}
                </div>

                {authMode === 'REG_FACULTY' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-amber-400 uppercase tracking-wider block mb-1">Faculty Authorization Key</label>
                      <input
                        type="password"
                        required
                        value={regFacultyKey}
                        onChange={(e) => setRegFacultyKey(e.target.value)}
                        placeholder="FACULTY-2026-KEY"
                        className="w-full glass-input px-3 py-2.5 rounded-xl text-xs text-amber-300 font-bold border-amber-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Password</label>
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
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} /> Register {authMode === 'REG_FACULTY' ? 'Faculty' : 'Student'} Account
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
