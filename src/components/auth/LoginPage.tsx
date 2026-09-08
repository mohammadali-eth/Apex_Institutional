import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../lib/i18n';
import { userService } from '../../services/userService';
import { GraduationCap, ArrowRight, Eye, EyeOff, UserCheck } from 'lucide-react';

interface LoginPageProps {
  onSuccess: (status: { requiresDeptSelection: boolean; noDeptAssigned: boolean }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const { t } = useI18n();

  const [availableUsers, setAvailableUsers] = useState(() => userService.getUsers());
  const [selectedUserId, setSelectedUserId] = useState(() => availableUsers[0]?.id || 'u-rahul');
  const [email, setEmail] = useState(() => availableUsers[0]?.email || 'rahul.patel@apexuniversity.edu');
  const [password, setPassword] = useState('ApexSecure#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleRefreshUsers = () => {
      setAvailableUsers(userService.getUsers());
    };
    window.addEventListener('qpms_users_updated', handleRefreshUsers);
    return () => window.removeEventListener('qpms_users_updated', handleRefreshUsers);
  }, []);

  const handleUserSelect = (id: string) => {
    setSelectedUserId(id);
    const u = availableUsers.find(user => user.id === id);
    if (u) {
      setEmail(u.email);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // If user typed custom email matching a user, use that user's id
      const matched = availableUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      const res = login(matched ? matched.id : selectedUserId);
      onSuccess(res);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 bg-brand-secondary rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <GraduationCap className="h-8 w-8 text-brand-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-brand-title">
          {t('app.fullName')}
        </h2>
        <p className="mt-1 text-xs text-brand-paragraph">
          {t('app.institution')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <form className="space-y-5" onSubmit={handleSignIn}>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-font tracking-wider mb-1.5">
                Institutional Email ID
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase text-brand-font tracking-wider">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); alert('Password recovery is managed via the University Central Directory.'); }}
                  className="text-xs text-brand-font hover:text-brand-title"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter institutional password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-brand-title focus:outline-none transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 text-brand-paragraph cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                />
                <span>Remember this terminal</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : t('auth.signIn')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Persona Switcher (Requirement #5 & #6) */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold uppercase text-brand-title">
                <UserCheck className="h-4 w-4 text-brand-primary" />
                <span>{t('auth.switchUser')}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{availableUsers.length} accounts</span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {availableUsers.map(user => {
                const isSelected = user.id === selectedUserId;
                const deptCount = user.assignedDepartments.length;
                let badge = `${deptCount} Department`;
                if (user.role === 'teacher' && deptCount === 0) badge = 'No Department (Blocked Flow)';
                else if (deptCount > 1) badge = `${deptCount} Departments (Multi-Select)`;
                else if (user.role === 'hod') badge = 'HOD / Department Admin';
                else if (user.role === 'coordinator') badge = 'Exam Coordinator';
                else if (user.role === 'university_admin') badge = 'University Admin';

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserSelect(user.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-center justify-between ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary-light text-slate-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{user.name}</div>
                      <div className="text-[11px] text-brand-paragraph">{user.email}</div>
                    </div>
                    <span className="text-[10px] uppercase font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-brand-title">
                      {badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
