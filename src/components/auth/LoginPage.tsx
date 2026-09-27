import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../lib/i18n';
import { userService } from '../../services/userService';
import { ROLE_DEFINITIONS } from '../../lib/permissions/rolePermissions';
import { GraduationCap, ArrowRight, Eye, EyeOff, UserCheck } from 'lucide-react';

interface LoginPageProps {
  onSuccess: (status: { requiresDeptSelection: boolean; noDeptAssigned: boolean }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();

  const [availableUsers, setAvailableUsers] = useState(() => userService.getUsers());
  const [selectedUserId, setSelectedUserId] = useState(() => availableUsers[0]?.id || 'u-rahul');
  const [email, setEmail] = useState(() => availableUsers[0]?.email || 'rahul.patel@apexuniversity.edu');
  const [password, setPassword] = useState('ApexSecure#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    const handleRefreshUsers = () => {
      const refreshed = userService.getUsers();
      setAvailableUsers(refreshed);
      if (!refreshed.some(user => user.id === selectedUserId)) {
        setSelectedUserId(refreshed[0]?.id || 'u-rahul');
      }
    };
    window.addEventListener('qpms_users_updated', handleRefreshUsers);
    return () => window.removeEventListener('qpms_users_updated', handleRefreshUsers);
  }, [selectedUserId]);

  const handleUserSelect = (id: string) => {
    setSelectedUserId(id);
    const u = availableUsers.find(user => user.id === id);
    if (u) {
      setEmail(u.email);
      setEmailError('');
      setPasswordError('');
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setEmailError('Please enter your institutional email address.');
      showToast('Login failed', 'Email is required to continue.', 'warning');
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setEmailError('Use a valid university email format, such as name@college.edu.');
      showToast('Login failed', 'The email format looks invalid.', 'warning');
      return;
    }

    const matched = availableUsers.find(u => u.email.toLowerCase() === trimmedEmail);
    const selectedMatch = availableUsers.find(u => u.id === selectedUserId);
    const targetUser = matched || selectedMatch || availableUsers[0];

    if (!targetUser) {
      setEmailError('No demo user is available for sign-in.');
      showToast('Login failed', 'No demo user is available to sign in.', 'error');
      return;
    }

    if (matched && matched.id !== selectedUserId) {
      setSelectedUserId(matched.id);
    }

    if (!password.trim()) {
      setPasswordError('Please enter the institutional password.');
      showToast('Login failed', 'Password is required to continue.', 'warning');
      return;
    }

    const elevated = !['faculty', 'student', 'viewer', 'guest'].includes(targetUser.role);
    if (elevated && !mfaRequired) {
      setMfaRequired(true);
      showToast('Demo MFA', 'Enter the demo verification code 246810 to continue.', 'info');
      return;
    }
    if (elevated && mfaCode !== '246810') {
      setPasswordError('Enter the demo MFA code 246810.');
      return;
    }

    const resolvedEmail = matched ? matched.email : targetUser.email;
    if (trimmedEmail !== resolvedEmail.toLowerCase()) {
      setEmailError('This email does not match the selected university profile.');
      showToast('Login failed', 'Use the email linked to the selected persona.', 'warning');
      return;
    }

    setSelectedUserId(targetUser.id);
    setEmail(targetUser.email);
    setEmailError('');
    setPasswordError('');
    setIsLoading(true);

    window.setTimeout(() => {
      setIsLoading(false);
      const res = login(targetUser.id);
      showToast('Welcome back', `${targetUser.name} has been signed in successfully.`, 'success');
      if (window.location.hash !== '#dashboard') {
        window.location.hash = '#dashboard';
      }
      onSuccess(res);
    }, 300);
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
                aria-invalid={Boolean(emailError)}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-medium ${
                  emailError ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                }`}
              />
              {emailError && <p className="mt-2 text-xs text-rose-600">{emailError}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase text-brand-font tracking-wider">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Password Recovery', 'Password reset is managed through the University Central Directory.', 'info');
                  }}
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
                  aria-invalid={Boolean(passwordError)}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Enter institutional password"
                  className={`w-full px-3.5 py-2.5 pr-10 bg-white border rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-medium ${
                    passwordError ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                  }`}
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
              {passwordError && <p className="mt-2 text-xs text-rose-600">{passwordError}</p>}
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

            {mfaRequired && <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-brand-font">Demo MFA code</label><input inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={event => setMfaCode(event.target.value)} placeholder="246810" className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" /><p className="mt-1 text-[11px] text-slate-500">Frontend simulation only. Use 246810.</p></div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : mfaRequired ? 'Verify and sign in' : t('auth.signIn')}</span>
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
                let badge = ROLE_DEFINITIONS[user.role].label;
                if (deptCount === 0) badge += ' • University scope';
                else if (deptCount > 1) badge += ` • ${deptCount} departments`;

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
