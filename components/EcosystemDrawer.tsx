import React, { useState } from 'react';
import { X, Search, Layers, ArrowRight, ShieldCheck, Sparkles, Building, PhoneCall, Lock, FileText } from 'lucide-react';
import { ECOSYSTEM_MODULES, ICON_MAP } from '../constants';
import { UserRole } from '../types';

interface EcosystemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (moduleId: string) => void;
  currentRole?: UserRole;
}

const EcosystemDrawer: React.FC<EcosystemDrawerProps> = ({ 
  isOpen, onClose, onSelectModule, currentRole = UserRole.STUDENT 
}) => {
  const [activeTab, setActiveTab] = useState<'DOMAINS' | 'ABOUT' | 'CONTACT' | 'PRIVACY' | 'TERMS'>('DOMAINS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const categories = [
    { id: 'ALL', label: 'Authorized Modules' },
    { id: 'core_operations', label: 'Core Operations' },
    { id: 'academic_excellence', label: 'Academic Excellence' },
    { id: 'student_lifecycle', label: 'Student Lifecycle' },
    { id: 'auxiliary_services', label: 'Auxiliary Services' },
  ];

  const allowedModuleIdsByRole: Record<UserRole, string[]> = {
    [UserRole.STUDENT]: [
      'lms_studio', 'examination', 'library_vault', 'innovation_center',
      'hostel_housing', 'transit_fleet', 'placement_cell', 'campus_life',
      'alumni_network', 'ai_copilot'
    ],
    [UserRole.FACULTY]: [
      'academics_core', 'lms_studio', 'examination', 'library_vault',
      'research_hub', 'innovation_center', 'placement_cell', 'hr_faculty_affairs',
      'campus_life', 'ai_copilot'
    ],
    [UserRole.ADMIN]: ECOSYSTEM_MODULES.map(m => m.id),
    [UserRole.FINANCE]: ['finance_bursar', 'institutional_analytics', 'ai_copilot'],
    [UserRole.REGISTRAR]: ['admissions', 'academics_core', 'examination', 'hr_faculty_affairs', 'institutional_analytics']
  };

  const allowedIds = allowedModuleIdsByRole[currentRole] || ECOSYSTEM_MODULES.map(m => m.id);

  const filteredModules = ECOSYSTEM_MODULES.filter(module => {
    const isAllowed = allowedIds.includes(module.id);
    const matchesCategory = selectedCategory === 'ALL' || module.category === selectedCategory;
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          module.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          module.description.toLowerCase().includes(searchQuery.toLowerCase());
    return isAllowed && matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-[#030612]/80 backdrop-blur-2xl transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl max-h-[90vh] glass-panel rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/10 z-10 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
              <Layers size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">EduSphere Enterprise Ecosystem</h2>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={10} /> Startup Edition v4.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Commercial-grade University Operating System Architecture</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Navigation Bar */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-slate-950/40 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('DOMAINS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'DOMAINS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} /> Ecosystem Modules
          </button>
          <button
            onClick={() => setActiveTab('ABOUT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'ABOUT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building size={14} /> About EduSphere
          </button>
          <button
            onClick={() => setActiveTab('CONTACT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'CONTACT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <PhoneCall size={14} /> Contact Us
          </button>
          <button
            onClick={() => setActiveTab('PRIVACY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'PRIVACY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock size={14} /> Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('TERMS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'TERMS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={14} /> Terms & Conditions
          </button>
        </div>

        {/* TAB 1: DOMAINS */}
        {activeTab === 'DOMAINS' && (
          <>
            <div className="p-4 border-b border-white/[0.06] bg-white/[0.01] flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategory === cat.id
                        ? 'glass-btn-primary text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search domain, code, or feature..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredModules.map(module => {
                const IconComponent = ICON_MAP[module.icon] || Layers;
                return (
                  <div
                    key={module.id}
                    onClick={() => {
                      onSelectModule(module.id);
                      onClose();
                    }}
                    className="group glass-card-hover p-6 rounded-2xl cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all"></div>
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white/[0.05] group-hover:bg-indigo-500/20 border border-white/10 group-hover:border-indigo-500/30 rounded-2xl text-slate-300 group-hover:text-indigo-300 transition-all shadow-sm">
                          <IconComponent size={22} />
                        </div>
                        <span className="px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {module.code}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors mb-1">
                        {module.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4">
                        {module.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">{module.kpiLabel}</span>
                        <span className="text-sm font-black text-emerald-400">{module.kpi}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                        <span>Launch</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: ABOUT */}
        {activeTab === 'ABOUT' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-300 text-sm leading-relaxed">
            <div className="p-6 glass rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
              <h3 className="text-xl font-black text-white">About EduSphere Universal LMS</h3>
              <p>
                EduSphere is an institutional-grade, student-centric Learning Experience Platform (LXP) built for modern universities, colleges, and higher education systems. Powered by FastAPI, React, WebSockets, and Google Gemini AI, EduSphere unifies academic administration, live attendance tracking, video streaming, and AI-powered tutoring into a single cohesive ecosystem.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 glass rounded-2xl border border-white/10">
                <h4 className="font-bold text-white mb-2">⚡ Real-Time Architecture</h4>
                <p className="text-xs text-slate-400">WebSocket pulse engine broadcasting active user activity, exam schedules, and attendance alerts.</p>
              </div>
              <div className="p-5 glass rounded-2xl border border-white/10">
                <h4 className="font-bold text-white mb-2">🤖 Gemini AI Integration</h4>
                <p className="text-xs text-slate-400">Contextual role-aware AI tutoring, step-by-step assignment guidance, and automated quiz generation.</p>
              </div>
              <div className="p-5 glass rounded-2xl border border-white/10">
                <h4 className="font-bold text-white mb-2">🎓 ReportLab Certification</h4>
                <p className="text-xs text-slate-400">Automated 100% course completion verification with tamper-proof PDF certificate issuing.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT */}
        {activeTab === 'CONTACT' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-300 text-sm">
            <div className="p-6 glass rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-xl font-black text-white">Institutional Support & Campus Helpdesk</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">University Helpdesk Email</span>
                  <span className="text-base font-bold text-indigo-300">support@edusphere.edu.in</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Toll-Free Campus Phone</span>
                  <span className="text-base font-bold text-indigo-300">+91 (044) 2834 9000</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Institutional Headquarters</span>
                  <span className="text-xs text-slate-300 font-medium">EduSphere Tech Park, Sector 4, University Heights, Chennai, Tamil Nadu 600028</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Operating Hours</span>
                  <span className="text-xs text-slate-300 font-medium">Monday – Saturday: 8:00 AM – 7:00 PM IST</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRIVACY */}
        {activeTab === 'PRIVACY' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-4 text-slate-300 text-xs leading-relaxed">
            <h3 className="text-lg font-black text-white mb-2">Institutional Privacy Policy & Student Data Protection</h3>
            <p>EduSphere operates under strict university data protection governance standards. All student academic records, attendance history, and exam evaluations are encrypted using AES-256 standards.</p>
            <h4 className="font-bold text-white pt-2">1. Information Collection</h4>
            <p>We collect essential student and faculty information including Register Numbers, attendance logs, course enrollments, and academic submissions solely for educational administration.</p>
            <h4 className="font-bold text-white pt-2">2. Data Security & Multi-Tenant Isolation</h4>
            <p>Data across institutional tenants is logically isolated. Student privacy is protected with role-based access control (RBAC).</p>
          </div>
        )}

        {/* TAB 5: TERMS */}
        {activeTab === 'TERMS' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-4 text-slate-300 text-xs leading-relaxed">
            <h3 className="text-lg font-black text-white mb-2">Terms of Service & Institutional Usage Policy</h3>
            <p>By accessing EduSphere Universal LMS, students, faculty, and administrative staff agree to adhere to institutional academic integrity standards.</p>
            <h4 className="font-bold text-white pt-2">1. Acceptable Academic Use</h4>
            <p>Users must not engage in unauthorized credential sharing, automated scraping, or submitting non-original coursework.</p>
            <h4 className="font-bold text-white pt-2">2. System Availability</h4>
            <p>EduSphere targets 99.9% operational uptime. Scheduled maintenance windows are broadcast via the announcement center.</p>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>EduSphere University OS v4.0 • Enterprise Architecture</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">Press ESC or click outside to dismiss</span>
        </div>

      </div>
    </div>
  );
};

export default EcosystemDrawer;

