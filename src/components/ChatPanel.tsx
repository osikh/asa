'use client';

import { useRef, useEffect, useState } from 'react';
import { BrandMark, IconArrowExternal } from './icons';
import { ConfirmationCard } from './ConfirmationCard';
import { ProgressCard } from './ProgressCard';
import { ChatInput } from './ChatInput';
import { AUDIT_STEPS, EXAMPLE_CHIPS } from '@/lib/data';
import type { Message, ConfirmDecision } from '@/lib/types';

type Scraper = 'firecrawl' | 'manual';

interface ChatPanelProps {
  messages: Message[];
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onConfirm: () => void;
  onReject: () => void;
  confirmDecided: ConfirmDecision;
  progressStep: number;
  onPickChip: (url: string) => void;
  scraper: Scraper;
  onScraperChange: (s: Scraper) => void;
}

export function ChatPanel({
  messages, input, onInputChange, onSubmit,
  onConfirm, onReject, confirmDecided, progressStep, onPickChip,
  scraper, onScraperChange,
}: ChatPanelProps) {
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, progressStep]);

  const isEmpty = messages.length === 0;

  return (
    <section className="chat-panel" aria-label="Chat">
      <div className="chat-thread" ref={threadRef}>
        {isEmpty && <ChatWelcome onPickChip={onPickChip} />}
        {messages.map((msg, i) => {
          if (msg.kind === 'user') {
            return (
              <div key={i} className="msg user">
                <div className="bubble">{msg.text}</div>
              </div>
            );
          }
          if (msg.kind === 'ai-thinking') {
            return (
              <div key={i} className="msg ai">
                <div className="avatar"><BrandMark size={14} /></div>
                <div className="content">
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Looking up the app<ThinkingDots />
                  </p>
                </div>
              </div>
            );
          }
          if (msg.kind === 'ai-text') {
            return (
              <div key={i} className="msg ai">
                <div className="avatar"><BrandMark size={14} /></div>
                <div className="content">
                  {i === messages.length - 1
                    ? <StreamingText text={msg.text ?? ''} speed={14} />
                    : <p>{msg.text}</p>}
                </div>
              </div>
            );
          }
          if (msg.kind === 'confirm' && msg.appInfo) {
            return (
              <div key={i} className="msg ai">
                <div className="avatar"><BrandMark size={14} /></div>
                <div className="content">
                  <ConfirmationCard
                    appInfo={msg.appInfo}
                    onConfirm={onConfirm}
                    onReject={onReject}
                    decided={confirmDecided}
                  />
                </div>
              </div>
            );
          }
          if (msg.kind === 'progress') {
            const total = AUDIT_STEPS.length;
            const pct = Math.min(100, Math.round((progressStep / total) * 100));
            return (
              <div key={i} className="msg ai">
                <div className="avatar"><BrandMark size={14} /></div>
                <div className="content">
                  <ProgressCard currentStep={progressStep} percent={pct} />
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSubmit={onSubmit}
        placeholder="Paste an App Store URL…"
      />
      <div className="scraper-select-wrap">
        <div className="scraper-select">
          <span className="prefix">Scraping</span>
          <select
            id="scraper"
            value={scraper}
            onChange={e => onScraperChange(e.target.value as Scraper)}
          >
            <option value="manual">Manual + Firecrawl (default)</option>
          </select>
        </div>
      </div>
    </section>
  );
}

function ChatWelcome({ onPickChip }: { onPickChip: (url: string) => void }) {
  return (
    <div className="chat-welcome">
      <div className="mark"><BrandMark size={22} /></div>
      <h2>Paste an App Store URL to begin</h2>
      <p>Get a full ASO audit with scoring, quick wins, and competitor analysis.</p>
      <div className="chips">
        {EXAMPLE_CHIPS.map((c) => (
          <button key={c.value} className="example-chip" onClick={() => onPickChip(c.value)}>
            <IconArrowExternal size={13} className="arrow" />
            <span className="url">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingDots() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x % 3) + 1), 350);
    return () => clearInterval(id);
  }, []);
  return <span style={{ marginLeft: 2, color: 'var(--accent)' }}>{'.'.repeat(n)}</span>;
}

function StreamingText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i);
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  const done = shown >= text.length;
  return <p>{text.slice(0, shown)}{!done && <span className="cursor" />}</p>;
}
