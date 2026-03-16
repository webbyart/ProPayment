import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  FolderKanban, 
  Banknote, 
  Calculator, 
  FileBarChart, 
  FileText, 
  LogOut,
  Settings
} from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Sidebar: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Clock, label: 'Timesheet', path: '/timesheet' },
    { icon: Users, label: 'Employees', path: '/employees' },
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: Banknote, label: 'Rates', path: '/rates' },
    { icon: Calculator, label: 'Payroll', path: '/payroll' },
    { icon: FileBarChart, label: 'Reports', path: '/reports' },
    { icon: FileText, label: 'Payslip', path: '/payslip' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (role === 'admin') return true;
    if (role === 'hr') {
      return item.path === '/employees' || item.path === '/timesheet';
    }
    return false;
  });

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="text-emerald-500" />
          Smart Payroll
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">ERP System</p>
        <p className="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-widest">Role: {role}</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredMenuItems.map((item) => {
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={cn("transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-emerald-400")} />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-400"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
