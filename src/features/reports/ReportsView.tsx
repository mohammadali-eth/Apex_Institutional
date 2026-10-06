'use client';
import React from 'react';
import { BarChart3, ShieldCheck, History, CheckCircle2 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const auditLogs = [
    { id: 'aud-101', timestamp: '12 March 2026 14:32', user: 'Dr. Rahul Patel', action: 'Question Q-1024 edited', details: 'Created draft version v4 for approval.' },
    { id: 'aud-102', timestamp: '12 March 2026 11:20', user: 'Prof. Sunita Sharma', action: 'Approved Question Q-1024 v3', details: 'Promoted to active question bank.' },
    { id: 'aud-103', timestamp: '10 March 2026 16:45', user: 'Dr. Rahul Patel', action: 'Syllabus Ingestion Approved', details: 'Synced Unit 1, 2, 3 with CS-301 Data Structures.' },
    { id: 'aud-104', timestamp: '08 March 2026 09:15', user: 'Prof. Sunita Sharma', action: 'Compiled Paper QP-2026-001', details: 'Set A produced under 3-year repetition lookback filter.' }
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-brand-primary" />
          <h1 className="text-2xl font-bold text-brand-title">Examination Audit & Compliance Log</h1>
        </div>
        <p className="text-xs text-brand-paragraph mt-1">
          Complete audit traceability of question edits, version history branches, and generated examination sets.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-brand-bg-title border-b border-slate-200 text-[10px] font-bold text-brand-font uppercase tracking-wider">
              <th className="py-3 px-4">Audit ID</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-bold text-brand-secondary">{log.id}</td>
                <td className="py-3 px-4 text-slate-500">{log.timestamp}</td>
                <td className="py-3 px-4 font-bold text-slate-800">{log.user}</td>
                <td className="py-3 px-4 text-brand-title font-semibold">{log.action}</td>
                <td className="py-3 px-4 text-slate-600">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

