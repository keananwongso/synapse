'use client';

import { X, FileText, ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Deliverable {
  title: string;
  summary: string;
  content: string;
  type: string;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface AgentDetailPanelProps {
  label: string;
  color: string;
  status: 'idle' | 'thinking' | 'done';
  currentThinking: string;
  deliverables: Deliverable[];
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isChatLoading?: boolean;
}

function darkenColor(hex: string, factor: number = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
}

function formatBold(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export function AgentDetailPanel({
  label, color, status, currentThinking, deliverables, onClose,
  messages, onSendMessage, isChatLoading = false,
}: AgentDetailPanelProps) {
  const accentColor = darkenColor(color);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when panel opens
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isChatLoading) return;
    onSendMessage(trimmed);
    setInputValue('');
  };

  return (
    <div
      className="fixed right-0 top-0 h-screen z-50 flex"
      style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
    >
      {/* Backdrop */}
      <div
        className="flex-1 cursor-pointer"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
      />

      {/* Panel */}
      <div
        className="h-full flex flex-col"
        style={{
          width: 380,
          backgroundColor: '#faf9f7',
          borderLeft: '1px solid #e8e6e0',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#faf9f7] border-b border-[#e8e6e0] px-5 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color, color: accentColor }}
            >
              Agent
            </span>
            <span className="text-[15px] font-semibold text-[#1a1a2e]">{label}</span>
            {status === 'thinking' && (
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
            )}
            {status === 'done' && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4a9e6b' }} />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4 text-[#888780]" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Status */}
          {status === 'thinking' && (
            <div className="px-5 py-3 border-b border-[#e8e6e0]">
              <p className="text-[12px] text-[#888780] animate-pulse">{currentThinking}</p>
            </div>
          )}

          {/* Deliverables */}
          <div className="px-5 py-4 space-y-4">
            {deliverables.length === 0 && status !== 'thinking' && (
              <p className="text-[13px] text-[#aaa] text-center py-4">No deliverables yet.</p>
            )}

            {deliverables.map((deliv, i) => (
              <div
                key={i}
                className="rounded-xl border border-[#e8e6e0] bg-white overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="px-4 py-3 border-b border-[#e8e6e0] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span className="text-[13px] font-semibold text-[#1a1a2e]">{deliv.title}</span>
                </div>
                <div className="px-4 py-2 border-b border-[#f0eeea]">
                  <p className="text-[11px] text-[#888780]">{deliv.summary}</p>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[12px] leading-[1.7] text-[#2a2a3e] whitespace-pre-wrap">
                    {deliv.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Divider before chat */}
          <div className="mx-5 border-t border-[#e8e6e0]" />

          {/* Chat message history */}
          <div className="px-5 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' ? (
                  <p
                    className="text-[13px] leading-[1.65] text-[#1a1a2e]"
                    style={{ maxWidth: '85%' }}
                    dangerouslySetInnerHTML={{ __html: formatBold(msg.text) }}
                  />
                ) : (
                  <span
                    className="text-[13px] text-white leading-[1.5]"
                    style={{
                      backgroundColor: '#1a1a2e',
                      borderRadius: 20,
                      padding: '6px 14px',
                      maxWidth: '75%',
                      display: 'inline-block',
                    }}
                  >
                    {msg.text}
                  </span>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1" style={{ padding: '6px 0' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#c0bfbb]"
                      style={{ animation: `gentlePulse 1.2s ease-in-out ${i * 200}ms infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat input — pinned to bottom */}
        <div
          className="flex-shrink-0"
          style={{
            borderTop: '1px solid #e8e6e0',
            padding: '12px 16px',
            background: '#faf9f7',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 9999,
              padding: '6px 6px 6px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                if (e.key === 'Escape') inputRef.current?.blur();
              }}
              placeholder={`Ask ${label} agent...`}
              disabled={isChatLoading}
              className="flex-1 bg-transparent text-[13px] text-[#1a1a2e] placeholder:text-[#c0bfbb] outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isChatLoading}
              className="w-8 h-8 rounded-full bg-[#1a1a2e] flex items-center justify-center transition-opacity disabled:opacity-20 hover:opacity-75 flex-shrink-0"
            >
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
