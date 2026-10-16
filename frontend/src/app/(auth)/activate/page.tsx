'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authService, InvitationVerificationResponse } from '@/lib/services/authService';
import { useToast } from '@/hooks/useToast';
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User,
  ArrowRight,
  School,
  ShieldCheck,
} from 'lucide-react';

function ActivationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No activation token provided. Please use the link provided in your invitation email.');
      setLoading(false);
      return;
    }

    async function verify() {
      try {
        setLoading(true);
        const res = await authService.verifyInvitation(token);
        setInvitation(res);
        if (res.full_name) setFullName(res.full_name);
        // Pre-fill username from email prefix
        const emailPrefix = res.email.split('@')[0];
        setUsername(emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_'));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid or expired activation invitation.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      showToast('Validation Error', 'Password must be at least 8 characters long', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Validation Error', 'Passwords do not match', 'warning');
      return;
    }
    if (!username.trim()) {
      showToast('Validation Error', 'Username is required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await authService.acceptInvitation({
        token,
        password,
        full_name: fullName.trim() || undefined,
        username: username.trim(),
      });
      setSuccess(true);
      showToast('Account Activated', 'Your account has been successfully configured.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate account.';
      showToast('Error', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 bg-gradient-to-b from-slate-50 via-slate-100 to-emerald-50/30">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-200/80">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center mb-3 shadow-sm">
              <GraduationCap className="h-6 w-6 text-brand-primary" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Staff Account Activation
            </h2>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Activate your institutional academic account and set your permanent credentials.
            </p>
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
              <p className="text-xs text-slate-500 font-medium">Verifying invitation token...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-rose-900">Activation Link Invalid</h3>
              <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              <button
                onClick={() => router.push('/login')}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!loading && !error && success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">Activation Complete!</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your credentials have been securely stored. You can now access your authorized workspace.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full mt-3 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/25 transition"
              >
                Sign In to Portal
              </button>
            </div>
          )}

          {!loading && !error && !success && invitation && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invitation Metadata Pill */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Invited Identity
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-brand-primary-light text-brand-primary font-bold text-[10px]">
                    {invitation.role_name}
                  </span>
                </div>
                <div className="font-bold text-slate-800 font-mono">{invitation.email}</div>
                <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  <span>University: <strong>{invitation.university_name}</strong></span>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Ahmed Hassan"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/25 transition disabled:opacity-50"
              >
                <span>{submitting ? 'Activating Account...' : 'Complete Activation'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-transparent">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
        </div>
      }
    >
      <ActivationContent />
    </Suspense>
  );
}
