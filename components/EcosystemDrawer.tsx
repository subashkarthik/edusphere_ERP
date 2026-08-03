import React, { useState } from 'react';
import { X, Search, Layers, ExternalLink, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ECOSYSTEM_MODULES, ICON_MAP } from '../constants';
import { EcosystemModule, UserRole } from '../types';

interface EcosystemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (moduleId: string) => void;
  currentRole?: UserRole;
}

const EcosystemDrawer: React.FC<EcosystemDrawerProps> = ({ 
  isOpen, onClose, onSelectModule, currentRole = UserRole.STUDENT 
}) => {
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

  // Role Gating logic for Ecosystem Modules
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
    [UserRole.ADMIN]: ECOSYSTEM_MODULES.map(m => m.id), // Admin has access to all 16
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#030612]/80 backdrop-blur-2xl transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-6xl max-h-[90vh] glass-panel rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/10 z-10 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
              <Layers size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">EduSphere Enterprise Ecosystem</h2>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={10} /> 16 Active Domains
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

        {/* Filters & Search Bar */}
        <div className="p-6 border-b border-white/[0.06] bg-white/[0.01] flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Category Tabs */}
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

          {/* Search Box */}
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

        {/* Grid Content */}
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

        {/* Modal Footer */}
        <div className="p-4 md:p-6 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
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
