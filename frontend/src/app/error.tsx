'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4 relative z-10">
      <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl">
        <h1 className="text-xl font-bold text-rose-700">Something went wrong!</h1>
        <p className="mt-2 text-sm text-slate-600">
          An unexpected error occurred while rendering this page.
        </p>
        {error?.message && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-left text-xs font-mono text-rose-700 max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-primary-hover transition"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
