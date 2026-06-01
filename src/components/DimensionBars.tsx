'use client';

import { useState, useEffect } from 'react';
import {
  IconType, IconText, IconKey, IconImage,
  IconVideo, IconStar, IconTarget, IconTrophy, IconCircle,
} from './icons';
import type { Dimension } from '@/lib/types';

const DIM_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  type: IconType, text: IconText, key: IconKey, image: IconImage,
  video: IconVideo, star: IconStar, target: IconTarget, trophy: IconTrophy,
};

function colorFor(s: number) {
  return s >= 8 ? 'var(--emerald)' : s >= 5 ? 'var(--amber)' : 'var(--red)';
}
function textColorFor(s: number) {
  return s >= 8 ? '#6FE7C2' : s >= 5 ? '#FCD34D' : '#FCA5A5';
}

function DimRow({ d, animated, delay }: { d: Dimension; animated: boolean; delay: number }) {
  const [hover, setHover] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [animated, delay]);

  const Ic = DIM_ICON_MAP[d.icon] ?? IconCircle;
  const color = colorFor(d.score);
  const textColor = textColorFor(d.score);

  return (
    <div
      className={`dim-row ${shown ? 'in' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="icon"><Ic size={14} /></span>
      <span className="name">{d.name}</span>
      <span className="bar">
        <span className="bar-fill" style={{ width: `${d.score * 10}%`, background: color }} />
      </span>
      <span className="num" style={{ color: textColor }}>{d.score.toFixed(1)}</span>
      {hover && (
        <div className="tooltip show">{d.issue}</div>
      )}
    </div>
  );
}

export function DimensionBars({ dimensions }: { dimensions: Dimension[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="card-block dim-card">
      <h3>10 Dimensions</h3>
      <p className="dim-sub">Each weighted by category impact on Apple search ranking & conversion.</p>
      <div className="dim-list">
        {dimensions.map((d, i) => (
          <DimRow key={d.id} d={d} animated={animated} delay={i * 60} />
        ))}
      </div>
    </div>
  );
}
