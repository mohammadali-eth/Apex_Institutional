'use client';
import React from 'react';
import { QuestionVersion } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { History, GitCommit, Eye, ArrowLeftRight } from 'lucide-react';

interface VersionHistoryTimelineProps {
  versions: QuestionVersion[];
  onViewVersion?: (version: QuestionVersion) => void;
  onCompareVersions?: () => void;
}

export const VersionHistoryTimeline: React.FC<VersionHistoryTimelineProps> = ({
  versions,
  onViewVersion,
  onCompareVersions,
}) => {
  if (!versions || versions.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4 italic">No version history available.</div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-brand-600" />
          <h4 className="text-base font-semibold text-slate-900">Version History</h4>
          <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
            {versions.length} {versions.length === 1 ? 'version' : 'versions'}
          </span>
        </div>
        {versions.length > 1 && onCompareVersions && (
          <button
            type="button"
            onClick={onCompareVersions}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition border border-brand-200"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Compare Versions</span>
          </button>
        )}
      </div>

      <div className="mt-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {versions.map((ver, idx) => (
          <div key={ver.version} className="relative mb-6 last:mb-0 group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                idx === 0 ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-slate-400'
              }`}
            >
              <GitCommit className="w-2.5 h-2.5 text-white" />
            </div>

            <div className="bg-slate-50/80 hover:bg-slate-100/80 transition rounded-lg border border-slate-200/80 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-900">Version {ver.version}</span>
                  {idx === 0 && (
                    <span className="text-[10px] uppercase font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                  <Badge status={ver.status}>{ver.status}</Badge>
                </div>
                {onViewVersion && (
                  <button
                    type="button"
                    onClick={() => onViewVersion(ver)}
                    className="inline-flex items-center space-x-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View</span>
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 mb-2">
                <span>Edited by <strong className="text-slate-700">{ver.editedBy}</strong></span>
                <span className="mx-1.5">•</span>
                <span>{ver.editedAt}</span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 italic mb-1.5 bg-white p-2 rounded border border-slate-100">
                "{ver.text}"
              </p>

              {ver.comments && (
                <div className="text-xs text-slate-500 mt-1">
                  <strong className="text-slate-600">Review Note:</strong> {ver.comments}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

