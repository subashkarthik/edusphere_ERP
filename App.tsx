
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AIAssistant from './components/AIAssistant';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import EcosystemDrawer from './components/EcosystemDrawer';
import { FullPageLoader } from './components/LoadingSkeleton';
import { UserRole, UserProfile } from './types';
import { LayoutDashboard, Calendar, Users, Menu, Lock, LogIn, AlertCircle, Loader2, Sparkles, Activity, Layers } from 'lucide-react';
import { ROLE_THEMES } from './constants';
import Logo from './components/Logo';
import { authApi, setTokens, clearTokens, getAccessToken } from './services/api';
import { useSocket } from './hooks/useSocket';
import { LiveNotificationToast } from './components/LiveNotificationToast';

// Core Views
import Dashboard from './views/Dashboard';
import AttendanceModule from './views/AttendanceModule';
import SubjectsModule from './views/SubjectsModule';
import FacultyCMS from './views/FacultyCMS';
import ExamsModule from './views/ExamsModule';
import TimetableView from './views/TimetableView';
import AnnouncementsView from './views/AnnouncementsView';
import LibraryView from './views/LibraryView';
import LearningJourney from './views/LearningJourney';
import LearningWorkspace from './views/LearningWorkspace';
import AssignmentModule from './views/AssignmentModule';
import UsersModule from './views/UsersModule';
import SystemModule from './views/SystemModule';
import SettingsModule from './views/SettingsModule';
import EnterpriseEcosystem from './views/EnterpriseEcosystem';
import CertificationsModule from './views/CertificationsModule';
import DegreeAuditView from './views/DegreeAuditView';
import VoiceVivaModule from './views/VoiceVivaModule';
import VirtualLab3DView from './views/VirtualLab3DView';
import SkillQuestView from './views/SkillQuestView';
import { Login } from './components/Login';


