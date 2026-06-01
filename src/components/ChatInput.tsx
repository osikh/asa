'use client';

import { useState, useRef, useEffect } from 'react';
import { IconArrowUp } from './icons';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function ChatInput({ value, onChange, onSubmit, placeholder }: ChatInputProps) {
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  };

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  return (
    <div className="chat-input-wrap">
      <div className={`chat-input ${focused ? 'focused' : ''}`}>
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          placeholder={placeholder ?? 'Paste an App Store URL…'}
        />
        <button
          className={`send-btn ${value.trim() ? 'active' : ''}`}
          disabled={!value.trim()}
          onClick={onSubmit}
          aria-label="Send"
        >
          <IconArrowUp size={16} />
        </button>
      </div>
      <p className="send-hint">
        <span className="kbd">⌘</span>
        <span className="kbd">↵</span>
        <span>to send</span>
      </p>
    </div>
  );
}
