import React, { useState, useEffect } from 'react';
import { 
  Award, CheckCircle2, AlertTriangle, Download, ShieldCheck, 
  Settings, RefreshCw, FileText, Lock, ExternalLink, X, Search,
  Sliders, User, Check, XCircle, Eye, ShieldAlert, Sparkles
} from 'lucide-react';
import { UserRole, UserProfile, CertificateRecord, CertificateSettings } from '../types';
import { certificatesApi, reportsApi, getAccessToken } from '../services/api';

interface CertificationsModuleProps {
  user: UserProfile;
}

const CertificationsModule: React.FC<CertificationsModuleProps> = ({ user }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const isFaculty = user.role === UserRole.FACULTY;
  const isStudent = user.role === UserRole.STUDENT;

  const [loading, setLoading] = useState<boolean>(true);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [settings, setSettings] = useState<CertificateSettings>({
    org_id: 'org-edusphere',
    min_attendance_pct: 75,
    min_assessment_pct: 50,
    min_progress_pct: 100,
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [editAttendanceThreshold, setEditAttendanceThreshold] = useState<number>(75);
  const [editAssessmentThreshold, setEditAssessmentThreshold] = useState<number>(50);
  const [editProgressThreshold, setEditProgressThreshold] = useState<number>(100);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCertificates = async () => {
    setLoading(true);
    setActionError(null);
    try {
      // 1. Fetch threshold settings
      const settingsData = await certificatesApi.getSettings();
      if (settingsData) {
        setSettings(settingsData);
        setEditAttendanceThreshold(settingsData.min_attendance_pct ?? 75);
        setEditAssessmentThreshold(settingsData.min_assessment_pct ?? 50);
        setEditProgressThreshold(settingsData.min_progress_pct ?? 100);
      }

      // 2. Fetch student or admin/faculty certificates
      const certsData = await certificatesApi.getCertificates(isAdmin || isFaculty);
      setCertificates(Array.isArray(certsData) ? certsData : []);
    } catch (err: any) {
      console.error('[CertificatesModule] Fetch error:', err);
      setActionError(err.message || 'Failed to fetch certificates from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [user.id, user.role]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await certificatesApi.updateSettings({
        min_attendance_pct: editAttendanceThreshold,
        min_assessment_pct: editAssessmentThreshold,
        min_progress_pct: editProgressThreshold,
      });
      setSettings(res);
      setShowSettingsModal(false);
      setActionSuccess('Certification issuance criteria updated successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCertificates();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update certification settings.');
    }
  };

  const handleRevoke = async (certId: string, certCode?: string | null) => {
    const target = certCode || certId;
    if (!window.confirm(`Are you sure you want to permanently revoke certificate ${target}?`)) return;

    try {
      await certificatesApi.revokeCertificate(certId);
      setActionSuccess(`Certificate ${target} has been revoked.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCertificates();
    } catch (err: any) {
      setActionError(err.message || 'Failed to revoke certificate.');
    }
  };

  const handleDownloadPdf = async (certCode: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/certificates/download-pdf/${certCode}.pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Download failed' }));
        throw new Error(err.detail || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download certificate PDF.');
    }
  };

  const filteredCerts = certificates.filter(c => {
    const s = searchTerm.toLowerCase();
    return (
      c.course_name?.toLowerCase().includes(s) ||
      c.course_code?.toLowerCase().includes(s) ||
      c.student_name?.toLowerCase().includes(s) ||
      c.certificate_code?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 border border-white/10 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-black uppercase tracking-widest">
              <Award size={14} /> Integrated Academic Certification Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Institutional <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">Certificates & Credentials</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl">
              Strict 3-pillar criteria verification: Attendance &ge; {settings.min_attendance_pct}%, Assessment &ge; {settings.min_assessment_pct}%, and Syllabus Progress &ge; {settings.min_progress_pct ?? 100}%.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {(isAdmin || isFaculty) && (
              <button
                onClick={async () => {
                  try {
                    await reportsApi.downloadCertificatesCSV();
                  } catch (e: any) {
                    alert(e.message || 'Export failed');
                  }
                }}
                className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                title="Export certificates ledger to CSV (Excel format)"
              >
                <Download size={15} /> Export CSV
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/10 transition-all active:scale-95"
              >
                <Sliders size={16} /> Criteria Thresholds
              </button>
            )}
            <button
              onClick={fetchCertificates}
              disabled={loading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-bold animate-in fade-in">
          <AlertTriangle size={18} className="shrink-0 text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-panel p-3 rounded-2xl flex items-center gap-3">
        <Search size={18} className="text-slate-400 ml-2" />
        <input
          type="text"
          placeholder={isStudent ? "Search your enrolled courses..." : "Search students, course codes, or certificate IDs..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 font-medium"
        />
      </div>

      {/* STUDENT VIEW */}
      {isStudent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
              Enrolled Courses &amp; Certification Eligibility
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {filteredCerts.length} Course{filteredCerts.length !== 1 ? 's' : ''} Enrolled
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-3 glass-panel rounded-3xl">
              <RefreshCw size={24} className="animate-spin text-indigo-400" />
              Evaluating academic records, attendance ledgers, and quiz assessments...
            </div>
          ) : filteredCerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold glass-panel rounded-3xl space-y-2">
              <Award size={32} className="mx-auto text-slate-500 mb-2" />
              <p className="text-white text-sm font-black">No Course Enrollments Found</p>
              <p className="text-slate-400 text-xs">Enroll in courses from the Course Catalog to track your academic certification progress.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCerts.map((cert) => {
                const attnMet = cert.attendance_pct >= (cert.attendance_threshold ?? settings.min_attendance_pct);
                const assessMet = cert.assessment_pct >= (cert.assessment_threshold ?? settings.min_assessment_pct);
                const progMet = (cert.progress_pct ?? 0) >= (settings.min_progress_pct ?? 100);
                const isFullyEligible = cert.is_eligible ?? (attnMet && assessMet && progMet);
                const isIssued = Boolean(cert.has_certificate && cert.eligibility_status === 'ISSUED');
                const isRevoked = cert.eligibility_status === 'REVOKED';

                return (
                  <div 
                    key={cert.id || cert.course_id}
                    className={`glass-panel p-6 rounded-3xl border transition-all space-y-5 ${
                      isRevoked 
                        ? 'border-rose-500/30 bg-rose-500/5' 
                        : isIssued 
                          ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50' 
                          : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header: Course Code & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider">
                          {cert.course_code || 'COURSE'}
                        </span>
                        <h3 className="text-base font-black text-white mt-2 leading-tight">
                          {cert.course_name}
                        </h3>
                      </div>

                      <div>
                        {isRevoked ? (
                          <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                            <ShieldAlert size={12} /> Revoked
                          </span>
                        ) : isIssued ? (
                          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> Issued
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                            <Lock size={12} /> In Progress
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3-Pillar Eligibility Checklist */}
                    <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                        Criteria Evaluation Checklist
                      </span>

                      {/* 1. Attendance */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-medium">Attendance Requirement (&ge;{cert.attendance_threshold ?? settings.min_attendance_pct}%):</span>
                        <span className={`font-mono font-bold inline-flex items-center gap-1 ${cert.attendance_pct === null ? 'text-slate-400' : attnMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {cert.attendance_pct !== null && cert.attendance_pct !== undefined ? `${cert.attendance_pct}%` : 'No classes held yet'} {cert.attendance_pct !== null && (attnMet ? <Check size={14} /> : <XCircle size={14} />)}
                        </span>
                      </div>

                      {/* 2. Assessment Score */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-medium">Assessment Score (&ge;{cert.assessment_threshold ?? settings.min_assessment_pct}%):</span>
                        <span className={`font-mono font-bold inline-flex items-center gap-1 ${cert.assessment_pct === null ? 'text-slate-400' : assessMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {cert.assessment_pct !== null && cert.assessment_pct !== undefined ? `${cert.assessment_pct}%` : 'Pending'} {cert.assessment_pct !== null && (assessMet ? <Check size={14} /> : <XCircle size={14} />)}
                        </span>
                      </div>

                      {/* 3. Syllabus Progress */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-medium">Course Progress (== 100%):</span>
                        <span className={`font-mono font-bold inline-flex items-center gap-1 ${progMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {cert.progress_pct ?? 0}% {progMet ? <Check size={14} /> : <XCircle size={14} />}
                        </span>
                      </div>
                    </div>

                    {/* Certificate Code Info */}
                    {cert.certificate_code && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Code: <strong className="font-mono text-white">{cert.certificate_code}</strong></span>
                        <span>Issued: {cert.issued_date}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      {isIssued && cert.certificate_code ? (
                        <>
                          <button
                            onClick={() => handleDownloadPdf(cert.certificate_code!)}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                          >
                            <Download size={15} /> Download PDF
                          </button>
                          <a
                            href={`/verify/${cert.certificate_code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            title="Verify Authentic QR Link"
                          >
                            <ExternalLink size={14} /> Verify
                          </a>
                        </>
                      ) : isFullyEligible && !isRevoked ? (
                        <button
                          onClick={async () => {
                            try {
                              await certificatesApi.issueCertificate(cert.course_id);
                              setActionSuccess(`Certificate for ${cert.course_name} issued successfully!`);
                              fetchCertificates();
                            } catch (err: any) {
                              setActionError(err.message || 'Failed to issue certificate.');
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                        >
                          <Award size={15} /> Claim Certificate (Eligible)
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <Lock size={14} className="text-rose-400" />
                          {cert.reasons && cert.reasons.length > 0
                            ? cert.reasons[0]
                            : "Not eligible: academic requirements pending"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FACULTY / ADMIN VIEW */}
      {(isAdmin || isFaculty) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
              Issued Certificates &amp; Student Evaluations Ledger
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {filteredCerts.length} Record{filteredCerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Attendance</th>
                    <th className="py-3.5 px-4">Assessment</th>
                    <th className="py-3.5 px-4">Progress</th>
                    <th className="py-3.5 px-4">Certificate ID</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <RefreshCw size={20} className="animate-spin mx-auto text-indigo-400 mb-2" />
                        Loading certificate records...
                      </td>
                    </tr>
                  ) : filteredCerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        No certificate evaluations matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCerts.map((cert) => {
                      const isRevoked = cert.eligibility_status === 'REVOKED';
                      const isIssued = cert.eligibility_status === 'ISSUED';

                      return (
                        <tr key={cert.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{cert.student_name}</div>
                            <div className="text-[10px] text-slate-400">{cert.student_email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-indigo-300">{cert.course_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{cert.course_code}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className={cert.attendance_pct >= settings.min_attendance_pct ? 'text-emerald-400' : 'text-rose-400'}>
                              {cert.attendance_pct}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className={cert.assessment_pct >= settings.min_assessment_pct ? 'text-emerald-400' : 'text-rose-400'}>
                              {cert.assessment_pct}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className={(cert.progress_pct ?? 100) >= (settings.min_progress_pct ?? 100) ? 'text-emerald-400' : 'text-rose-400'}>
                              {cert.progress_pct ?? 100}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                            {cert.certificate_code || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isRevoked ? (
                              <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-black uppercase">
                                REVOKED
                              </span>
                            ) : isIssued ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase">
                                ISSUED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-full text-[10px] font-black uppercase">
                                INELIGIBLE
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {cert.certificate_code && isIssued && (
                                <button
                                  onClick={() => handleDownloadPdf(cert.certificate_code!)}
                                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                  title="Download PDF"
                                >
                                  <Download size={14} />
                                </button>
                              )}
                              {cert.certificate_code && (
                                <a
                                  href={`/verify/${cert.certificate_code}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg transition-colors"
                                  title="Open Public Verification"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                              {(isAdmin || isFaculty) && !isIssued && !isRevoked && (
                                <button
                                  onClick={async () => {
                                    const reason = window.prompt(`Enter written justification reason for manual certificate override for ${cert.student_name}:`);
                                    if (!reason || reason.trim().length < 5) {
                                      if (reason !== null) alert("A valid written justification reason (minimum 5 characters) is required.");
                                      return;
                                    }
                                    try {
                                      await certificatesApi.overrideCertificate(cert.user_id, cert.course_id, reason.trim());
                                      setActionSuccess(`Manual override recorded and certificate issued for ${cert.student_name}.`);
                                      fetchCertificates();
                                    } catch (e: any) {
                                      setActionError(e.message || "Failed to override certificate.");
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase transition-all"
                                  title="Manual Override with Written Justification"
                                >
                                  Override
                                </button>
                              )}
                              {isAdmin && !isRevoked && isIssued && (
                                <button
                                  onClick={() => handleRevoke(cert.id, cert.certificate_code)}
                                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-black uppercase transition-all"
                                  title="Revoke Certificate"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Settings Modal for Admin */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel p-6 md:p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sliders size={20} className="text-indigo-400" />
                <h3 className="text-lg font-black text-white">Certification Thresholds</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                  Minimum Attendance Percentage (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editAttendanceThreshold}
                  onChange={(e) => setEditAttendanceThreshold(Number(e.target.value))}
                  className="w-full glass-input rounded-xl p-3 text-sm font-bold text-white"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 75% required attendance across sessions.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                  Minimum Assessment Score Percentage (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editAssessmentThreshold}
                  onChange={(e) => setEditAssessmentThreshold(Number(e.target.value))}
                  className="w-full glass-input rounded-xl p-3 text-sm font-bold text-white"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 50% combined score in quizzes & assignments.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                  Course Syllabus Progress Percentage (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editProgressThreshold}
                  onChange={(e) => setEditProgressThreshold(Number(e.target.value))}
                  className="w-full glass-input rounded-xl p-3 text-sm font-bold text-white"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 100% completion of course lessons.</span>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificationsModule;
