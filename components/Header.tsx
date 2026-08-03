import React from 'react';
import { Search, Bell, HelpCircle, ShieldCheck, Clock, Layers, Command, Sparkles, UserCheck } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import GlobalSearch from './GlobalSearch';
import { useSocket } from '../hooks/useSocket';

interface HeaderProps {
  user: UserProfile;
  onOpenMenu: () => void;
  onOpenEcosystem: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onOpenMenu, onOpenEcosystem }) => {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const { pulse } = useSocket(user.id, user.org_id);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 glass-header z-40 px-4 md:px-8 flex items-center justify-between transition-all duration-300">
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Search & System Status */}
      <div className="flex items-center gap-4 md:gap-6 flex-1">
        <button 
          onClick={onOpenMenu}
          className="lg:hidden p-2.5 hover:bg-white/10 rounded-xl transition-all"
        >
          <div className="w-5 h-0.5 bg-slate-300 mb-1.5 rounded-full"></div>
          <div className="w-5 h-0.5 bg-slate-300 mb-1.5 rounded-full"></div>
          <div className="w-5 h-0.5 bg-slate-300 rounded-full"></div>
        </button>

        {/* 16-Domain Ecosystem Drawer Launcher */}
        <button
          onClick={onOpenEcosystem}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300 transition-all group"
        >
          <Layers size={16} className="group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">16 Ecosystem Modules</span>
        </button>

        <div className="hidden md:flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-2 px-3 py-1.5 badge-emerald rounded-lg">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Session Verified</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">{pulse.active_users} LIVE</span>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative max-w-md w-full hidden md:block ml-2" onClick={() => setIsSearchOpen(true)}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <div className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs font-medium transition-all flex items-center justify-between cursor-text">
            <span className="text-slate-400">Search EduSphere University OS...</span>
            <div className="flex items-center gap-1">
               <span className="px-1.5 py-0.5 glass rounded text-[9px] font-black text-slate-400 tracking-tighter flex items-center gap-0.5"><Command size={8}/>K</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* Role Badge Indicator */}
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hidden sm:inline-block ${
          user.role === UserRole.ADMIN ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300' :
          user.role === UserRole.FACULTY ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' :
          'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
        }`}>
          {user.role} Role
        </span>

        <div className="flex items-center gap-1">
          <button className="p-2.5 text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all relative group">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 border-2 border-[#050816] rounded-full shadow-[0_0_6px_rgba(244,63,94,0.6)]"></span>
          </button>
        </div>

        <div className="w-[1px] h-6 bg-white/10 mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-3 pl-2 group">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-200 tracking-tight leading-none mb-1">{user.name}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.department || user.role}</p>
          </div>
          <div className="relative">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-indigo-500/30 transition-all shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#050816] rounded-full shadow-[0_0_6px_rgba(52,211,153,0.6)]"></div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
