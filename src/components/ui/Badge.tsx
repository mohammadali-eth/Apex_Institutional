import React from 'react';
import { QuestionStatus, DifficultyLevel } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'difficulty' | 'year' | 'set' | 'info' | 'outline';
  status?: QuestionStatus | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
  difficulty?: DifficultyLevel;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  status,
  difficulty,
  className = '',
}) => {
  if (status) {
    const s = status.toLowerCase();
    let bg = 'bg-slate-100 text-slate-700 border-slate-200';
    if (s === 'approved') bg = 'bg-brand-primary-light text-brand-secondary border-brand-primary/40 font-medium';
    else if (s === 'submitted') bg = 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/30 font-medium';
    else if (s === 'draft') bg = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
    else if (s === 'rejected') bg = 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
    else if (s === 'archived') bg = 'bg-slate-100 text-slate-600 border-slate-300';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${bg} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
        {children}
      </span>
    );
  }

  if (difficulty) {
    let style = 'bg-brand-primary-light text-brand-secondary border-brand-primary/30';
    if (difficulty === 'Medium') style = 'bg-amber-50 text-amber-700 border-amber-200';
    if (difficulty === 'Hard') style = 'bg-rose-50 text-rose-700 border-rose-200';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${style} ${className}`}>
        {difficulty}
      </span>
    );
  }

  if (variant === 'year') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 ${className}`}>
        AY {children}
      </span>
    );
  }

  if (variant === 'set') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-brand-primary-light text-brand-title border border-brand-primary/40 ${className}`}>
        Set {children}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
      {children}
    </span>
  );
};
