import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, ShieldCheck, Command, CheckCircle2, AlertTriangle, 
  BookOpen, Award, FileText, Sparkles, ShieldAlert, GraduationCap, 
  CheckCheck, X, RefreshCw 
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import GlobalSearch from './GlobalSearch';
import { useSocket } from '../hooks/useSocket';
import { notificationsApi, AppNotification } from '../services/api';

interface HeaderProps {
  user: UserProfile;
  onOpenMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onOpenMenu }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { pulse, messages } = useSocket(user.id, user.org_id);

  const loadNotifications = async (showLoading = false) => {
    if (showLoading) setLoadingNotifs(true);
    try {
      const data = await notificationsApi.list(30);
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.debug('[Header] Failed to fetch notifications:', err);
    } finally {
      if (showLoading) setLoadingNotifs(false);
    }
  };

  // 1. Initial Load & 30s Fallback Polling
  useEffect(() => {
    loadNotifications(true);

    const interval = setInterval(() => {
      loadNotifications(false);
    }, 30000); // 30s fallback polling

    return () => clearInterval(interval);
  }, [user.id]);

  // 2. Real-Time WebSocket Notification Interceptor
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[0];
    if (latest && (latest.type === 'NOTIFICATION' || latest.data?.type)) {
      const notifData: AppNotification = latest.data || {
        id: String(Date.now()),
        user_id: user.id,
        org_id: user.org_id,
        type: latest.type || 'SYSTEM',
        title: latest.title || 'New Alert',
        message: latest.message || '',
        read: false,
        is_read: false,
        created_at: new Date().toISOString()
      };

      setNotifications((prev) => {
        // Prevent duplicate IDs
        if (prev.some((n) => n.id === notifData.id)) return prev;
        return [notifData, ...prev].slice(0, 40);
      });
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages, user.id, user.org_id]);

  // 3. Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await notificationsApi.markRead(notifId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, is_read: true })));
      setUnreadCount(0);
      await notificationsApi.markAllRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ENROLLMENT':
        return <GraduationCap size={16} className="text-indigo-400" />;
      case 'ATTENDANCE_WARNING':
        return <AlertTriangle size={16} className="text-amber-400" />;
      case 'QUIZ_PUBLISHED':
        return <Award size={16} className="text-purple-400" />;
      case 'ASSIGNMENT_GRADED':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'CERTIFICATE_ISSUED':
        return <Sparkles size={16} className="text-amber-300" />;
      case 'CERTIFICATE_REVOKED':
        return <ShieldAlert size={16} className="text-rose-400" />;
      default:
        return <Bell size={16} className="text-sky-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const now = new Date();
    const then = new Date(dateStr);
    const diffSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

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

        <div className="hidden md:flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-2 px-3 py-1.5 badge-emerald rounded-lg">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Session Verified</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">{pulse?.active_users || 1} LIVE</span>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative max-w-md w-full hidden md:block ml-2" onClick={() => setIsSearchOpen(true)}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <div className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs font-medium transition-all flex items-center justify-between cursor-text">
            <span className="text-slate-400">Search courses, attendance, quizzes...</span>
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

        {/* ------------------------------------------------------------------ */}
        {/* BELL ICON & NOTIFICATIONS DROPDOWN */}
        {/* ------------------------------------------------------------------ */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="p-2.5 text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all relative group"
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-lg shadow-rose-500/60 border border-slate-950 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in duration-200">
              {/* Dropdown Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-indigo-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                      title="Mark all as read"
                    >
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => loadNotifications(true)}
                    className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition"
                    title="Refresh"
                  >
                    <RefreshCw size={12} className={loadingNotifs ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {loadingNotifs && notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-indigo-400" />
                    <span>Loading alerts...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Bell size={28} className="mx-auto text-slate-600 mb-1" />
                    <p className="text-xs font-bold text-slate-300">All caught up!</p>
                    <p className="text-[11px] text-slate-500">You have no new alerts or notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.read && !notif.is_read;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => isUnread && handleMarkAsRead(notif.id)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          isUnread ? 'bg-indigo-500/[0.07] hover:bg-indigo-500/[0.12]' : 'hover:bg-white/[0.02] opacity-75'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-slate-800/80 border border-white/5 shrink-0 mt-0.5">
                          {getNotificationIcon(notif.type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                            <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                              {formatTimeAgo(notif.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug break-words">
                            {notif.message}
                          </p>
                        </div>

                        {isUnread && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-2 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
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

