'use client';

import { BrandMark, IconPlus } from './icons';

interface HeaderProps {
  onNewAudit: () => void;
}

export function Header({ onNewAudit }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark"><BrandMark size={20} /></span>
        <span className="brand-name">
          StoreAudit<span className="dim">/ ASO Agent</span>
        </span>
      </div>
      <div className="header-actions">
        <button className="model-pill" title="Model">
          <span className="dot" />
          <span>Atlas v2.1</span>
        </button>
        <button className="btn-ghost" onClick={onNewAudit}>
          <IconPlus size={14} />
          New Audit
        </button>
      </div>
    </header>
  );
}
