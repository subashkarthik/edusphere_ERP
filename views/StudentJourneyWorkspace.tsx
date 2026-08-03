import React, { useState } from 'react';
import { 
  Sparkles, Award, BookOpen, Activity, Calendar, 
  Clock, CheckCircle2, AlertTriangle, ArrowUpRight, 
  Briefcase, Library, Zap, Play, ChevronRight, FileText
} from 'lucide-react';
import { MOCK_ATTENDANCE, MOCK_TIMETABLE, RECENT_PLACEMENT_DRIVES } from '../constants';

const StudentJourneyWorkspace: React.FC = () => {
  const [absenceCalculator, setAbsenceCalculator] = useState(0);

  const calculateSafeClasses = (classesHeld: number, classesAttended: number) => {
    // 75% requirement target
    const currentPct = (classesAttended / classesHeld) * 100;
    const canBunk = Math.max(0, Math.floor((classesAttended - 0.75 * classesHeld) / 0.75));
    return canBunk;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Student Journey Welcome Banner */}
      <div className="glass-panel p-8 md:p-10 rounded-[32px] border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent blur-[120px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-400" />
                Personalized Learning Journey
              </span>
              <span className="text-xs font-bold text-slate-400">S6 • B.Tech CSE</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Alex Johnson's Career Velocity
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-xl mt-2 leading-relaxed">
              Targeting 3.85 GPA & Tier-1 Software Engineering Placement. AI Velocity is currently operating at 94% optimal output.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            <div className="text-center px-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Predictive CGPA</span>
              <span className="text-2xl font-black text-emerald-400">3.82 / 4.0</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="text-center px-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Placement Match</span>
              <span className="text-2xl font-black text-indigo-400">96.4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Attendance Health & Study Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Attendance Health & Absence Budget Calculator (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 md:p-8 rounded-[32px] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Attendance Health & Bunk Calculator</h3>
                <p className="text-xs text-slate-400 font-medium">Maintain institutional 75% compliance threshold</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
                Overall: 88.2%
              </span>
            </div>

            {/* Attendance Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_ATTENDANCE.map((item, idx) => {
                const safeBunks = calculateSafeClasses(item.classesHeld, item.classesAttended);
                return (
                  <div key={idx} className="p-5 glass-card rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{item.courseCode}</span>
                        <h4 className="text-xs font-extrabold text-white mt-0.5">{item.courseName}</h4>
                      </div>
                      <span className={`text-base font-black ${item.percentage >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.percentage}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${item.percentage >= 85 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 pt-1">
                      <span>Attended {item.classesAttended}/{item.classesHeld} Sessions</span>
                      <span className="text-indigo-300 font-bold">Safe to miss: {safeBunks} classes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Career Readiness & Corporate Recruitment Matches */}
          <div className="glass-panel p-6 md:p-8 rounded-[32px] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-black text-white tracking-tight">Placement Drive & Resume Match Index</h3>
                <p className="text-xs text-slate-400 font-medium">Matched against your academic CGPA & skill profile</p>
              </div>
              <Briefcase size={20} className="text-indigo-400" />
            </div>

            <div className="space-y-4">
              {RECENT_PLACEMENT_DRIVES.map(drive => (
                <div key={drive.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={drive.logo} alt={drive.company} className="w-10 h-10 rounded-xl" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-white">{drive.company}</h4>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">Eligible (CGPA &gt; {drive.eligibilityCgpa})</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{drive.role} • {drive.ctc}</p>
                    </div>
                  </div>

                  <button className="px-4 py-2 glass-btn-primary rounded-xl text-xs font-black uppercase tracking-wider shrink-0">
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar: AI Productivity & Daily Schedule */}
        <div className="space-y-6">
          
          {/* Daily Schedule Timeline */}
          <div className="glass-panel p-6 rounded-[32px] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} className="text-indigo-400" />
                Today's Class Schedule
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Monday</span>
            </div>

            <div className="space-y-3">
              {MOCK_TIMETABLE.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white/[0.03] border border-white/5 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-indigo-300">{item.time}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white/10 rounded text-slate-300">{item.roomType}</span>
                  </div>
                  <h4 className="font-extrabold text-white">{item.course}</h4>
                  <p className="text-[10px] text-slate-400">{item.venue} • {item.faculty}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Library Quick Reserve */}
          <div className="glass-card p-6 rounded-[32px] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Library size={16} className="text-amber-400" />
                IEEE Digital Vault Pass
              </h4>
              <span className="text-xs font-black text-emerald-400">12 Scopus Tokens</span>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              You have active institutional access to 150,000+ IEEE transactions, ACM journals, and Springer research papers.
            </p>

            <button className="w-full py-3 glass-btn-secondary rounded-xl text-xs font-bold flex items-center justify-center gap-2">
              <FileText size={16} /> Open Digital Vault Explorer
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default StudentJourneyWorkspace;
