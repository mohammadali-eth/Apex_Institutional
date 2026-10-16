import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4 relative z-10">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-brand-title">404 Not Found</h1>
        <p className="mt-2 text-sm text-brand-paragraph">
          The requested page does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-brand-secondary shadow hover:bg-brand-primary-hover transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
