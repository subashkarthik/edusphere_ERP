import React, { useState, useEffect } from 'react';
import { 
  Settings, User, Lock, Building, Bell, Shield, Paintbrush, 
  CheckCircle2, AlertCircle, Loader2, Save, Key, Globe, Layout 
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import GlassCard from '../components/GlassCard';
import { usersApi } from '../services/api';

interface SettingsModuleProps {
  user: UserProfile;
  onUserUpdate: (updatedUser: UserProfile) => void;
}

interface ThemeConfig {
  id: string;
  name: string;
  accent: string;
  glow: string;
  description: string;
}

const THEMES: ThemeConfig[] = [
  { id: 'indigo', name: 'Cyber Indigo', accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.35)', description: 'Deep tech aesthetics with neon indigo glow.' },
  { id: 'emerald', name: 'Emerald Forest', accent: '#10b981', glow: 'rgba(16, 185, 129, 0.35)', description: 'Sleek eco-green workspace layout.' },
  { id: 'violet', name: 'Cosmic Violet', accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.35)', description: 'Vibrant galactic neon purple theme.' },
  { id: 'rose', name: 'Crimson Sunset', accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.35)', description: 'Bold dark-mode crimson red accents.' },
];

const SettingsModule: React.FC<SettingsModuleProps> = ({ user, onUserUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security' | 'organization' | 'theme'>('profile');
  
  // Profile form state
  const [displayName, setDisplayName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [designation, setDesignation] = useState(user.designation || '');
  const [department, setDepartment] = useState(user.department || '');
  
  // Security form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Theme selection state (read from local storage if available)
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    return localStorage.getItem('edusphere-selected-theme') || 'indigo';
  });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) {
      setError('Display name is required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: displayName,
        phone: phone || undefined,
        designation: designation || undefined,
        department: department || undefined,
      };

      // Call Users API PUT
      const updatedBackend = await usersApi.update(user.id, payload);
      
      // Update App state
      onUserUpdate({
        ...user,
        name: updatedBackend.name || displayName,
        phone: updatedBackend.phone || phone,
        designation: updatedBackend.designation || designation,
        department: updatedBackend.department || department,
      });

      setSuccess('Profile specifications updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to modify profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all credentials fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Confirmation password does not match.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await usersApi.changePassword({
        current_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess('Access credentials re-keyed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Inject selected theme styles in root document
  const applyTheme = (themeId: string) => {
    const config = THEMES.find(t => t.id === themeId);
    if (!config) return;
    
    setSelectedTheme(themeId);
    localStorage.setItem('edusphere-selected-theme', themeId);
  };

  const currentThemeConfig = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Style Injection for Global Theme Switching */}
      <style>{`
        :root {
          --accent: ${currentThemeConfig.accent} !important;
          --accent-glow: ${currentThemeConfig.glow} !important;
        }
        .glass-btn-primary {
          background: linear-gradient(135deg, ${currentThemeConfig.accent}b3, ${currentThemeConfig.accent}d9) !important;
          border: 1px solid ${currentThemeConfig.accent}66 !important;
          box-shadow: 0 4px 20px ${currentThemeConfig.glow}, inset 0 1px 0 rgba(255,255,255,0.1) !important;
        }
        .glass-btn-primary:hover {
          background: linear-gradient(135deg, ${currentThemeConfig.accent}cc, ${currentThemeConfig.accent}ff) !important;
          box-shadow: 0 8px 32px ${currentThemeConfig.glow} !important;
        }
        .badge-indigo {
          background: ${currentThemeConfig.accent}26 !important;
          color: ${currentThemeConfig.accent}dd !important;
          border: 1px solid ${currentThemeConfig.accent}4d !important;
        }
      `}</style>

      {/* Top Banner */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              <Settings size={12} className="text-indigo-400" />
              SaaS Control Panel • Workspace Orchestration
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">System Preferences</h1>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <span className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl">
              Tier: Enterprise SaaS
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Status Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={18} className="text-rose-400 shrink-0" />
          <p className="text-rose-300 text-xs font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-xs font-bold">{success}</p>
        </div>
      )}

      {/* Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {[
            { id: 'profile', name: 'User Profile', icon: User },
            { id: 'security', name: 'Access Keys', icon: Lock },
            { id: 'organization', name: 'Tenant Info', icon: Building },
            { id: 'theme', name: 'Aesthetics', icon: Paintbrush },
          ].map(sub => {
            const Icon = sub.icon;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setActiveSubTab(sub.id as any);
                  setError('');
                  setSuccess('');
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${
                  activeSubTab === sub.id 
                    ? 'glass-btn-primary text-white shadow-lg' 
                    : 'glass text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={16} />
                {sub.name}
              </button>
            );
          })}
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-3">
          {activeSubTab === 'profile' && (
            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">User Profile</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Edit displaying credentials</p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Registered Email (Read-Only)</label>
                    <input 
                      type="email" 
                      disabled
                      value={user.email}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold opacity-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Contact Phone</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Department</label>
                    <input 
                      type="text" 
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                </div>

                {user.role === UserRole.FACULTY && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Academic Designation</label>
                    <input 
                      type="text" 
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                      placeholder="e.g. Associate Professor"
                    />
                  </div>
                )}

                {user.role === UserRole.STUDENT && user.enrollmentNo && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Enrollment ID</label>
                    <input 
                      type="text" 
                      disabled
                      value={user.enrollmentNo}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold opacity-50 cursor-not-allowed"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-white/[0.04] flex justify-end">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-8 py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 active:scale-95 transition-all"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Specifications
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {activeSubTab === 'security' && (
            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Security Credentials</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Re-key access credentials</p>
                </div>
              </div>

              <form onSubmit={handleSecuritySave} className="space-y-5">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Current Password *</label>
                  <input 
                    type="password" 
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">New Password *</label>
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Confirm New Password *</label>
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.04] flex justify-end">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-8 py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 active:scale-95 transition-all"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    Update Keyphrase
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {activeSubTab === 'organization' && (
            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Multi-Tenant Tenant Spec</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active institutional network parameters</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 glass rounded-2xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Institution Namespace</span>
                  <span className="text-slate-100 font-bold text-sm block">EduSphere University College</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Provisioned under Enterprise LMS standard.</span>
                </div>

                <div className="p-5 glass rounded-2xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Active Cluster Domain</span>
                  <span className="text-slate-100 font-mono text-sm block">edusphere.edu.in</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Routing directory: active.</span>
                </div>

                <div className="p-5 glass rounded-2xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Organization Key UUID</span>
                  <span className="text-indigo-400 font-mono text-xs block truncate">{user.org_id || 'org_edusphere_lms_prod'}</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">SaaS isolate tenant key.</span>
                </div>

                <div className="p-5 glass rounded-2xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">System Licensing</span>
                  <span className="text-emerald-400 font-black text-xs block">ENTERPRISE PLUS TIER</span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Includes Live WebSockets and Hybrid Database Engines.</span>
                </div>
              </div>

              <div className="mt-8 p-5 rounded-3xl glass border border-white/5 flex gap-4">
                <div className="p-3 glass rounded-2xl text-indigo-400 h-fit">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">Enterprise Compliance</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    This workspace complies with standard GDPR privacy principles and institutional security covenants. All changes are logged for forensic audit.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {activeSubTab === 'theme' && (
            <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
                  <Paintbrush size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Dynamic Aesthetic Customization</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Switch visual glass themes in real-time</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {THEMES.map((theme) => {
                  const isActive = selectedTheme === theme.id;
                  return (
                    <div 
                      key={theme.id}
                      onClick={() => applyTheme(theme.id)}
                      className={`p-6 glass rounded-3xl border-2 transition-all cursor-pointer text-left relative overflow-hidden flex flex-col justify-between h-40 group ${
                        isActive ? 'border-slate-100 shadow-2xl scale-[1.02]' : 'border-white/5 hover:border-white/10 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:scale-110 transition-transform" style={{ background: theme.accent }}></div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-black text-sm text-slate-200 tracking-tight">{theme.name}</span>
                          <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">
                            {isActive && <div className="w-2 h-2 rounded-full" style={{ background: theme.accent }}></div>}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px]">{theme.description}</p>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                        <div className="w-3 h-3 rounded-full" style={{ background: theme.accent }}></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Accent Hex: {theme.accent}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;
