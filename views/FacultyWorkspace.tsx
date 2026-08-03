import React, { useState } from 'react';
import { 
  BookOpen, Users, CheckCircle2, AlertCircle, Clock, 
  Send, Sparkles, FileText, Activity, ChevronRight, 
  Sliders, Bot, Upload, Shield, Play
} from 'lucide-react';
import { MOCK_ATTENDANCE } from '../constants';

const FacultyWorkspace: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState('CS8704');
  const [syllabusStatus, setSyllabusStatus] = useState<'DRAFT' | 'DEPT_PENDING' | 'ACTIVE'>('ACTIVE');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const courses = [
    { code: 'CS8704', name: 'Machine Learning & Deep Neural Nets', students: 48, status: 'ACTIVE', progress: 85 },
    { code: 'CS8701', name: 'Cloud Computing Architecture', students: 54, status: 'ACTIVE', progress: 90 },
    { code: 'CS8703', name: 'Mobile Application Engineering', students: 42, status: 'DEPT_PENDING', progress: 65 },
  ];

  const handleAiAssist = () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setAiResponse(`### AI Generated Lecture Notes & Quiz Bundle for "${aiPrompt}"

#### Key Concepts:
1. **Convolutional Neural Networks (CNNs)**: Spatial feature extraction using pooling layers.
2. **Backpropagation**: Gradient descent optimization across weights.
3. **Overfitting Mitigation**: Dropout layers (rate: 0.2) and L2 Regularization.

#### Quick 3-Question Quiz:
1. What is the effect of increasing kernel size in early convolution layers?
2. Explain the vanishing gradient problem in deep networks.
3. Why is ReLU preferred over Sigmoid in hidden layers?`);
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Faculty Operations Header */}
      <div className="glass-panel p-8 md:p-10 rounded-[32px] border border-white/10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Faculty Operations Hub
              </span>
              <span className="text-xs font-bold text-slate-400">Dr. Arun Kumar • CSE Dept</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Teaching Operations & Class Insights</h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium mt-1">Orchestrate lectures, evaluate student submissions, approve syllabi, and deploy AI teaching assistants.</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-5 py-3 glass-btn-primary rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <Play size={16} /> Launch Live Classroom
            </button>
          </div>
        </div>
      </div>

      {/* Course Selector & Syllabus State Machine Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Course Selector Card */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Teaching Course</h3>
          <div className="space-y-2">
            {courses.map(course => (
              <div
                key={course.code}
                onClick={() => {
                  setSelectedCourse(course.code);
                  setSyllabusStatus(course.status as any);
                }}
                className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                  selectedCourse === course.code
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-lg'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-400">{course.code}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white/10 rounded-full">{course.students} Students</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-1">{course.name}</h4>
                </div>
                <ChevronRight size={18} className={selectedCourse === course.code ? 'text-indigo-400' : 'text-slate-600'} />
              </div>
            ))}
          </div>
        </div>

        {/* Syllabus Approval State Machine */}
        <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-3xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Syllabus Approval State Machine</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                syllabusStatus === 'ACTIVE' ? 'badge-emerald' : 'badge-amber'
              }`}>
                State: {syllabusStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Every course syllabus passes through automated workflow checks: Faculty Creation → HoD Departmental Review → Institutional Governance Approval → Active Registration.
            </p>
          </div>

          {/* Stepper Visualization */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <CheckCircle2 size={22} className="text-emerald-400 mx-auto mb-2" />
              <h5 className="text-xs font-extrabold text-white">1. Draft & Upload</h5>
              <span className="text-[10px] font-bold text-emerald-400">Completed</span>
            </div>

            <div className={`p-4 border rounded-2xl ${
              syllabusStatus === 'ACTIVE' 
                ? 'bg-emerald-500/10 border-emerald-500/20' 
                : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <Clock size={22} className={syllabusStatus === 'ACTIVE' ? 'text-emerald-400 mx-auto mb-2' : 'text-amber-400 mx-auto mb-2'} />
              <h5 className="text-xs font-extrabold text-white">2. HoD Review</h5>
              <span className="text-[10px] font-bold text-slate-300">Verified</span>
            </div>

            <div className={`p-4 border rounded-2xl ${
              syllabusStatus === 'ACTIVE'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-white/[0.03] border-white/10'
            }`}>
              <Shield size={22} className={syllabusStatus === 'ACTIVE' ? 'text-emerald-400 mx-auto mb-2' : 'text-slate-500 mx-auto mb-2'} />
              <h5 className="text-xs font-extrabold text-white">3. Active Catalogue</h5>
              <span className="text-[10px] font-bold text-slate-400">Live for Enrollees</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Operational Split: Early Warning Retention Radar & AI Teaching Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Retention Early-Warning Radar */}
        <div className="glass-panel p-6 md:p-8 rounded-[32px] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Early-Warning Student Retention Radar</h3>
              <p className="text-xs text-slate-400 font-medium">Automated risk flags for students requiring academic intervention</p>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black rounded-lg">
              2 Risk Warnings
            </span>
          </div>

          <div className="space-y-4">
            {[
              { name: 'Rohan Sharma', roll: 'UNI/2021/CS/088', attendance: '68%', risk: 'CRITICAL', reason: 'Consecutive absence in Lab 3 & 4' },
              { name: 'Priya Venkatesh', roll: 'UNI/2021/CS/102', attendance: '72%', risk: 'WARNING', reason: 'Assignment #2 score below 40%' },
              { name: 'Alex Johnson', roll: 'UNI/2021/CS/042', attendance: '94%', risk: 'SAFE', reason: 'High engagement score' },
            ].map((student, idx) => (
              <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-extrabold text-white">{student.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{student.roll}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{student.reason}</p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Attendance</span>
                    <span className="text-xs font-black text-white">{student.attendance}</span>
                  </div>
                  <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase">
                    Intervene
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Teaching Assistant & Quiz Generator */}
        <div className="glass-panel p-6 md:p-8 rounded-[32px] space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.08]">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">AI Teaching Operations Assistant</h3>
                <p className="text-xs text-slate-400 font-medium">Powered by Gemini 3 Flash • Instant quiz & lecture plan generator</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 block">Topic / Lesson Objective:</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. Backpropagation algorithm & Gradient Descent..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs font-medium"
                />
                <button 
                  onClick={handleAiAssist}
                  disabled={isGenerating}
                  className="px-5 py-2.5 glass-btn-primary rounded-xl text-xs font-black uppercase flex items-center gap-2 shrink-0"
                >
                  <Sparkles size={14} /> {isGenerating ? 'Generating...' : 'Generate Plan'}
                </button>
              </div>
            </div>
          </div>

          {aiResponse && (
            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto mt-4">
              {aiResponse}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default FacultyWorkspace;
