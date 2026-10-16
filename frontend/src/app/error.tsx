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
      <div className="max-w-md rounded-xl border border-rose-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-xl font-bold text-rose-700">Something went wrong!</h1>
        <p className="mt-2 text-sm text-slate-600">
          An unexpected error occurred while rendering this page.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-brand-secondary shadow hover:bg-brand-primary-hover transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
