'use client';

import { IconCheck, IconLoader, IconCircle } from './icons';
import { AUDIT_STEPS, SAMPLE_APP } from '@/lib/data';

interface ProgressCardProps {
  currentStep: number;
  percent: number;
}

export function ProgressCard({ currentStep, percent }: ProgressCardProps) {
  return (
    <div className="progress-card">
      <div className="progress-head">
        <IconLoader size={16} className="spin" />
        <span>Auditing {SAMPLE_APP.shortName}…</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        Step {Math.min(currentStep + 1, AUDIT_STEPS.length)} of {AUDIT_STEPS.length}
      </div>
      <div className="progress-steps">
        {AUDIT_STEPS.map((s, i) => {
          const status = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
          return (
            <div key={s.id} className={`progress-step ${status}`}>
              <span className="step-icon">
                {status === 'done' ? <IconCheck size={14} /> :
                 status === 'active' ? <IconLoader size={14} /> :
                 <IconCircle size={14} />}
              </span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
