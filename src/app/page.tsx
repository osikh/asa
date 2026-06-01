'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { ChatPanel } from '@/components/ChatPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { AUDIT_STEPS } from '@/lib/data';
import type { Phase, Message, ConfirmDecision, AuditResult, FetchedAppInfo } from '@/lib/types';
import type { AppStoreListing } from '@/mastra/tools/itune-scraping-tool';

const AUDIT_SPEED = 800;

export default function Home() {
  const [phase, setPhase] = useState<Phase>('empty');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [confirmDecided, setConfirmDecided] = useState<ConfirmDecision>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [activeTab, setActiveTab] = useState('quick');
  const [listing, setListing] = useState<AppStoreListing | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [scraper, setScraper] = useState<'firecrawl' | 'manual'>('manual');

  const submitUrl = async () => {
    const url = input.trim();
    if (!url) return;

    setMessages(m => [...m, { kind: 'user', text: url }, { kind: 'ai-thinking' }]);
    setInput('');
    setConfirmDecided(null);
    setListing(null);
    setAuditResult(null);
    setPhase('thinking');

    try {
      const res = await fetch('/api/audit/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, scraper }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessages(m => {
          const copy = [...m];
          const i = copy.findIndex(x => x.kind === 'ai-thinking');
          if (i >= 0) copy[i] = { kind: 'ai-text', text: `Couldn't fetch that URL: ${data.error}` };
          return copy;
        });
        setPhase('empty');
        return;
      }

      const fetched: AppStoreListing = data.listing;
      setListing(fetched);

      const appInfo: FetchedAppInfo = {
        appId: fetched.appId,
        name: fetched.name,
        developer: fetched.developer,
        category: fetched.category,
        rating: fetched.rating,
        ratingCount: fetched.ratingCount,
        iconUrl: fetched.iconUrl,
        storeUrl: fetched.url,
      };

      setMessages(m => {
        const copy = [...m];
        const i = copy.findIndex(x => x.kind === 'ai-thinking');
        if (i >= 0) copy[i] = { kind: 'ai-text', text: 'Found it — is this the right app?' };
        return [...copy, { kind: 'confirm', appInfo }];
      });
      setPhase('confirmation');
    } catch {
      setMessages(m => {
        const copy = [...m];
        const i = copy.findIndex(x => x.kind === 'ai-thinking');
        if (i >= 0) copy[i] = { kind: 'ai-text', text: 'Network error — please try again.' };
        return copy;
      });
      setPhase('empty');
    }
  };

  const handleConfirm = async () => {
    if (confirmDecided || !listing) return;
    setConfirmDecided('yes');
    setPhase('running');
    setProgressStep(0);

    setMessages(m => [...m, { kind: 'user', text: "Yes, that's it." }, { kind: 'progress' }]);

    let step = 0;
    const stepInterval = setInterval(() => {
      step += 1;
      setProgressStep(step);
      if (step >= AUDIT_STEPS.length) clearInterval(stepInterval);
    }, AUDIT_SPEED * 1.2);

    try {
      const res = await fetch('/api/audit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing }),
      });

      clearInterval(stepInterval);
      const data = await res.json();

      if (!data.ok) {
        setMessages(m => [...m, { kind: 'ai-text', text: `Audit failed: ${data.error}` }]);
        setPhase('confirmation');
        return;
      }

      const result: AuditResult = data.result;
      setAuditResult(result);
      setProgressStep(AUDIT_STEPS.length);

      setMessages(m => [
        ...m,
        {
          kind: 'ai-text',
          text: `Audit complete. Overall score ${result.overallScore} / 100 — see results →`,
        },
      ]);
      setPhase('results');
    } catch {
      clearInterval(stepInterval);
      setMessages(m => [...m, { kind: 'ai-text', text: 'Audit failed — network error. Please try again.' }]);
      setPhase('confirmation');
    }
  };

  const handleReject = () => {
    if (confirmDecided) return;
    setConfirmDecided('no');
    setListing(null);
    setMessages(m => [
      ...m,
      { kind: 'user', text: 'Wrong app.' },
      { kind: 'ai-text', text: "No problem — paste another App Store URL and I'll try again." },
    ]);
    setPhase('empty');
  };

  const newAudit = () => {
    setMessages([]);
    setInput('');
    setConfirmDecided(null);
    setProgressStep(0);
    setListing(null);
    setAuditResult(null);
    setPhase('empty');
    setActiveTab('quick');
  };

  return (
    <div className="app">
      <Header onNewAudit={newAudit} />
      <div className="split">
        <div className="split-divider" />
        <ChatPanel
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSubmit={submitUrl}
          onConfirm={handleConfirm}
          onReject={handleReject}
          confirmDecided={confirmDecided}
          progressStep={progressStep}
          onPickChip={setInput}
          scraper={scraper}
          onScraperChange={setScraper}
        />
        <ResultsPanel
          phase={phase}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          auditResult={auditResult}
        />
      </div>
    </div>
  );
}
