'use client';

import { useRef, useEffect, useState } from 'react';
import { IconZap, IconTrendingUp, IconCompass, IconBarChart } from './icons';
import type { TabDef } from '@/lib/types';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  quick: IconZap,
  high: IconTrendingUp,
  strategic: IconCompass,
  compete: IconBarChart,
};

export const TABS: TabDef[] = [
  { id: 'quick',     label: 'Quick Wins',  count: 3 },
  { id: 'high',      label: 'High-Impact', count: 2 },
  { id: 'strategic', label: 'Strategic',   count: 1 },
  { id: 'compete',   label: 'Competitors', count: null },
];

interface TabsProps {
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ active, onChange }: TabsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = wrapRef.current?.querySelector(`[data-tab="${active}"]`) as HTMLElement | null;
    if (el && wrapRef.current) {
      const parentRect = wrapRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setUnderline({ left: r.left - parentRect.left, width: r.width });
    }
  }, [active]);

  return (
    <div ref={wrapRef} className="tabs" role="tablist">
      {TABS.map((t) => {
        const Ic = ICON_MAP[t.id];
        return (
          <button
            key={t.id}
            data-tab={t.id}
            className={`tab-btn ${active === t.id ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
            role="tab"
            aria-selected={active === t.id}
          >
            {Ic && <Ic size={14} />}
            <span>{t.label}</span>
            {t.count != null && <span className="tab-count">{t.count}</span>}
          </button>
        );
      })}
      <span className="tab-underline" style={{ left: underline.left, width: underline.width }} />
    </div>
  );
}
