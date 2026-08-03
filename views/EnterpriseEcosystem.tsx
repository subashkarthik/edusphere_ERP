import React, { useState } from 'react';
import { 
  Layers, Search, Sparkles, ExternalLink, ArrowRight, 
  ShieldCheck, Database, Globe, CheckCircle2, Cpu
} from 'lucide-react';
import { ECOSYSTEM_MODULES, ICON_MAP } from '../constants';
import { EcosystemModule } from '../types';

const EnterpriseEcosystem: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'ALL', label: 'All 16 Domains' },
    { id: 'core_operations', label: 'Core Operations' },
    { id: 'academic_excellence', label: 'Academic Excellence' },
    { id: 'student_lifecycle', label: 'Student Lifecycle' },
    { id: 'auxiliary_services', label: 'Auxiliary Services' },
  ];

  const filteredModules = ECOSYSTEM_MODULES.filter(module => {
    const matchesCategory = selectedCategory === 'ALL' || module.category === selectedCategory;
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          module.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          module.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Ecosystem Header Banner */}
      <div className="glass-panel p-8 md:p-10 rounded-[32px] border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-teal-500/10 to-transparent blur-[140px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Layers size={12} /> Unified University OS Architecture
              </span>
              <span className="text-xs font-bold text-slate-400">16 Enterprise Modules</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Enterprise Ecosystem Operations
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-2xl mt-2 leading-relaxed">
              A comprehensive suite encompassing Admissions, Academics, LMS, Examinations, Research, Innovation, Hostel, Transport, Placements, Finance, HR, and Analytics.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
            <div className="text-center px-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">System Uptime</span>
              <span className="text-2xl font-black text-emerald-400">99.99%</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="text-center px-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">API Latency</span>
              <span className="text-2xl font-black text-indigo-400">1.2ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Category Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
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
            placeholder="Search 16 modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs font-medium"
          />
        </div>
      </div>

      {/* Grid of 16 Enterprise Domains */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map(module => {
          const IconComponent = ICON_MAP[module.icon] || Layers;
          return (
            <div
              key={module.id}
              className="glass-card-hover p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all pointer-events-none"></div>

              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white/[0.05] group-hover:bg-indigo-500/20 border border-white/10 group-hover:border-indigo-500/30 rounded-2xl text-slate-300 group-hover:text-indigo-300 transition-all shadow-sm">
                    <IconComponent size={24} />
                  </div>
                  <span className="px-3 py-1 bg-white/[0.04] border border-white/10 rounded-xl text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                    {module.code}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors mb-1.5">
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
                
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase">
                  {module.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default EnterpriseEcosystem;