const App: React.FC = () => {
  console.log('--- App Component Executing ---');
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.STUDENT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('alex.j@edusphere.edu.in');
  const [loginPassword, setLoginPassword] = useState('student123');
  
  const [user, setUser] = useState<UserProfile>({
    id: '1',
    name: 'Alex Johnson',
    role: UserRole.STUDENT,
    email: 'alex.j@edusphere.edu.in',
    department: 'Computer Science',
    avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=4f46e5&color=fff',
    enrollmentNo: 'UNI/2021/CS/042'
  });

  const { toasts, dismissToast } = useSocket(user.id, user.org_id || 'org-edusphere');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Listen for navigation events from global search
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) setActiveTab(detail.tab);
      if (detail?.courseData) setSelectedCourse(detail.courseData);
    };
    window.addEventListener('universe-navigate', handleNavigate);
    return () => window.removeEventListener('universe-navigate', handleNavigate);
  }, []);

  // Default to student prefill
  useEffect(() => {
    setLoginEmail('alex.j@edusphere.edu.in');
    setLoginPassword('student123');
  }, []);

  const handleSwitchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === UserRole.STUDENT) {
      setUser({
        id: '1',
        name: 'Alex Johnson',
        role: UserRole.STUDENT,
        email: 'alex.j@edusphere.edu.in',
        department: 'Computer Science & Engineering',
        avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=4f46e5&color=fff',
        enrollmentNo: 'UNI/2021/CS/042'
      });
    } else if (newRole === UserRole.FACULTY) {
      setUser({
        id: '2',
        name: 'Dr. Arun Kumar',
        role: UserRole.FACULTY,
        email: 'arun.kumar@edusphere.edu.in',
        department: 'Computer Science & Engineering',
        avatar: 'https://ui-avatars.com/api/?name=Arun+Kumar&background=059669&color=fff',
        designation: 'Professor & Dean of Research'
      });
    } else if (newRole === UserRole.ADMIN) {
      setUser({
        id: '3',
        name: 'System Registrar',
        role: UserRole.ADMIN,
        email: 'admin@edusphere.edu.in',
        department: 'University Administration',
        avatar: 'https://ui-avatars.com/api/?name=Admin+Registrar&background=e11d48&color=fff',
        designation: 'Chief Academic Officer'
      });
    }
  };

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await authApi.login(loginEmail, loginPassword);
      setTokens(response.access_token, response.refresh_token);
      
      // Map backend user to frontend UserProfile
      const backendUser = response.user;
      const mappedRole = (backendUser.role as keyof typeof UserRole) in UserRole 
        ? UserRole[backendUser.role as keyof typeof UserRole] 
        : UserRole.STUDENT;

      setUser({
        id: backendUser.id,
        name: backendUser.name,
        email: backendUser.email,
        role: mappedRole,
        department: backendUser.department || undefined,
        avatar: backendUser.avatar || `https://ui-avatars.com/api/?name=${backendUser.name.replace(' ', '+')}&background=1e3a8a&color=fff`,
        enrollmentNo: backendUser.enrollment_no || undefined,
        designation: backendUser.designation || undefined,
        org_id: backendUser.org_id,
      });
      setCurrentRole(mappedRole);
      setIsLoggedIn(true);
      setActiveTab('dashboard');
      window.dispatchEvent(new CustomEvent('institution-data-sync'));
    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError(err.message || 'Authentication failed. Is the backend running?');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (getAccessToken()) {
        await authApi.logout();
      }
    } catch {
      // Logout even if API call fails
    }
    clearTokens();
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    setLoginError('');
  };

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard role={currentRole} />;
        case 'journey':
          return <LearningJourney />;
        case 'attendance':
          return <AttendanceModule id="attendance" role={currentRole} />;
        case 'academics':
          return <SubjectsModule id="academics" role={currentRole} />;
        case 'exams':
          return <ExamsModule id="exams" role={currentRole} />;
        case 'assignments':
          return <AssignmentModule role={currentRole} />;
        case 'degree_audit':
          return <DegreeAuditView user={user} />;
        case 'voice_viva':
          return <VoiceVivaModule />;
        case 'virtual_lab':
          return <VirtualLab3DView />;
        case 'skill_quest':
          return <SkillQuestView />;
        case 'certificates':
          return <CertificationsModule user={user} />;
        case 'cms':
          return <FacultyCMS role={currentRole} />;

        case 'ecosystem':
          return <EnterpriseEcosystem />;
        case 'users':
          return <UsersModule currentUserRole={currentRole} />;
        case 'system':
          return <SystemModule user={user} />;
        case 'workspace':
          return <LearningWorkspace courseData={selectedCourse} onBack={() => setActiveTab('journey')} />;
        case 'timetable':
          return <TimetableView role={currentRole} />;
        case 'announcements':
          return <AnnouncementsView role={currentRole} />;
        case 'library':
          return <LibraryView role={currentRole} />;
        case 'settings':
          return <SettingsModule user={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} />;
        default:
          return (
            <div className="flex flex-col items-center justify-center p-10 md:p-20 text-center glass glass-edge rounded-3xl animate-in fade-in duration-500">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-2xl md:text-3xl">🏗️</div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">{activeTab} Console</h2>
              <p className="text-slate-400 mt-2 max-w-md font-medium text-sm md:text-base">This institutional module is currently performing a scheduled database re-indexing.</p>
            </div>
          );
      }
    })();

    return (
      <ErrorBoundary key={activeTab}>
        <Suspense fallback={<FullPageLoader />}>
          {content}
        </Suspense>
      </ErrorBoundary>
    );
  };

  if (showSplash) return <SplashScreen />;

  if (!isLoggedIn) {
    return (
      <Login
        onLoginSuccess={(backendUser, tokens) => {
          setTokens(tokens.access_token, tokens.refresh_token);
          const mappedRole = (backendUser.role as keyof typeof UserRole) in UserRole 
            ? UserRole[backendUser.role as keyof typeof UserRole] 
            : UserRole.STUDENT;

          setUser({
            id: backendUser.id,
            name: backendUser.name,
            email: backendUser.email,
            role: mappedRole,
            department: backendUser.department || undefined,
            avatar: backendUser.avatar || `https://ui-avatars.com/api/?name=${backendUser.name.replace(' ', '+')}&background=1e3a8a&color=fff`,
            enrollmentNo: backendUser.enrollment_no || undefined,
            designation: backendUser.designation || undefined,
            phone: backendUser.phone || undefined,
            org_id: backendUser.org_id,
          });
          setCurrentRole(mappedRole);
          setIsLoggedIn(true);
          setActiveTab('dashboard');
          window.dispatchEvent(new CustomEvent('institution-data-sync'));
        }}
      />
    );
  }

  const theme = ROLE_THEMES[currentRole];

  return (
    <div className="min-h-screen flex overflow-x-hidden selection:bg-indigo-500/30 relative z-10">
      <div className="flex w-full animate-in fade-in duration-1000">
        <Sidebar 
          currentRole={currentRole} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogout} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <div className="flex-1 flex flex-col lg:ml-64 w-full transition-all duration-300">
          <Header 
            user={user} 
            onOpenMenu={() => setIsSidebarOpen(true)}
            onOpenEcosystem={() => setIsEcosystemOpen(true)}
          />
          
          <main className="flex-1 mt-16 p-4 md:p-10 max-w-[1600px] mx-auto w-full pb-24 lg:pb-10">
            {renderContent()}
          </main>
        </div>

        {/* 16-Domain Ecosystem Modal Drawer */}
        <EcosystemDrawer 
          isOpen={isEcosystemOpen}
          currentRole={currentRole}
          onClose={() => setIsEcosystemOpen(false)}
          onSelectModule={(modId) => {
            setActiveTab('ecosystem');
          }}
        />

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 glass-sidebar border-t border-white/[0.06] lg:hidden flex items-center justify-around px-2 py-3 z-[50] safe-bottom">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Dash</span>
          </button>
          <button 
            onClick={() => setIsEcosystemOpen(true)} 
            className={`flex flex-col items-center gap-1 flex-1 transition-all text-indigo-400`}
          >
            <Layers size={20} />
            <span className="text-[9px] font-black uppercase tracking-widest">16 Modules</span>
          </button>
          <button 
            onClick={() => setActiveTab('journey')} 
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'journey' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <Sparkles size={20} strokeWidth={activeTab === 'journey' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Journey</span>
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className={`flex flex-col items-center gap-1 flex-1 text-slate-400`}
          >
            <Menu size={20} />
            <span className="text-[9px] font-black uppercase tracking-widest">System</span>
          </button>
        </nav>

        <AIAssistant role={currentRole} />
        <LiveNotificationToast messages={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
};

export default App;
