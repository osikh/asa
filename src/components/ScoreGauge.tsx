'use client';

import { useState, useEffect } from 'react';

interface ScoreGaugeProps {
  value: number;
  animate?: boolean;
}

export function ScoreGauge({ value, animate = true }: ScoreGaugeProps) {
  const [drawn, setDrawn] = useState(animate ? 0 : value);
  const size = 200;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.78;
  const arcLength = circumference * arcFraction;
  const offset = arcLength * (1 - drawn / 100);
  const rotateDeg = 90 + ((1 - arcFraction) / 2) * 360;

  useEffect(() => {
    if (!animate) { setDrawn(value); return; }
    let raf: number;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawn(Math.round(value * eased * 10) / 10);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);

  const overallBand =
    value >= 80 ? { cls: 'excellent', text: 'Excellent' } :
    value >= 50 ? { cls: 'good', text: 'Good' } :
                  { cls: 'needs-work', text: 'Needs Work' };

  return (
    <div className="card-block gauge-card">
      <div className="label-row">
        <span>Overall ASO Score</span>
        <span className="delta">↑ 8 since last audit</span>
      </div>
      <div className="gauge-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-cyan)" />
            </linearGradient>
          </defs>
          <g transform={`rotate(${rotateDeg} ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="var(--border)"
              strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
            />
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="url(#gaugeGrad)"
              strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={offset}
              style={{ filter: 'drop-shadow(0 0 6px rgba(123,94,255,0.4))' }}
            />
          </g>
        </svg>
        <div className="gauge-num">
          <span className="big">{Math.round(drawn)}</span>
          <span className="small">/ 100</span>
        </div>
      </div>
      <span className={`score-badge ${overallBand.cls}`}>
        <span className="dot" />
        {overallBand.text}
      </span>
    </div>
  );
}
