import React, { useState, useEffect } from 'react';
import { 
  Users, Search, UserPlus, Trash2, Mail, Shield, User, 
  Building, Phone, X, Award, CheckCircle2, AlertCircle, Loader2,
  FileSpreadsheet, KeyRound, Copy, Check, RefreshCw, Upload,
  AlertTriangle, ArrowRight, ToggleLeft, ToggleRight, Edit3, Download, UserX
} from 'lucide-react';
import { UserRole } from '../types';
import GlassCard from '../components/GlassCard';
import { usersApi } from '../services/api';

interface UsersModuleProps {
  currentUserRole: UserRole;
}

export const UsersModule: React.FC<UsersModuleProps> = ({ currentUserRole }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeTargetUser, setPurgeTargetUser] = useState<any>(null);
  const [purgeReason, setPurgeReason] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Form States - Student
  const [stuName, setStuName] = useState('');
  const [stuRegisterNo, setStuRegisterNo] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuDept, setStuDept] = useState('Computer Science');
  const [stuSemester, setStuSemester] = useState<number>(1);
  const [stuSection, setStuSection] = useState('A');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Form States - Faculty
  const [facName, setFacName] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facDept, setFacDept] = useState('Computer Science');
  const [facDesignation, setFacDesignation] = useState('Assistant Professor');
  const [facPhone, setFacPhone] = useState('');
  const [isSubmittingFaculty, setIsSubmittingFaculty] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editDept, setEditDept] = useState('');
  const [editSemester, setEditSemester] = useState<number>(1);
  const [editSection, setEditSection] = useState('A');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // One-time Credentials Sheet Modal State
  const [credentialDetails, setCredentialDetails] = useState<{
    name: string;
    login_id: string;
    temp_password: string;
    role: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Bulk Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    total_rows: number;
    valid_count: number;
    invalid_count: number;
    preview: Array<{
      row: number;
      name: string;
      register_no: string;
      email: string;
      department: string;
      semester: number;
      section: string;
      valid: boolean;
      errors: string[];
    }>;
  } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
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

  // Add Student Handler
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName || !stuRegisterNo || !stuEmail || !stuDept) {
      setError('Please fill in all required student fields.');
      return;
    }

    setIsSubmittingStudent(false);
    setError('');
    setSuccess('');

    try {
      setIsSubmittingStudent(true);
      const res = await usersApi.provisionStudent({
        name: stuName,
        register_no: stuRegisterNo,
        email: stuEmail,
        department: stuDept,
        semester: Number(stuSemester),
        section: stuSection.toUpperCase(),
      });

      setCredentialDetails({
        name: stuName,
        login_id: res.login_id,
        temp_password: res.temp_password,
        role: 'STUDENT',
      });
      setIsCredentialsModalOpen(true);
      setIsAddStudentOpen(false);

      // Reset fields
      setStuName('');
      setStuRegisterNo('');
      setStuEmail('');
      setStuSemester(1);
      setStuSection('A');

      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to provision student.');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Add Faculty Handler
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facName || !facEmail || !facDept) {
      setError('Please fill in all required faculty fields.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      setIsSubmittingFaculty(true);
      const res = await usersApi.provisionFaculty({
        name: facName,
        email: facEmail,
        department: facDept,
        designation: facDesignation,
        phone: facPhone || undefined,
      });

      setCredentialDetails({
        name: facName,
        login_id: res.login_id,
        temp_password: res.temp_password,
        role: 'FACULTY',
      });
      setIsCredentialsModalOpen(true);
      setIsAddFacultyOpen(false);

      // Reset fields
      setFacName('');
      setFacEmail('');
      setFacPhone('');

      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to provision faculty.');
    } finally {
      setIsSubmittingFaculty(false);
    }
  };

  // Toggle Account Status (Deactivate / Reactivate)
  const handleToggleStatus = async (user: any) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.name}'s account?`)) return;

    setError('');
    setSuccess('');
    try {
      await usersApi.updateStatus(user.id, !user.is_active);
      setSuccess(`Account ${user.name} has been ${action}d successfully.`);
      // Update local state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
    } catch (err: any) {
      setError(err.message || `Failed to ${action} account.`);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (user: any) => {
    if (!window.confirm(`Generate a new temporary password for ${user.name}? This will revoke current access and require them to set a new password on their next login.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await usersApi.resetPassword(user.id);
      setCredentialDetails({
        name: user.name,
        login_id: res.login_id,
        temp_password: res.temp_password,
        role: user.role,
      });
      setIsCredentialsModalOpen(true);
      setSuccess(`Password for ${user.name} reset successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  // Edit User Handler
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditDept(user.department || '');
    setEditSemester(user.semester || 1);
    setEditSection(user.section || 'A');
    setIsEditUserOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmittingEdit(true);
    setError('');
    setSuccess('');

    try {
      await usersApi.update(editingUser.id, {
        department: editDept,
        semester: Number(editSemester),
        section: editSection,
      });

      setSuccess(`Updated details for ${editingUser.name}.`);
      setIsEditUserOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Bulk Preview Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewLoading(true);
    setPreviewData(null);
    setError('');

    try {
      const data = await usersApi.bulkPreview(file);
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file for validation.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Bulk Import & Download Credentials Sheet
  const handleConfirmBulkImport = async () => {
    if (!selectedFile) return;

    setImportLoading(true);
    setError('');
    setSuccess('');

    try {
      const blob = await usersApi.bulkImport(selectedFile);
      
      // Auto-trigger browser download of credentials sheet
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_credentials_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Bulk accounts provisioned successfully! Credentials sheet downloaded to your computer.');
      setIsBulkImportOpen(false);
      setSelectedFile(null);
      setPreviewData(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to complete bulk import.');
    } finally {
      setImportLoading(false);
    }
  };

  // Download Sample Template CSV
  const handleDownloadSampleTemplate = () => {
    const header = 'name,register_no,email,department,semester,section\n';
    const sampleRows = 
      'Aarav Kumar,2026/CS/101,aarav.kumar@edusphere.edu.in,Computer Science,1,A\n' +
      'Bhavya Sharma,2026/CS/102,bhavya.sharma@edusphere.edu.in,Computer Science,1,A\n' +
      'Chirag Patel,2026/ME/101,chirag.patel@edusphere.edu.in,Mechanical Eng,3,B\n';
    const blob = new Blob([header + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleExportData = async (user: any) => {
    setIsExporting(user.id);
    setError('');
    setSuccess('');
    try {
      const data = await usersApi.exportData(user.id);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_export_${user.login_id || user.id}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess(`Exported personal data archive for ${user.name}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to export student data.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleOpenPurge = (user: any) => {
    setPurgeTargetUser(user);
    setPurgeReason('');
    setIsPurgeModalOpen(true);
  };

  const handleExecutePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purgeTargetUser) return;
    if (!purgeReason.trim()) {
      setError('A valid compliance/audit reason is required for student data purging.');
      return;
    }

    setIsPurging(true);
    setError('');
    setSuccess('');
    try {
      await usersApi.purgeData(purgeTargetUser.id, purgeReason.trim());
      setSuccess(`Successfully purged personal data for ${purgeTargetUser.name}. Audit trail logged.`);
      setIsPurgeModalOpen(false);
      setPurgeTargetUser(null);
      setPurgeReason('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to purge student data.');
    } finally {
      setIsPurging(false);
    }
  };


  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.login_id && u.login_id.toLowerCase().includes(query)) ||
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              <Shield size={12} className="text-indigo-400" />
              SaaS Directory • Management-Provisioned Identities
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Institutional Directory</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Public self-registration is closed. Accounts are provisioned and administered by institutional managers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
            {isAdmin && (
              <>
                <button 
                  onClick={() => setIsAddStudentOpen(true)}
                  className="px-5 py-3.5 glass-btn-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <UserPlus size={14} /> Add Student
                </button>

                <button 
                  onClick={() => setIsAddFacultyOpen(true)}
                  className="px-5 py-3.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Award size={14} /> Add Faculty
                </button>

                <button 
                  onClick={() => setIsBulkImportOpen(true)}
                  className="px-5 py-3.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet size={14} /> Bulk Import
                </button>
              </>
            )}

            <button 
              onClick={fetchUsers} 
              className="p-3.5 glass-btn rounded-2xl text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
              title="Refresh Directory"
            >
              <RefreshCw size={14} />
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
            placeholder="Search by name, email, register no..."
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
            <GlassCard 
              key={item.id} 
              className={`p-6 rounded-[2.2rem] flex flex-col justify-between group border transition-all ${
                item.is_active === false ? 'border-rose-500/20 bg-rose-950/10 opacity-75' : 'border-white/[0.04]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <img 
                      src={item.avatar} 
                      alt={item.name} 
                      className={`w-14 h-14 rounded-2xl object-cover border ${
                        item.is_active === false ? 'border-rose-500/40 grayscale' : 'border-white/10'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.name.replace(' ', '+')}&background=1e3a8a&color=fff`;
                      }}
                    />
                    {item.is_active === false && (
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded-md tracking-wider">
                        OFF
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                      item.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      item.role === 'FACULTY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-slate-500/10 text-slate-400 border border-white/5'
                    }`}>
                      {item.role}
                    </span>

                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item.is_active === false 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {item.is_active === false ? 'Deactivated' : 'Active'}
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-slate-100 tracking-tight text-base mb-1 line-clamp-1">{item.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5 mb-2 line-clamp-1">
                  <Mail size={10} className="text-slate-600 shrink-0" />
                  {item.email}
                </p>

                {/* Login ID / Register No badge */}
                {(item.login_id || item.enrollment_no) && (
                  <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-wider">
                    <User size={10} />
                    <span>ID: {item.login_id || item.enrollment_no}</span>
                  </div>
                )}

                <div className="space-y-2 mt-2 pt-3 border-t border-white/[0.04]">
                  {item.department && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Building size={12} className="text-slate-600 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.department}</span>
                    </div>
                  )}

                  {item.semester && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Award size={12} className="text-slate-600 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Sem {item.semester} {item.section ? `• Sec ${item.section}` : ''}
                      </span>
                    </div>
                  )}

                  {item.designation && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Award size={12} className="text-slate-600 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.designation}</span>
                    </div>
                  )}

                  {item.phone && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Phone size={12} className="text-slate-600 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Actions Bar */}
              {isAdmin && item.id !== 'user-admin' && (
                <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {/* Edit Department/Section */}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all text-[10px] font-bold"
                      title="Edit Department / Section"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Reset Password */}
                    <button
                      onClick={() => handleResetPassword(item)}
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all text-[10px] font-bold"
                      title="Reset Password (Generates New Temporary Password)"
                    >
                      <KeyRound size={15} />
                    </button>

                    {/* Export Data Archive (DPDP / GDPR) */}
                    <button
                      onClick={() => handleExportData(item)}
                      disabled={isExporting === item.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-[10px] font-bold"
                      title="Export Personal Data Archive (JSON)"
                    >
                      {isExporting === item.id ? (
                        <Loader2 size={15} className="animate-spin text-emerald-400" />
                      ) : (
                        <Download size={15} />
                      )}
                    </button>

                    {/* Purge Student Data (Right-to-be-Forgotten) */}
                    {item.role === 'STUDENT' && (
                      <button
                        onClick={() => handleOpenPurge(item)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-[10px] font-bold"
                        title="Purge & Anonymize Student Data (DPDP / Right to be Forgotten)"
                      >
                        <UserX size={15} />
                      </button>
                    )}
                  </div>

                  {/* Deactivate / Reactivate Toggle */}
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      item.is_active === false
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                    }`}
                    title={item.is_active === false ? 'Reactivate Account' : 'Deactivate Account'}
                  >
                    {item.is_active === false ? (
                      <>
                        <ToggleRight size={14} /> Reactivate
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={14} /> Deactivate
                      </>
                    )}
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

      {/* MODAL 1: ADD STUDENT */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10 max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setIsAddStudentOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><UserPlus size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Provision Student Account</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Generates secure login ID & temporary password</p>
              </div>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Student Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={stuName}
                  onChange={(e) => setStuName(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Register No / Roll No *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 2026/CS/080"
                    value={stuRegisterNo}
                    onChange={(e) => setStuRegisterNo(e.target.value)}
                    className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Institutional Email *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="student@edusphere.edu.in"
                    value={stuEmail}
                    onChange={(e) => setStuEmail(e.target.value)}
                    className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department *</label>
                <select 
                  value={stuDept}
                  onChange={(e) => setStuDept(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                >
                  <option value="Computer Science" className="bg-slate-900 text-slate-100">Computer Science (CSE)</option>
                  <option value="Mechanical Eng" className="bg-slate-900 text-slate-100">Mechanical Engineering (MECH)</option>
                  <option value="Electrical Eng" className="bg-slate-900 text-slate-100">Electrical Engineering (EEE)</option>
                  <option value="Information Tech" className="bg-slate-900 text-slate-100">Information Technology (IT)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Semester (1 - 8) *</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={8}
                    required
                    value={stuSemester}
                    onChange={(e) => setStuSemester(Number(e.target.value))}
                    className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Section (e.g. A, B, C) *</label>
                  <input 
                    type="text" 
                    maxLength={3}
                    required
                    value={stuSection}
                    onChange={(e) => setStuSection(e.target.value)}
                    className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold uppercase"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="flex-1 py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingStudent ? (
                    <><Loader2 size={12} className="animate-spin" /> Provisioning...</>
                  ) : (
                    'Provision Student'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD FACULTY */}
      {isAddFacultyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10 max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setIsAddFacultyOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-emerald-400"><Award size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Provision Faculty Account</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Generates secure FAC ID & temporary password</p>
              </div>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Faculty Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Institutional Email *</label>
                <input 
                  type="email" 
                  required
                  placeholder="prof.sarah@edusphere.edu.in"
                  value={facEmail}
                  onChange={(e) => setFacEmail(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department *</label>
                  <select 
                    value={facDept}
                    onChange={(e) => setFacDept(e.target.value)}
                    className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                  >
                    <option value="Computer Science" className="bg-slate-900 text-slate-100">Computer Science (CSE)</option>
                    <option value="Mechanical Eng" className="bg-slate-900 text-slate-100">Mechanical Engineering (MECH)</option>
                    <option value="Electrical Eng" className="bg-slate-900 text-slate-100">Electrical Engineering (EEE)</option>
                    <option value="Information Tech" className="bg-slate-900 text-slate-100">Information Technology (IT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Designation</label>
                  <input 
                    type="text" 
                    value={facDesignation}
                    onChange={(e) => setFacDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor"
                    className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contact Phone</label>
                <input 
                  type="text" 
                  value={facPhone}
                  onChange={(e) => setFacPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddFacultyOpen(false)}
                  className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingFaculty}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingFaculty ? (
                    <><Loader2 size={12} className="animate-spin" /> Provisioning...</>
                  ) : (
                    'Provision Faculty'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK IMPORT */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-4xl glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10 max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => {
                setIsBulkImportOpen(false);
                setSelectedFile(null);
                setPreviewData(null);
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-violet-400"><FileSpreadsheet size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Bulk Student Account Provisioning</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Upload CSV → Review row validation → Download in-memory credentials sheet
                </p>
              </div>
            </div>

            {/* Step 1: File Upload */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-xs font-bold text-slate-200">Required CSV Columns:</p>
                  <p className="text-[11px] font-mono text-indigo-300 mt-0.5">
                    name, register_no, email, department, semester, section
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="px-4 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white shrink-0"
                >
                  Download Template CSV
                </button>
              </div>

              <div className="relative border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition-colors">
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload size={24} className="mx-auto text-indigo-400 mb-2" />
                <p className="text-xs font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to select or drop CSV file'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">UTF-8 Encoded CSV</p>
              </div>
            </div>

            {/* Step 2: Preview & Validation Table */}
            {previewLoading && (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
                <span className="text-xs font-bold text-slate-400">Validating rows and checking database duplicates...</span>
              </div>
            )}

            {previewData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-white/5 text-xs">
                  <div className="flex gap-4">
                    <span className="text-slate-400 font-bold">Total: {previewData.total_rows}</span>
                    <span className="text-emerald-400 font-bold">Valid: {previewData.valid_count}</span>
                    <span className="text-rose-400 font-bold">Errors: {previewData.invalid_count}</span>
                  </div>
                  {previewData.invalid_count > 0 && (
                    <span className="text-amber-400 text-[11px] font-bold flex items-center gap-1">
                      <AlertTriangle size={14} /> Only valid rows will be provisioned
                    </span>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto border border-white/5 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 sticky top-0 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Register No</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Dept / Sem / Sec</th>
                        <th className="p-3">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewData.preview.map((row) => (
                        <tr key={row.row} className={row.valid ? 'hover:bg-white/[0.02]' : 'bg-rose-500/5'}>
                          <td className="p-3 font-mono text-slate-500">{row.row}</td>
                          <td className="p-3 font-semibold text-slate-200">{row.name}</td>
                          <td className="p-3 font-mono text-indigo-300">{row.register_no}</td>
                          <td className="p-3 text-slate-400">{row.email}</td>
                          <td className="p-3 text-slate-400">{row.department} (S{row.semester}-{row.section})</td>
                          <td className="p-3">
                            {row.valid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                                <CheckCircle2 size={12} /> Ready
                              </span>
                            ) : (
                              <div className="text-rose-400 text-[10px] font-bold space-y-0.5">
                                {row.errors.map((err, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <AlertCircle size={10} /> {err}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewData(null);
                    }}
                    className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleConfirmBulkImport}
                    disabled={importLoading || previewData.valid_count === 0}
                    className="flex-1 py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
                  >
                    {importLoading ? (
                      <><Loader2 size={12} className="animate-spin" /> Provisioning & Generating Sheet...</>
                    ) : (
                      `Confirm & Import (${previewData.valid_count} Accounts)`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: TEMPORARY CREDENTIALS SHEET (SHOWN ONCE) */}
      {isCredentialsModalOpen && credentialDetails && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md glass glass-edge rounded-[3rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-amber-500/30"
            style={{ background: 'rgba(12,14,24,0.98)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl"><KeyRound size={22} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Temporary Credentials</h3>
                <p className="text-[10px] text-amber-400 font-black uppercase tracking-wider">Notice: Shown Only Once</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6 space-y-1">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" /> Important Security Policy
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This temporary password is never logged or stored in plain text. Share this with the user immediately. 
                They will be required to create their permanent password on first login.
              </p>
            </div>

            <div className="space-y-3.5 mb-6">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">User Name</span>
                <span className="text-sm font-bold text-slate-200">{credentialDetails.name}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Assigned Login ID</span>
                <span className="text-sm font-mono font-bold text-indigo-300">{credentialDetails.login_id}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Temporary Password</span>
                  <button
                    onClick={() => copyToClipboard(credentialDetails.temp_password)}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="text-base font-mono font-bold text-amber-300 tracking-wider select-all block mt-1">
                  {credentialDetails.temp_password}
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                setIsCredentialsModalOpen(false);
                setCredentialDetails(null);
              }}
              className="w-full py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg"
            >
              I Have Saved These Credentials
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT USER PROFILE */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md glass glass-edge rounded-[3rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/10"
            style={{ background: 'rgba(10,15,30,0.95)' }}
          >
            <button 
              onClick={() => setIsEditUserOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-2xl text-indigo-400"><Edit3 size={20} /></div>
              <div>
                <h3 className="font-black text-lg text-slate-100 uppercase tracking-wide">Edit Member Profile</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{editingUser.name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department</label>
                <input 
                  type="text" 
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                />
              </div>

              {editingUser.role === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Semester</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={8}
                      value={editSemester}
                      onChange={(e) => setEditSemester(Number(e.target.value))}
                      className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Section</label>
                    <input 
                      type="text" 
                      maxLength={3}
                      value={editSection}
                      onChange={(e) => setEditSection(e.target.value.toUpperCase())}
                      className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-4 glass-btn-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <><Loader2 size={12} className="animate-spin" /> Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PURGE STUDENT DATA */}
      {isPurgeModalOpen && purgeTargetUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-in fade-in duration-300">
          <div 
            className="w-full max-w-lg glass glass-edge rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 border border-rose-500/30 max-h-[90vh] overflow-y-auto"
            style={{ background: 'rgba(20,10,15,0.95)' }}
          >
            <button 
              onClick={() => { setIsPurgeModalOpen(false); setPurgeTargetUser(null); }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-black text-lg text-rose-300 uppercase tracking-wide">Purge Student PII</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Irreversible DPDP / Right to be Forgotten Action
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 mb-6 text-xs text-rose-200/90 leading-relaxed space-y-2">
              <p>
                You are about to purge personal data for <strong>{purgeTargetUser.name}</strong> (ID: {purgeTargetUser.login_id || purgeTargetUser.id}).
              </p>
              <p className="text-[11px] text-rose-300/80">
                • Name, email, phone, and active sessions will be permanently scrubbed.<br/>
                • Account will be permanently deactivated.<br/>
                • This administrative action will be recorded in the immutable audit log.
              </p>
            </div>

            <form onSubmit={handleExecutePurge} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Reason for Data Purge / Deletion *
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="e.g. Formal Student Right-to-be-Forgotten request / Graduation data retention period reached"
                  value={purgeReason}
                  onChange={(e) => setPurgeReason(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm font-semibold text-slate-200"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setIsPurgeModalOpen(false); setPurgeTargetUser(null); }}
                  className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPurging || !purgeReason.trim()}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40"
                >
                  {isPurging ? (
                    <><Loader2 size={14} className="animate-spin" /> Purging...</>
                  ) : (
                    <><UserX size={14} /> Confirm Purge</>
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

