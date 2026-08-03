import React, { useState, useEffect } from 'react';
import { 
  Users, Search, UserPlus, Trash2, Mail, Shield, User, 
  Building, Phone, X, Award, CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import { ROLE_THEMES } from '../constants';
import GlassCard from '../components/GlassCard';
import { usersApi, authApi } from '../services/api';

interface UsersModuleProps {
  currentUserRole: UserRole;
}

const UsersModule: React.FC<UsersModuleProps> = ({ currentUserRole }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  
  // Modal states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('STUDENT');
  const [inviteDept, setInviteDept] = useState<string>('dept-cse');
  const [inviteEnrollment, setInviteEnrollment] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // List all users, will filter on frontend or pass roles
      const data = await usersApi.list(selectedRole === 'ALL' ? undefined : selectedRole);
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to retrieve institutional directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const handleDeactivate = async (userId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this account?')) return;
    setError('');
    setSuccess('');
    try {
      await usersApi.delete(userId);
      setSuccess('Account deactivated successfully.');
      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err.message || 'Deactivation failed.');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !invitePassword) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setInviteLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const payload = {
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        department_id: inviteDept,
        enrollment_no: inviteRole === 'STUDENT' ? inviteEnrollment : undefined,
        designation: inviteRole === 'FACULTY' ? inviteDesignation : undefined,
        phone: invitePhone || undefined,
      };

      await authApi.register(payload);
      setSuccess(`Successfully registered ${inviteName}!`);
      setIsInviteOpen(false);
      
      // Clear inputs
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      setInviteEnrollment('');
      setInviteDesignation('');
      setInvitePhone('');
      
      // Refresh list
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to register new institutional user.');
    } finally {
      setInviteLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.department && u.department.toLowerCase().includes(query)) ||
      (u.enrollment_no && u.enrollment_no.toLowerCase().includes(query)) ||
      (u.designation && u.designation.toLowerCase().includes(query))
    );
  });

  const isAdmin = currentUserRole === UserRole.ADMIN;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Banner */}
      <GlassCard className="p-8 rounded-[2.5rem]" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              <Shield size={12} className="text-indigo-400" />
              SaaS Directory • Identity & Access Control
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Institutional Directory</h1>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {isAdmin && (
              <button 
                onClick={() => setIsInviteOpen(true)}
                className="flex-1 md:flex-none px-6 py-4 glass-btn-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={14} /> Invite Member
              </button>
            )}
            <button onClick={fetchUsers} className="p-4 glass-btn rounded-2xl text-slate-400 hover:text-slate-200 transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Notifications */}
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

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search directory..."
            className="w-full pl-14 pr-6 py-4 glass-input rounded-2xl text-sm font-medium"
          />
        </div>

        <div className="flex glass p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
          {['ALL', 'STUDENT', 'FACULTY', 'ADMIN'].map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                selectedRole === role ? 'glass-btn-primary text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-indigo-400" size={32} />
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Querying identity cluster...</span>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map((item) => (
            <GlassCard key={item.id} className="p-6 rounded-[2.2rem] flex flex-col justify-between group border border-white/[0.03]">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <img 
                    src={item.avatar} 
                    alt={item.name} 
                    className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.name.replace(' ', '+')}&background=1e3a8a&color=fff`;
                    }}
                  />
                  <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    item.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    item.role === 'FACULTY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-white/5'
                  }`}>
                    {item.role}
                  </div>
                </div>

                <h3 className="font-black text-slate-100 tracking-tight text-base mb-1 line-clamp-1">{item.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5 mb-4 line-clamp-1">
                  <Mail size={10} className="text-slate-600" />
                  {item.email}
                </p>

                <div className="space-y-2 mt-4 pt-4 border-t border-white/[0.04]">
                  {item.department && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Building size={12} className="text-slate-600" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.department}</span>
                    </div>
                  )}

                  {item.designation && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Award size={12} className="text-slate-600" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.designation}</span>
                    </div>
                  )}

                  {item.enrollment_no && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <User size={12} className="text-slate-600" />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{item.enrollment_no}</span>
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && item.id !== 'user-admin' && (
                <div className="mt-6 pt-4 border-t border-white/[0.04] flex justify-end">
                  <button 
                    onClick={() => handleDeactivate(item.id)}
                    className="p-2 rounded-xl text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/5 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Deactivate Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass rounded-[2.5rem] p-10">
          <Users size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No members found</p>
          <p className="text-xs text-slate-600 mt-1">Try adjusting search parameters or selecting another category.</p>
        </div>
      )}

      {/* Invite Modal Overlay */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><UserPlus size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Invite Member</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Provision a new account on the server</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dr. John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Email *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. john@edusphere.edu.in"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Password *</label>
                  <input 
                    type="password" 
                    required
                    placeholder="Temporary Password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Role *</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                  >
                    <option value="STUDENT" className="bg-slate-900 text-slate-100">STUDENT</option>
                    <option value="FACULTY" className="bg-slate-900 text-slate-100">FACULTY</option>
                    <option value="ADMIN" className="bg-slate-900 text-slate-100">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Department *</label>
                  <select 
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                  >
                    <option value="dept-cse" className="bg-slate-900 text-slate-100">Computer Science (CSE)</option>
                    <option value="dept-mech" className="bg-slate-900 text-slate-100">Mechanical Eng (MECH)</option>
                    <option value="dept-eee" className="bg-slate-900 text-slate-100">Electrical Eng (EEE)</option>
                  </select>
                </div>
              </div>

              {inviteRole === 'STUDENT' && (
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Enrollment Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. UNI/2021/CS/080"
                    value={inviteEnrollment}
                    onChange={(e) => setInviteEnrollment(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                  />
                </div>
              )}

              {inviteRole === 'FACULTY' && (
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Designation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Assistant Professor"
                    value={inviteDesignation}
                    onChange={(e) => setInviteDesignation(e.target.value)}
                    className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 98765 43210"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full glass-input rounded-2xl px-5 py-3 text-sm font-semibold"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
                    <><Loader2 size={12} className="animate-spin" /> Provisioning...</>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersModule;
