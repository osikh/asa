'use client';

import type { Recommendation } from '@/lib/types';

interface RecommendationCardProps {
  rec: Recommendation;
  accent?: 'default' | 'high' | 'strategic';
  delay?: number;
}

export function RecommendationCard({ rec, accent = 'default', delay = 0 }: RecommendationCardProps) {
  const cls = accent === 'high' ? 'rec-card high' :
              accent === 'strategic' ? 'rec-card strategic' :
              'rec-card';
  return (
    <article className={cls} style={{ animationDelay: `${delay}ms` }}>
      <header className="rec-head">
        <span className="rec-num">{rec.rank}</span>
        <span className={`badge ${rec.impactClass}`}>{rec.impact}</span>
        <span className="badge dim">{rec.dimension}</span>
      </header>
      <h4 className="rec-title">{rec.title}</h4>
      <span className="rec-section-label">Why</span>
      <p className="rec-why">{rec.why}</p>
      {rec.before?.trim() ? (
        <>
          <span className="rec-section-label">Before → After</span>
          <div className="diff-block">
            <div className="diff-line before">
              <span className="gutter">−</span>
              <span className="text">{rec.before}</span>
            </div>
            <div className="diff-line after">
              <span className="gutter">+</span>
              <span className="text">{rec.after}</span>
            </div>
          </div>
        </>
      ) : rec.after?.trim() ? (
        <>
          <span className="rec-section-label">Recommended</span>
          <div className="diff-block">
            <div className="diff-line after">
              <span className="gutter">+</span>
              <span className="text">{rec.after}</span>
            </div>
          </div>
        </>
      ) : null}
      <p className="rec-evidence"><span>{rec.evidence}</span></p>
    </article>
  );
}
