import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogIn, User, Lock } from 'lucide-react';
import { useAuth } from '../AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login failed', err);
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Settings className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Smart Payroll ERP</h1>
          <p className="text-slate-500 mt-2">Professional HR & Payroll Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="admin or staff1-5"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password"
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Secure Enterprise Access</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
