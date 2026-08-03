import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { Award, GraduationCap, CheckCircle2, AlertTriangle, Clock, BookOpen, ChevronRight, ShieldCheck, Download, Sparkles, Layers } from 'lucide-react';
import GlassCard from '../components/GlassCard';

interface DegreeAuditViewProps {
  user: UserProfile;
}

export const DegreeAuditView: React.FC<DegreeAuditViewProps> = ({ user }) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'CORE' | 'ELECTIVE' | 'LAB'>('ALL');

  const auditSummary = {
    degreeName: 'Bachelor of Engineering in Computer Science & Engineering',
    catalogYear: '2022 - 2026',
    currentSemester: 'Semester 7',
    totalCreditsRequired: 160,
    totalCreditsEarned: 138,
    gpa: 8.92,
    academicStanding: "DEAN'S HONORS LIST (FIRST CLASS WITH DISTINCTION)",
    graduationStatus: 'ON TRACK FOR MAY 2026 CONVOCATION',
  };

  const courseCategories = [
    {
      category: 'CORE',
      title: 'Core Computer Science Engineering',
      required: 80,
      completed: 72,
      courses: [
        { code: 'CS8701', name: 'Theory of Computation', credits: 4, grade: 'A+', status: 'COMPLETED' },
        { code: 'CS8702', name: 'Data Structures & Algorithms', credits: 4, grade: 'S', status: 'COMPLETED' },
        { code: 'CS8703', name: 'Database Management Systems', credits: 4, grade: 'A+', status: 'COMPLETED' },
        { code: 'CS8704', name: 'Computer Networks Architecture', credits: 4, grade: 'A', status: 'COMPLETED' },
        { code: 'CS8705', name: 'Operating Systems & Kernel Engineering', credits: 4, grade: 'A+', status: 'IN_PROGRESS' },
      ]
    },
    {
      category: 'ELECTIVE',
      title: 'Professional & Open Electives',
      required: 40,
      completed: 34,
      courses: [
        { code: 'CS8711', name: 'Ethical Hacking & Cyber Security', credits: 3, grade: 'S', status: 'COMPLETED' },
        { code: 'CS8712', name: 'Cloud Infrastructure & DevOps', credits: 3, grade: 'A+', status: 'COMPLETED' },
        { code: 'CS8713', name: 'Artificial Intelligence & Machine Learning', credits: 3, grade: 'A', status: 'COMPLETED' },
        { code: 'CS8714', name: 'Natural Language Processing', credits: 3, grade: '-', status: 'PLANNED_SEM8' },
      ]
    },
    {
      category: 'LAB',
      title: 'Practical & Laboratory Workshops',
      required: 40,
      completed: 32,
      courses: [
        { code: 'CS8721', name: 'Cloud Computing Laboratory', credits: 2, grade: 'S', status: 'COMPLETED' },
        { code: 'CS8722', name: 'Web Application Security Lab', credits: 2, grade: 'A+', status: 'COMPLETED' },
        { code: 'CS8723', name: 'Networks & Microprocessors Lab', credits: 2, grade: 'A', status: 'COMPLETED' },
      ]
    }
  ];

  const completionPct = Math.round((auditSummary.totalCreditsEarned / auditSummary.totalCreditsRequired) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Banner */}
      <GlassCard className="p-8 rounded-[2.5rem] relative overflow-hidden" hover={false}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              <GraduationCap size={16} /> Workday ERP Engine • Institutional Compliance
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">Degree Audit & Graduation Readiness</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">{auditSummary.degreeName} • {auditSummary.catalogYear}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert('Official Academic Transcript PDF downloaded.')}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center gap-2"
            >
              <Download size={16} /> Export Official Audit PDF
            </button>
          </div>
        </div>

        {/* Audit Status Bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Academic Standing</p>
            <p className="text-xs font-black text-emerald-400 mt-1 flex items-center gap-1">
              <Award size={14} /> {auditSummary.academicStanding}
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Credits Progress</p>
            <p className="text-sm font-black text-indigo-400 mt-1">
              {auditSummary.totalCreditsEarned} / {auditSummary.totalCreditsRequired} Credits ({completionPct}%)
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cumulative CGPA</p>
            <p className="text-sm font-black text-white mt-1">{auditSummary.gpa} / 10.00</p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Graduation Status</p>
            <p className="text-xs font-black text-amber-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={14} /> {auditSummary.graduationStatus}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Progress Bar */}
      <GlassCard className="p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Overall Degree Completion Index</span>
          <span className="text-xs font-black text-indigo-400">{completionPct}% Completed</span>
        </div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </GlassCard>

      {/* Course Categories Breakdown */}
      <div className="space-y-6">
        {courseCategories.map((cat, idx) => (
          <GlassCard key={idx} className="p-8 rounded-[2.5rem]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-2.5 py-1 bg-indigo-500/20 rounded-md">
                  {cat.category} REQUIREMENTS
                </span>
                <h3 className="text-lg font-black text-slate-100 mt-2">{cat.title}</h3>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-slate-300">
                  {cat.completed} / {cat.required} Credits Earned
                </span>
                <div className="w-36 h-1.5 bg-slate-950 rounded-full mt-2 overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(cat.completed / cat.required) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="pb-3">Course Code</th>
                    <th className="pb-3">Course Title</th>
                    <th className="pb-3">Credits</th>
                    <th className="pb-3">Grade</th>
                    <th className="pb-3 text-right">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {cat.courses.map((course, cIdx) => (
                    <tr key={cIdx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 text-xs font-black text-indigo-400">{course.code}</td>
                      <td className="py-4 text-xs font-bold text-slate-200">{course.name}</td>
                      <td className="py-4 text-xs font-bold text-slate-400">{course.credits}</td>
                      <td className="py-4 text-xs font-black text-emerald-400">{course.grade}</td>
                      <td className="py-4 text-right">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                          course.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                          course.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {course.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ))}
      </div>

    </div>
  );
};

export default DegreeAuditView;
