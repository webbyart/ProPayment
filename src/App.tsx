import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Sidebar from './components/Sidebar';
import { cn } from './utils/cn';
import { LayoutDashboard, Clock, Users, Calculator, FileText, FolderKanban } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Timesheet from './pages/Timesheet';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Rates from './pages/Rates';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Payslip from './pages/Payslip';
import Login from './pages/Login';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen pb-24 md:pb-8">
        {children}
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav />
      </div>
    </div>
  );
};

const MobileNav: React.FC = () => {
  const { role } = useAuth();
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dash', path: '/' },
    { icon: Clock, label: 'Time', path: '/timesheet' },
    { icon: Users, label: 'Staff', path: '/employees' },
    { icon: FolderKanban, label: 'Proj', path: '/projects' },
    { icon: Calculator, label: 'Pay', path: '/payroll' },
  ];

  const filteredItems = menuItems.filter(item => {
    if (role === 'admin') return true;
    if (role === 'hr') return item.path === '/employees' || item.path === '/timesheet';
    return false;
  });

  return (
    <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 py-3 flex justify-around items-center shadow-[0_-8px_30px_rgba(0,0,0,0.08)] rounded-t-[32px]">
      {filteredItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `relative flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300 ${
            isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {({ isActive }) => (
            <>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest transition-all",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/timesheet" element={<Layout><Timesheet /></Layout>} />
          <Route path="/employees" element={<Layout><Employees /></Layout>} />
          <Route path="/projects" element={<Layout><Projects /></Layout>} />
          <Route path="/rates" element={<Layout><Rates /></Layout>} />
          <Route path="/payroll" element={<Layout><Payroll /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/payslip" element={<Layout><Payslip /></Layout>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
