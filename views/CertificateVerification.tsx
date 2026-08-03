import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, XCircle, Search, ShieldCheck, ExternalLink, Sparkles, Building, Calendar, User } from 'lucide-react';

const CertificateVerification: React.FC = () => {
  const [code, setCode] = useState('');
  const [certData, setCertData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract code from URL query or path if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode) {
      setCode(urlCode);
      verifyCode(urlCode);
    }
  }, []);

  const verifyCode = async (searchCode: string) => {
    if (!searchCode.trim()) return;
    setLoading(true);
    setError('');
    setCertData(null);

    try {
      const res = await fetch(`/api/public/verify-certificate/${encodeURIComponent(searchCode.trim())}`);
      if (!res.ok) {
        throw new Error("Certificate code not found or unverified.");
      }
      const data = await res.json();
      setCertData(data);
    } catch (err: any) {
      setError(err.message || "Invalid certificate verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white p-4 md:p-12 flex flex-col items-center justify-center font-sans selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest">
            <ShieldCheck size={14} /> Official Public Verification Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            EduSphere <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">Certificate Verification</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium max-w-md mx-auto">
            Verify academic course completion credentials, graduate evaluations, and tamper-proof ReportLab PDFs.
          </p>
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-3 rounded-2xl flex items-center gap-3">
          <div className="relative flex-1">
            <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Enter Certificate Code (e.g. CERT20260001)..." 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode(code)}
              className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-xs font-bold uppercase tracking-wider text-white"
            />
          </div>
          <button 
            onClick={() => verifyCode(code)}
            disabled={loading}
            className="glass-btn-primary px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white shrink-0"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </div>

        {/* Verification Result Card */}
        {error && (
          <div className="glass p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center gap-4 text-rose-300">
            <XCircle size={28} className="shrink-0" />
            <div>
              <h4 className="font-extrabold text-white text-sm">Verification Unsuccessful</h4>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {certData && (
          <div className="glass-panel p-8 rounded-3xl space-y-6 border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Status Verified</span>
                  <h3 className="text-lg font-black text-white">Authentic University Certificate</h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-mono font-bold text-slate-300">{certData.certificate_code}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Graduate Name</span>
                <span className="font-extrabold text-white text-sm">{certData.student_name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Register / Enrollment No</span>
                <span className="font-extrabold text-white text-sm">{certData.enrollment_no}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Course Program</span>
                <span className="font-extrabold text-indigo-300 text-sm">{certData.course_title} ({certData.course_code})</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Date of Issue</span>
                <span className="font-extrabold text-white text-sm">{certData.issued_date}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Attendance Record</span>
                <span className="font-extrabold text-emerald-400 text-sm">{certData.attendance_percentage}% Verified</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Evaluation Score</span>
                <span className="font-extrabold text-emerald-400 text-sm">{certData.assessment_score}% Grade A</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Issuer: {certData.issuer}</span>
              <span className="text-emerald-400 font-bold">Encrypted & Verified</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CertificateVerification;
