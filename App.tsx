import React, { useState, useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AIAssistant from './components/AIAssistant';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { FullPageLoader } from './components/LoadingSkeleton';
import { UserRole, UserProfile } from './types';
import { LayoutDashboard, BookOpen, Activity, FileText, Award, Settings, Sparkles } from 'lucide-react';
import { ROLE_THEMES } from './constants';
import { authApi, setTokens, clearTokens, getAccessToken } from './services/api';
import { useSocket } from './hooks/useSocket';
import { LiveNotificationToast } from './components/LiveNotificationToast';
import OfflineBanner from './components/OfflineBanner';

// Lazy-loaded Core 5 Pillars + Views for Maximum Network Performance & Chunk Splitting
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const AttendanceModule = React.lazy(() => import('./views/AttendanceModule'));
const SubjectsModule = React.lazy(() => import('./views/SubjectsModule'));
const FacultyCMS = React.lazy(() => import('./views/FacultyCMS'));
const ExamsModule = React.lazy(() => import('./views/ExamsModule'));
const AssignmentModule = React.lazy(() => import('./views/AssignmentModule'));
const CertificationsModule = React.lazy(() => import('./views/CertificationsModule'));
const UsersModule = React.lazy(() => import('./views/UsersModule'));
const SettingsModule = React.lazy(() => import('./views/SettingsModule'));
const LearningJourney = React.lazy(() => import('./views/LearningJourney'));
const LearningWorkspace = React.lazy(() => import('./views/LearningWorkspace'));
const PublicCatalog = React.lazy(() => import('./views/PublicCatalog'));
const CertificateVerification = React.lazy(() => import('./views/CertificateVerification'));
const PrivacyNotice = React.lazy(() => import('./views/PrivacyNotice'));
const Login = React.lazy(() => import('./components/Login').then(module => ({ default: module.Login })));

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.STUDENT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [user, setUser] = useState<UserProfile>({
    id: '',
    name: '',
    role: UserRole.STUDENT,
    email: '',
  });

  const { toasts, dismissToast } = useSocket(user.id, user.org_id || 'org-edusphere');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 800);
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

  // Listen for unauthorized 401 events
  useEffect(() => {
    const handleUnauthorized = () => {
      clearTokens();
      setIsLoggedIn(false);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Automatic Session Recovery on App Mount
  useEffect(() => {
    const checkPersistedSession = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const backendUser = await authApi.getMe();
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
          is_active: backendUser.is_active,
        });
        if (backendUser.must_change_password) {
          clearTokens();
          setIsLoggedIn(false);
          return;
        }

        setCurrentRole(mappedRole);
        setIsLoggedIn(true);
      } catch (err) {
        console.warn('Session verification failed, clearing tokens:', err);
        clearTokens();
        setIsLoggedIn(false);
      }
    };

    checkPersistedSession();

    const handleSwitchTab = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('switch-tab', handleSwitchTab);
    return () => {
      window.removeEventListener('switch-tab', handleSwitchTab);
    };
  }, []);

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
  };

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard role={currentRole} />;
        case 'academics':
          return <SubjectsModule id="academics" role={currentRole} />;
        case 'cms':
          return <FacultyCMS role={currentRole} />;
        case 'attendance':
          return <AttendanceModule id="attendance" role={currentRole} />;
        case 'exams':
          return <ExamsModule id="exams" role={currentRole} />;
        case 'assignments':
          return <AssignmentModule role={currentRole} />;
        case 'certificates':
          return <CertificationsModule user={user} />;
        case 'users':
          return <UsersModule currentUserRole={currentRole} />;
        case 'journey':
          return <LearningJourney />;
        case 'catalog':
          return <PublicCatalog />;
        case 'workspace':
          return <LearningWorkspace courseData={selectedCourse} onBack={() => setActiveTab('academics')} />;
        case 'settings':
          return <SettingsModule user={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} />;
        case 'privacy':
          return <PrivacyNotice onBack={() => setActiveTab('dashboard')} />;
        default:
          return <Dashboard role={currentRole} />;
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

  if (window.location.pathname.startsWith('/privacy')) {
    return (
      <div className="min-h-screen flex flex-col">
        <OfflineBanner />
        <Suspense fallback={<FullPageLoader />}>
          <PrivacyNotice onBack={() => { window.location.href = '/'; }} />
        </Suspense>
      </div>
    );
  }

  if (window.location.pathname.startsWith('/verify-certificate') || window.location.pathname.startsWith('/verify')) {
    return (
      <div className="min-h-screen flex flex-col">
        <OfflineBanner />
        <Suspense fallback={<FullPageLoader />}>
          <CertificateVerification />
        </Suspense>
      </div>
    );
  }
  if (window.location.pathname.startsWith('/public-catalog')) {
    return (
      <div className="min-h-screen flex flex-col">
        <OfflineBanner />
        <Suspense fallback={<FullPageLoader />}>
          <PublicCatalog />
        </Suspense>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <OfflineBanner />
        <Suspense fallback={<FullPageLoader />}>
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
        </Suspense>
      </div>
    );
  }

  const theme = ROLE_THEMES[currentRole];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden selection:bg-indigo-500/30 relative z-10">
      <OfflineBanner />
      <div className="flex w-full animate-in fade-in duration-1000 flex-1">
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
          />
          
          <main className="flex-1 mt-16 p-4 md:p-10 max-w-[1600px] mx-auto w-full pb-24 lg:pb-10">
            {renderContent()}
          </main>
        </div>

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
            onClick={() => setActiveTab('academics')} 
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'academics' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <BookOpen size={20} />
            <span className="text-[9px] font-black uppercase tracking-widest">Courses</span>
          </button>
          <button 
            onClick={() => setActiveTab('attendance')} 
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'attendance' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <Activity size={20} />
            <span className="text-[9px] font-black uppercase tracking-widest">Attendance</span>
          </button>
          <button 
            onClick={() => setActiveTab('exams')} 
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'exams' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <FileText size={20} />
            <span className="text-[9px] font-black uppercase tracking-widest">Quizzes</span>
          </button>
          <button 
            onClick={() => setActiveTab('certificates')} 
            className={`flex flex-col items-center gap-1 flex-1 transition-all ${activeTab === 'certificates' ? 'text-indigo-400' : 'text-slate-500'}`}
          >
            <Award size={20} />
            <span className="text-[9px] font-black uppercase tracking-widest">Certs</span>
          </button>
        </nav>
        <LiveNotificationToast messages={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
};

export default App;
