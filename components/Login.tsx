import React, { useState } from 'react';
import { 
  ShieldCheck, UserCheck, Lock, CheckCircle2, AlertCircle, 
  ArrowRight, Sparkles, KeyRound, Check, X 
} from 'lucide-react';
import Logo from './Logo';
import { authApi, setTokens } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: any, tokens: { access_token: string; refresh_token: string }) => void;
}

const COMMON_PASSWORDS = [
  'password', 'password123', 'admin', 'admin123', '12345678', '123456789',
  'qwerty', 'welcome', 'welcome123', 'edusphere', 'changeme'
];

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // Authentication State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Force Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{
    user: any;
    tokens: { access_token: string; refresh_token: string };
  } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Policy Checks
  const hasMinLength = newPassword.length >= 10;
  const isNotCommon = !COMMON_PASSWORDS.includes(newPassword.toLowerCase().trim());
  const pendingUser = pendingAuth?.user;
  const doesNotContainPersonalData = (() => {
    if (!newPassword) return true;
    const lowerNew = newPassword.toLowerCase();
    if (pendingUser?.login_id && lowerNew.includes(pendingUser.login_id.toLowerCase())) return false;
    if (pendingUser?.name && lowerNew.includes(pendingUser.name.toLowerCase().split(' ')[0])) return false;
    if (pendingUser?.email && lowerNew.includes(pendingUser.email.toLowerCase().split('@')[0])) return false;
    return true;
  })();
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPolicySatisfied = hasMinLength && isNotCommon && doesNotContainPersonalData && passwordsMatch;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please enter your Institutional ID, Email, or Mobile Phone.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await authApi.login(identifier, password);
      // Persist authenticated tokens immediately
      setTokens(res.access_token, res.refresh_token);
      
      // Check if first-login temporary password change is required
      if (res.user.must_change_password) {
        setPendingAuth({
          user: res.user,
          tokens: { access_token: res.access_token, refresh_token: res.refresh_token },
        });
        setCurrentPassword(password);
        setIsChangingPassword(true);
        setErrorMsg(null);
        setSuccessMsg('Temporary credentials verified. Please create your permanent password.');
      } else {
        onLoginSuccess(res.user, { access_token: res.access_token, refresh_token: res.refresh_token });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid ID or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth) return;

    if (!isPolicySatisfied) {
      setErrorMsg('Please satisfy all password security requirements.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await authApi.changePassword(
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        pendingAuth.tokens.access_token
      );

      setSuccessMsg('Password updated successfully! Logging you in...');

      // Re-authenticate with new credentials to acquire fresh session tokens
      const loginId = pendingAuth.user.login_id || pendingAuth.user.email || identifier;
      const refreshed = await authApi.login(loginId, newPassword);
      setTokens(refreshed.access_token, refreshed.refresh_token);

      setTimeout(() => {
        onLoginSuccess(refreshed.user, {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
        });
      }, 350);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

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
          
          {/* Left Column: Context & Guidelines */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} /> Management-Provisioned Portal
              </span>
              <h2 className="text-2xl font-black text-white leading-tight">
                {isChangingPassword ? 'Secure Password Setup' : 'Institutional Access'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {isChangingPassword
                  ? 'Your account was initialized with a one-time temporary password. Set your confidential permanent password to continue.'
                  : 'Accounts are strictly provisioned by university administration. Self-service public registration is disabled.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={16} /> Identity Protection
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Log in with your assigned <strong>Register No / Faculty ID / Institutional Email</strong>. 
                Accounts are locked after 5 consecutive failed attempts.
              </p>
            </div>
          </div>

          {/* Right Column: Form Container */}
          <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-2xl border border-white/10 space-y-6">
            
            {/* Header / Mode Indicator */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  {isChangingPassword ? 'Mandatory Password Reset' : 'Sign In To Portal'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isChangingPassword ? 'Enforce password complexity standards' : 'Enter your verified institutional credentials'}
                </p>
              </div>
              {isChangingPassword && (
                <span className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <KeyRound size={18} />
                </span>
              )}
            </div>

            {/* Error / Success Notifications */}
            {errorMsg && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium animate-in fade-in">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* STANDARD LOGIN FORM */}
            {!isChangingPassword ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Login ID / Register No / Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 2026/CS/001 or admin@edusphere.edu.in"
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
                      placeholder="••••••••••••••••"
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
            ) : (
              /* FORCED PASSWORD CHANGE FORM */
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter the temporary password received"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    New Permanent Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 10 characters"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Confirm Permanent Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter permanent password"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white"
                  />
                </div>

                {/* Password Policy Realtime Checklist */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5 text-[11px]">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Security Policy:</p>
                  
                  <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasMinLength ? <Check size={13} /> : <X size={13} />}
                    <span>At least 10 characters long</span>
                  </div>

                  <div className={`flex items-center gap-2 ${doesNotContainPersonalData ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {doesNotContainPersonalData ? <Check size={13} /> : <X size={13} />}
                    <span>Does not contain your Name, Email, or Login ID</span>
                  </div>

                  <div className={`flex items-center gap-2 ${isNotCommon ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isNotCommon ? <Check size={13} /> : <X size={13} />}
                    <span>Not in common password dictionaries</span>
                  </div>

                  <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {passwordsMatch ? <Check size={13} /> : <X size={13} />}
                    <span>Passwords match</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isPolicySatisfied}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Updating Password...' : 'Save & Enter EduSphere'} <ArrowRight size={16} />
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <a
                href="/privacy"
                className="text-[11px] text-slate-400 hover:text-indigo-400 transition underline underline-offset-4 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={12} /> Institutional Privacy & Student Data Protection Notice
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
