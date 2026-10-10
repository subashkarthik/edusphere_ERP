import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Users, 
  CreditCard, 
  GraduationCap, 
  FileText, 
  Briefcase, 
  Settings, 
  HelpCircle,
  Building2,
  Bus,
  Library,
  Megaphone,
  UserPlus,
  ShieldCheck,
  History,
  Archive,
  Sparkles,
  Award,
  Compass,
  Cpu,
  Layers,
  Network,
  Activity,
  Globe,
  DollarSign,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  FileCheck2,
  Clock,
  PlayCircle
} from 'lucide-react';
import { UserRole, NavItem } from './types';

export const ROLE_THEMES = {
  [UserRole.STUDENT]: {
    bg: 'bg-indigo-900',
    primary: 'bg-indigo-600',
    text: 'text-indigo-600',
    accent: 'bg-teal-500',
    accentText: 'text-teal-400',
    hover: 'hover:bg-indigo-800',
    light: 'bg-indigo-50',
    border: 'border-indigo-100',
    gradient: 'from-indigo-600 to-violet-600'
  },
  [UserRole.FACULTY]: {
    bg: 'bg-emerald-950',
    primary: 'bg-emerald-700',
    text: 'text-emerald-700',
    accent: 'bg-lime-500',
    accentText: 'text-lime-400',
    hover: 'hover:bg-emerald-900',
    light: 'bg-emerald-50',
    border: 'border-emerald-100',
    gradient: 'from-emerald-700 to-teal-700'
  },
  [UserRole.ADMIN]: {
    bg: 'bg-slate-950',
    primary: 'bg-rose-800',
    text: 'text-rose-800',
    accent: 'bg-amber-500',
    accentText: 'text-amber-400',
    hover: 'hover:bg-slate-900',
    light: 'bg-rose-50',
    border: 'border-rose-100',
    gradient: 'from-rose-800 to-orange-800'
  }
};

export const NAVIGATION_ITEMS: NavItem[] = [
  // 1. Dashboard
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: 'LayoutDashboard', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'core' 
  },

  // 2. Course Videos & Journey (Hero Learning Experience)
  { 
    id: 'journey', 
    label: 'Course Videos', 
    icon: 'PlayCircle', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'core' 
  },

  // 3. Courses & Catalog
  { 
    id: 'academics', 
    label: 'Courses', 
    icon: 'BookOpen', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'academic' 
  },

  // 4. Attendance
  { 
    id: 'attendance', 
    label: 'Attendance', 
    icon: 'Activity', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'records' 
  },

  // 5. Assessments (Quizzes & Assignments)
  { 
    id: 'exams', 
    label: 'Quizzes', 
    icon: 'FileText', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'records' 
  },
  { 
    id: 'assignments', 
    label: 'Assignments', 
    icon: 'FileCheck2', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'records' 
  },

  // 6. Certificates
  { 
    id: 'certificates', 
    label: 'Certificates', 
    icon: 'Award', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'records' 
  },

  // 7. Users (Admin only)
  { 
    id: 'users', 
    label: 'Users', 
    icon: 'Users', 
    roles: [UserRole.ADMIN], 
    category: 'admin' 
  },

  // 8. Settings
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: 'Settings', 
    roles: [UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN], 
    category: 'system' 
  },
];

export const ICON_MAP: Record<string, any> = {
  LayoutDashboard, BookOpen, Calendar, Users, CreditCard, GraduationCap, FileText, Briefcase, Settings, HelpCircle, Building2, Bus, Library, Megaphone, UserPlus, ShieldCheck, History, Archive, Sparkles, Award, Compass, Cpu, Layers, Network, Activity, Globe, DollarSign, UserCheck, CheckCircle2, AlertTriangle, FolderGit2, FileCheck2, Clock, PlayCircle
};
