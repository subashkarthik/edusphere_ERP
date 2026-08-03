import React, { useState } from 'react';
import { Sparkles, Trophy, ShieldCheck, Award, Bot, Cloud, CheckCircle2, ChevronRight, X, Play } from 'lucide-react';

interface JudgeDemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const JudgeDemoTour: React.FC<JudgeDemoTourProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: '⚡ Real-Time WebSockets & Active Pulse',
      badge: 'LIVE ENGINE',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      description: 'Connected via FastAPI & Redis Pub/Sub WebSocket manager. Displays active online student count in top header and pushes instant notification toasts when faculty post assignments, announcements, or grades.',
      targetTab: 'dashboard',
      actionText: 'View Live Header Pulse'
    },
    {
      title: '🛡️ Anti-Cheat Online Examination Engine',
      badge: 'PROCTORED QUIZ',
      icon: <ShieldCheck className="w-6 h-6 text-indigo-400" />,
      description: 'Features live countdown timer (mm:ss), question switcher, auto-grading modal, and tab-switch violation tracking. Flags warnings if student switches browser windows during the exam.',
      targetTab: 'exams',
      actionText: 'Open Online Quizzes'
    },
    {
      title: '📜 ReportLab Automated Verified Certificates',
      badge: 'QR VERIFIED',
      icon: <Award className="w-6 h-6 text-emerald-400" />,
      description: 'Generates official vector PDF certificates on the fly using Python ReportLab. Enforces institutional eligibility thresholds (70% attendance + 60% average grade) with instant verification codes.',
      targetTab: 'certifications',
      actionText: 'Check Certificate Portal'
    },
    {
      title: '🤖 AI Learning Copilot & At-Risk Predictor',
      badge: 'GEMINI AI',
      icon: <Bot className="w-6 h-6 text-sky-400" />,
      description: 'Context-aware AI assistant powered by Google Gemini. Provides automated study recommendations, task prioritization, and early intervention grade risk flags.',
      targetTab: 'dashboard',
      actionText: 'Interact with AI Assistant'
    },
    {
      title: '☁️ Backblaze B2 Direct Cloud File Storage',
      badge: 'S3 COMPATIBLE',
      icon: <Cloud className="w-6 h-6 text-purple-400" />,
      description: 'Integrated multipart upload endpoint (/api/upload/file) for direct student assignment submissions and video course media streaming.',
      targetTab: 'assignments',
      actionText: 'Open Assignment Uploads'
    }
  ];

  const step = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
        
        {/* Background Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Trophy size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Judges Showcase Mode</span>
                <h3 className="text-lg font-black text-white">EduSphere University OS Tour</h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Step Counter */}
          <div className="flex gap-1.5 mb-6">
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-white/5 space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-md">
                {step.badge}
              </span>
              <span className="text-xs text-slate-500 font-bold">Step {currentStep + 1} of {tourSteps.length}</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-900 rounded-xl border border-white/10 shrink-0">
                {step.icon}
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-2">{step.title}</h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">{step.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={() => {
              if (onNavigateTab && step.targetTab) {
                onNavigateTab(step.targetTab);
              }
            }}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition"
          >
            <Play size={14} /> {step.actionText}
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((p) => p - 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Back
              </button>
            )}

            {currentStep < tourSteps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((p) => p + 1)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1"
              >
                Next Highlight <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1"
              >
                <CheckCircle2 size={14} /> Complete Tour
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
