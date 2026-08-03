import React from 'react';
import { X, Settings, LogOut, LayoutDashboard, BookOpen, Network } from 'lucide-react';
import { NAVIGATION_ITEMS, ICON_MAP } from '../constants';
import { UserRole } from '../types';
import Logo from './Logo';

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentRole, activeTab, setActiveTab, onLogout, isOpen, onClose 
}) => {
  // Filter navigation items strictly by role
  const userNavItems = NAVIGATION_ITEMS.filter(item => item.roles.includes(currentRole));

  const operationalItems = userNavItems.filter(item => item.category === 'core' || item.category === 'learning' || item.category === 'ecosystem');
  const academicItems = userNavItems.filter(item => item.category === 'academic' || item.category === 'records' || item.category === 'resources');
  const adminItems = userNavItems.filter(item => item.category === 'admin');

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 glass-sidebar text-white z-[70] transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/[0.06]">
          <Logo size={40} />
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
          
          {/* Operational Group */}
          <div className="space-y-1">
            <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Operational Hub</p>
            {operationalItems.map((item) => {
              const Icon = ICON_MAP[item.icon] || LayoutDashboard;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); onClose(); }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                    ${isActive 
                      ? 'glass-btn-primary text-white shadow-lg shadow-indigo-500/20' 
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'} />
                  <span className="text-xs font-bold tracking-tight">{item.label}</span>
                  {isActive && <div className="ml-auto w-1 h-4 bg-white/40 rounded-full"></div>}
                </button>
              );
            })}
          </div>

          {/* Academic & Resources Group */}
          {academicItems.length > 0 && (
            <div className="space-y-1">
              <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Academic Suite</p>
              {academicItems.map((item) => {
                const Icon = ICON_MAP[item.icon] || BookOpen;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); onClose(); }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${isActive 
                        ? 'glass-btn-primary text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'} />
                    <span className="text-xs font-bold tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Admin Group (Gated strictly for ADMIN role) */}
          {adminItems.length > 0 && (
            <div className="space-y-1">
              <p className="px-4 text-[9px] font-black text-rose-400 uppercase tracking-[0.2em] mb-3">Executive Control</p>
              {adminItems.map((item) => {
                const Icon = ICON_MAP[item.icon] || Network;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); onClose(); }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${isActive 
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' 
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-rose-400 group-hover:text-rose-300 transition-colors'} />
                    <span className="text-xs font-bold tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => { setActiveTab('settings'); onClose(); }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.06]'}
              `}
            >
              <Settings size={18} />
              <span className="text-xs font-bold tracking-tight">Preferences</span>
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
            >
              <LogOut size={18} />
              <span className="text-xs font-bold tracking-tight">Sign Out</span>
            </button>
          </div>
          
          <div className="mt-6 px-4 py-4 glass rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Secure</span>
            </div>
            <p className="text-[9px] text-slate-500 font-medium leading-tight">
              Access from: 192.168.1.42<br/>
              Last audit: 12m ago
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
