/**
 * Centralized, validated environment configuration for the Next.js frontend application.
 *
 * Enforces client-safe variables (prefixed with NEXT_PUBLIC_) and prevents accidental
 * exposure of server-only secrets.
 */

export interface ClientEnv {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_APP_ENV: 'development' | 'test' | 'staging' | 'production';
  NEXT_PUBLIC_APP_NAME: string;
}

function resolveClientEnv(): ClientEnv {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const rawEnv = process.env.NEXT_PUBLIC_APP_ENV || 'development';
  const appEnv: ClientEnv['NEXT_PUBLIC_APP_ENV'] = [
    'development',
    'test',
    'staging',
    'production',
  ].includes(rawEnv)
    ? (rawEnv as ClientEnv['NEXT_PUBLIC_APP_ENV'])
    : 'development';

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Apex QPMS';

  // Basic sanity validation
  if (appEnv === 'production' && apiUrl.includes('localhost')) {
    console.warn(
      '[QPMS Env Warning] NEXT_PUBLIC_API_URL is configured to localhost in a production build: ' +
        apiUrl
    );
  }

  return {
    NEXT_PUBLIC_API_URL: apiUrl.replace(/\/+$/, ''),
    NEXT_PUBLIC_APP_ENV: appEnv,
    NEXT_PUBLIC_APP_NAME: appName,
  };
}

export const env: ClientEnv = resolveClientEnv();
