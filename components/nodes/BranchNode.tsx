'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect, useRef } from 'react';
import { Plus, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface BranchNodeData {
  label: string;
  description: string;
  color: string;
  agentPersonality: string;
  rootIdea: string;
  isDimmed: boolean;
  onClickAgent: () => void;
  onAddNode: () => void;
  spawnDelay: number;
  agentThinking?: string;
  agentStatus: 'idle' | 'thinking' | 'done';
  // Expanded chat state
  isExpanded: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isChatLoading: boolean;
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

export function BranchNode({ data }: { data: BranchNodeData }) {
  const {
    label, color, isDimmed, onClickAgent, onAddNode, spawnDelay,
    agentThinking, agentStatus = 'idle',
    isExpanded, messages, onSendMessage, isChatLoading,
  } = data;

  const [spawned, setSpawned] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const accentColor = darkenColor(color, 0.35);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSpawned(true), spawnDelay);
    return () => clearTimeout(timer);
  }, [spawnDelay]);

  // Auto-focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isExpanded]);

  // Scroll to latest message — use scrollTop instead of scrollIntoView
  // to prevent React Flow canvas from panning
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isChatLoading]);

  if (!spawned) return null;

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isChatLoading) return;
    onSendMessage(trimmed);
    setInputValue('');
  };

  const handles = (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
    </>
  );

  return (
    <div className="relative" style={{ width: isExpanded ? 280 : undefined, minWidth: 150 }}>
      <div
        className="node-spawn flex flex-col cursor-pointer relative"
        style={{
          minWidth: isExpanded ? 280 : 160,
          padding: isExpanded ? '12px 14px 10px' : '10px 14px',
          background: isExpanded
            ? `linear-gradient(160deg, #ffffff 0%, ${color}08 100%)`
            : 'linear-gradient(160deg, #ffffff 0%, #faf9f7 100%)',
          border: isExpanded ? `1.5px solid ${color}` : `1.5px dashed ${color}`,
          borderRadius: 14,
          boxShadow: isExpanded
            ? `0 4px 20px ${color}20, 0 8px 32px rgba(0,0,0,0.08)`
            : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
          opacity: isDimmed ? 0.25 : 1,
          pointerEvents: isDimmed ? 'none' : 'auto',
          transition: 'opacity 0.3s ease, box-shadow 0.25s ease, border-color 0.2s ease, min-width 0.25s ease',
        }}
        onMouseEnter={e => {
          if (!isDimmed && !isExpanded) {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLElement).style.borderColor = accentColor;
          }
        }}
        onMouseLeave={e => {
          if (!isExpanded) {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)';
            (e.currentTarget as HTMLElement).style.borderColor = color;
          }
        }}
        onClick={(e) => { e.stopPropagation(); if (!isDimmed) onClickAgent(); }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color, color: accentColor }}
            >
              Agent
            </span>
            {agentStatus === 'thinking' && (
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
            )}
            {agentStatus === 'done' && (
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4a9e6b' }} />
            )}
          </div>
          {isExpanded && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onClickAgent(); }}
              style={{
                fontSize: 15, lineHeight: 1, color: '#aaa9a5',
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Label */}
        <span className="text-[13px] font-semibold text-[#1a1a2e] whitespace-nowrap tracking-[-0.1px]">{label}</span>

        {/* Skeleton shimmer bars while thinking (collapsed only) */}
        {agentStatus === 'thinking' && !isExpanded && (
          <div className="mt-2 flex flex-col gap-1.5" aria-hidden="true">
            <div className="skeleton-shimmer h-[7px] w-[85%]" />
            <div className="skeleton-shimmer h-[7px] w-[65%]" style={{ animationDelay: '0.15s' }} />
            <div className="skeleton-shimmer h-[7px] w-[75%]" style={{ animationDelay: '0.3s' }} />
          </div>
        )}

        {agentStatus === 'done' && !isExpanded && (
          <p className="text-[11px] text-[#4a9e6b] mt-1.5 leading-[1.4]">
            Done — click to chat
          </p>
        )}

        {/* Expanded chat area */}
        {isExpanded && (
          <div
            className="mt-3"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Message history */}
            <div
              ref={messagesContainerRef}
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 10,
              }}
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  {msg.role === 'ai' ? (
                    <p
                      style={{ fontSize: 12, lineHeight: 1.6, color: '#2a2a3e', maxWidth: '90%', margin: 0 }}
                      dangerouslySetInnerHTML={{ __html: formatBold(msg.text) }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        color: '#fff',
                        backgroundColor: '#1a1a2e',
                        borderRadius: 16,
                        padding: '5px 12px',
                        maxWidth: '80%',
                        display: 'inline-block',
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.text}
                    </span>
                  )}
                </div>
              ))}

              {/* Loading dots */}
              {isChatLoading && (
                <div style={{ display: 'flex', gap: 4, paddingTop: 2 }}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        backgroundColor: '#c0bfbb',
                        animation: `gentlePulse 1.2s ease-in-out ${i * 200}ms infinite`,
                      }}
                    />
                  ))}
                </div>
              )}

            </div>

            {/* Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fff',
                border: `1px solid ${color}40`,
                borderRadius: 9999,
                padding: '5px 5px 5px 12px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  e.stopPropagation();
                }}
                onClick={e => e.stopPropagation()}
                placeholder={`Ask ${label}...`}
                disabled={isChatLoading}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 12, color: '#1a1a2e',
                }}
              />
              <button
                type="button"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); handleSend(); }}
                disabled={!inputValue.trim() || isChatLoading}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  backgroundColor: '#1a1a2e',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: !inputValue.trim() || isChatLoading ? 0.2 : 1,
                  transition: 'opacity 0.15s',
                  flexShrink: 0,
                }}
              >
                <ArrowRight style={{ width: 12, height: 12, color: '#fff' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add node button */}
      {!isDimmed && !isExpanded && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddNode(); }}
          className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          style={{
            top: 'calc(100% + 6px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            cursor: 'pointer',
            zIndex: 5,
          }}
        >
          <Plus className="w-3 h-3 text-[#888]" />
        </button>
      )}

      {/* Floating thinking bubble */}
      {agentStatus === 'thinking' && agentThinking && !isExpanded && (
        <div
          className="absolute left-1/2 pointer-events-none"
          style={{
            bottom: 'calc(100% + 8px)',
            transform: 'translateX(-50%)',
            zIndex: 10,
            maxWidth: 220,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            key={agentThinking}
            className="text-[11px] text-[#666460] font-medium"
            style={{
              backgroundColor: 'rgba(245,244,240,0.92)',
              padding: '3px 10px',
              borderRadius: 20,
              display: 'inline-block',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(0,0,0,0.05)',
              animation: 'floatIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            {agentThinking}
          </span>
        </div>
      )}
      {handles}
    </div>
  );
}
