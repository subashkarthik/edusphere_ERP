import React from 'react';
import { ShieldCheck, Lock, FileText, Database, UserX, Download, Mail, ArrowLeft } from 'lucide-react';

interface PrivacyNoticeProps {
  onBack?: () => void;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#050816] text-white p-6 md:p-12 relative overflow-hidden flex flex-col items-center">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <button
            onClick={onBack || (() => window.history.back())}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition border border-white/10"
          >
            <ArrowLeft size={16} />
            Back to Portal
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
              DPDP 2023 & GDPR Compliant
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck size={14} /> Institutional Data Protection
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            EduSphere Privacy & Personal Data Notice
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            EduSphere is committed to the highest standards of data privacy and confidentiality for our university students, faculty, and academic administration.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Card 1 */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Database size={20} />
            </div>
            <h2 className="text-base font-bold text-white mb-2">1. Personal Data We Collect</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We collect strictly educational and institutional records necessary for academic operations:
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">• Student Name, Register/Enrollment ID, University Email</li>
              <li className="flex items-center gap-2">• Course enrollments, attendance logs, and session participation</li>
              <li className="flex items-center gap-2">• Assessment scores, quiz answers, and assignment submissions</li>
              <li className="flex items-center gap-2">• Cryptographic certificate verification and audit logs</li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Lock size={20} />
            </div>
            <h2 className="text-base font-bold text-white mb-2">2. PII Protection & Masking</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We enforce strict data minimization across all public and peer-facing API endpoints:
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">• Password hashes and tokens are strictly excluded from API outputs</li>
              <li className="flex items-center gap-2">• Phone numbers and emails are masked in directory rosters</li>
              <li className="flex items-center gap-2">• Multi-tenant tenant scoping prevents cross-institution data access</li>
              <li className="flex items-center gap-2">• Private storage with HMAC-signed expiring URLs</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Download size={20} />
            </div>
            <h2 className="text-base font-bold text-white mb-2">3. Right to Data Portability</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              In accordance with Section 12 of the DPDP Act 2023 and Article 20 GDPR, students may export their complete institutional record in machine-readable JSON format via the administration portal at any time.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <UserX size={20} />
            </div>
            <h2 className="text-base font-bold text-white mb-2">4. Right to Erasure / Anonymization</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Graduated students or withdrawn scholars can request complete data erasure. The administration executes cryptographic anonymization while recording an immutable AuditLog entry for institutional records.
            </p>
          </div>
        </div>

        {/* Contact DPO Card */}
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">University Data Protection Office</h3>
              <p className="text-xs text-slate-400">Questions or data export requests? Contact our institutional DPO team.</p>
            </div>
          </div>
          <a
            href="mailto:privacy@edusphere.edu.in"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition shrink-0"
          >
            privacy@edusphere.edu.in
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNotice;
