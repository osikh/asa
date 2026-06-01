'use client';

import { AppIcon } from './AppIcon';
import { IconCheck, IconX, IconStar } from './icons';
import type { FetchedAppInfo, ConfirmDecision } from '@/lib/types';

interface ConfirmationCardProps {
  appInfo: FetchedAppInfo;
  onConfirm: () => void;
  onReject: () => void;
  decided: ConfirmDecision;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);

export function ConfirmationCard({ appInfo, onConfirm, onReject, decided }: ConfirmationCardProps) {
  return (
    <div className="confirm-card">
      <div className="confirm-card-body">
        <AppIcon imgUrl={appInfo.iconUrl} letter={appInfo.name[0]} size={56} />
        <div className="app-meta">
          <h3 className="app-name">{appInfo.name}</h3>
          <p className="app-dev">by {appInfo.developer}</p>
          <div className="app-meta-row">
            <span className="stars">
              <IconStar size={12} />
              <span style={{ marginLeft: 4, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {appInfo.rating.toFixed(1)}
              </span>
            </span>
            <span className="dot-sep">·</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {fmt(appInfo.ratingCount)} reviews
            </span>
            <span className="dot-sep">·</span>
            <span className="cat-pill">{appInfo.category}</span>
          </div>
        </div>
      </div>
      <div className="confirm-actions">
        <button className="btn-primary" onClick={onConfirm} disabled={decided !== null}>
          <IconCheck size={14} />
          {decided === 'yes' ? 'Confirmed' : "Yes, that's it"}
        </button>
        <button className="btn-secondary" onClick={onReject} disabled={decided !== null}>
          <IconX size={14} />
          Wrong app
        </button>
      </div>
    </div>
  );
}
