'use client';

import { BrandMark, IconArrowExternal } from './icons';
import { AppIcon } from './AppIcon';
import { ScoreGauge } from './ScoreGauge';
import { DimensionBars } from './DimensionBars';
import { Tabs } from './Tabs';
import { RecommendationCard } from './RecommendationCard';
import { CompetitorTable } from './CompetitorTable';
import { DIMENSIONS, OVERALL_SCORE, QUICK_WINS, HIGH_IMPACT, STRATEGIC } from '@/lib/data';
import type { Phase, AuditResult, AuditCompetitor } from '@/lib/types';

interface ResultsPanelProps {
  phase: Phase;
  activeTab: string;
  setActiveTab: (id: string) => void;
  auditResult: AuditResult | null;
}

export function ResultsPanel({ phase, activeTab, setActiveTab, auditResult }: ResultsPanelProps) {
  return (
    <section className="results-panel" aria-label="Results">
      {phase === 'empty' || phase === 'thinking' ? (
        <ResultsEmpty pulse={false} />
      ) : phase === 'confirmation' ? (
        <ResultsEmpty pulse={true} />
      ) : phase === 'running' ? (
        <ResultsSkeleton />
      ) : (
        <ResultsFull activeTab={activeTab} setActiveTab={setActiveTab} auditResult={auditResult} />
      )}
    </section>
  );
}

function ResultsEmpty({ pulse }: { pulse: boolean }) {
  return (
    <div className={`results-empty ${pulse ? 'pulse' : ''}`}>
      <div className={`glyph ${pulse ? 'pulse' : ''}`}>
        <BrandMark size={64} />
      </div>
      <p>Your audit will appear here.</p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="skeleton-wrap">
      <div className="sk-row">
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: 220, height: 14 }} />
          <div className="skeleton" style={{ width: 140, height: 11, marginTop: 6 }} />
        </div>
        <div className="skeleton" style={{ width: 110, height: 30, borderRadius: 999 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        <div className="skeleton" style={{ height: 280 }} />
        <div className="skeleton" style={{ height: 280 }} />
      </div>
      <div className="skeleton" style={{ width: 360, height: 36, borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 140 }} />
      <div className="skeleton" style={{ height: 140 }} />
    </div>
  );
}

function ResultsFull({
  activeTab,
  setActiveTab,
  auditResult,
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
  auditResult: AuditResult | null;
}) {
  const score = auditResult?.overallScore ?? OVERALL_SCORE;
  const dimensions = auditResult?.dimensions ?? DIMENSIONS;
  const quickWins = auditResult?.quickWins ?? QUICK_WINS;
  const highImpact = auditResult?.highImpact ?? HIGH_IMPACT;
  const strategic = auditResult?.strategic ?? STRATEGIC;

  const appName = auditResult?.app.name ?? 'Audit Results';
  const appDev = auditResult?.app.developer ?? '';
  const appCat = auditResult?.app.category ?? '';
  const appIconUrl = auditResult?.app.iconUrl;

  const auditedCompetitor: AuditCompetitor | null = auditResult
    ? {
        id: auditResult.app.appId,
        name: auditResult.app.name,
        you: true,
        iconUrl: auditResult.app.iconUrl,
        developer: auditResult.app.developer,
        rating: auditResult.app.rating,
        ratingCount: auditResult.app.ratingCount,
        screenshotCount: auditResult.app.screenshotCount,
        category: auditResult.app.category,
        price: auditResult.app.price,
        url: auditResult.app.storeUrl,
      }
    : null;

  return (
    <>
      <div className="results-header">
        <AppIcon imgUrl={appIconUrl} letter={appName[0]} size={36} />
        <div className="titles">
          <h1>{appName}</h1>
          <p className="sub">{appDev}{appCat ? ` · ${appCat}` : ''}</p>
        </div>
        <span className="score-pill">
          <span className="label">Score</span>
          <span className="num">{score} / 100</span>
        </span>
        <button className="btn-icon" title="Export">
          <IconArrowExternal size={15} />
        </button>
      </div>

      <div className="results-body">
        <div className="score-section">
          <ScoreGauge value={score} />
          <DimensionBars dimensions={dimensions} />
        </div>

        <Tabs active={activeTab} onChange={setActiveTab} />

        <div className="tab-content">
          {activeTab === 'quick' && (
            <div className="rec-list">
              {quickWins.map((r, i) => (
                <RecommendationCard key={r.rank} rec={r} accent="default" delay={i * 80} />
              ))}
            </div>
          )}
          {activeTab === 'high' && (
            <div className="rec-list">
              {highImpact.map((r, i) => (
                <RecommendationCard key={r.rank} rec={r} accent="high" delay={i * 80} />
              ))}
            </div>
          )}
          {activeTab === 'strategic' && (
            <div className="rec-list">
              {strategic.map((r, i) => (
                <RecommendationCard key={r.rank} rec={r} accent="strategic" delay={i * 80} />
              ))}
            </div>
          )}
          {activeTab === 'compete' && auditedCompetitor && (
            <CompetitorTable audited={auditedCompetitor} competitors={auditResult?.competitors ?? []} />
          )}
          {activeTab === 'compete' && !auditedCompetitor && (
            <p style={{ color: 'var(--text-secondary)', padding: 16 }}>No competitor data available.</p>
          )}
        </div>
      </div>
    </>
  );
}
