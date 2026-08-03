import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, BookOpen, FileText, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: string;
  title: string;
  message: string;
  category?: string;
  timestamp: string;
}

interface LiveNotificationToastProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({ messages, onDismiss }) => {
  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-24 md:bottom-8 md:right-28 z-[90] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {messages.slice(0, 3).map((msg) => (
        <div
          key={msg.id}
          className="pointer-events-auto bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border border-indigo-500/30 backdrop-blur-md transition-all transform translate-y-0 animate-slide-in flex items-start gap-3"
        >
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
            {msg.type === 'NEW_ANNOUNCEMENT' ? (
              <Bell className="w-5 h-5 text-amber-400" />
            ) : msg.type === 'NEW_ASSIGNMENT' ? (
              <FileText className="w-5 h-5 text-emerald-400" />
            ) : (
              <BookOpen className="w-5 h-5 text-sky-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white truncate">{msg.title}</h4>
              <span className="text-[10px] text-slate-400 ml-2">{msg.timestamp}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">{msg.message}</p>
          </div>
          <button
            onClick={() => onDismiss(msg.id)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
