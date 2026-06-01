'use client';

import { AppIcon } from './AppIcon';
import type { AuditCompetitor } from '@/lib/types';

const fmtCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);

const fmtPrice = (p: number) => (p === 0 ? 'Free' : `$${p.toFixed(2)}`);

interface CompetitorTableProps {
  audited: AuditCompetitor;
  competitors: AuditCompetitor[];
}

export function CompetitorTable({ audited, competitors }: CompetitorTableProps) {
  const all = [{ ...audited, you: true }, ...competitors];

  return (
    <div className="card-block comp-card" style={{ marginTop: 16 }}>
      <h3>Competitor Analysis</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 16px 12px' }}>
        Similar apps found in search
      </p>
      <div className="comp-table-wrap">
        <table className="comp-table">
          <thead>
            <tr>
              <th style={{ width: 200 }}>App</th>
              <th>Rating</th>
              <th>Reviews</th>
              <th>Screenshots</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {all.map(c => (
              <tr key={c.id} className={c.you ? 'you' : ''}>
                <td>
                  <span className="col-app">
                    <AppIcon imgUrl={c.iconUrl} letter={c.name[0]} size={24} />
                    <span>
                      {c.name}
                      {c.you && <span style={{ color: 'var(--accent-bright)', marginLeft: 4 }}>· you</span>}
                    </span>
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{c.rating.toFixed(1)}</span>
                  <span style={{ color: 'var(--amber)', marginLeft: 4 }}>★</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtCount(c.ratingCount)}</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{c.screenshotCount}/10</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtPrice(c.price)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
