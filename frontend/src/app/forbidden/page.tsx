import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="m-8 rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-xl font-bold text-slate-900">403 Access Denied</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your role or current scope does not allow access to this module.
      </p>
      <div className="mt-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-brand-secondary shadow hover:bg-brand-primary-hover"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
