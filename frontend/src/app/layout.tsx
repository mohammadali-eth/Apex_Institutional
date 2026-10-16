import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/providers/AppProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Apex Institute - QPMS',
  description: 'Apex Question Paper Management System',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-brand-bg relative antialiased`}>
        {/* 1. Universal Architectural Blueprint Gridlines Background */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-70"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(69, 84, 92, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(69, 84, 92, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
          }}
          aria-hidden="true"
        />

        {/* 2. Universal Micro Drafting Gridlines for Academic Precision */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(128, 195, 67, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(128, 195, 67, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '11px 11px',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col min-h-screen">
          <AppProviders>
            {children}
          </AppProviders>
        </div>
      </body>
    </html>
  );
}
