'use client';

import { Handle, Position } from 'reactflow';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Plus } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface CenterNodeData {
  label: string;
  isLoading: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  floatingMessages: ChatMessage[];
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isChatLoading: boolean;
  responseCard: string | null;
  onDismissResponse: () => void;
  onAddNode: () => void;
}

function formatBold(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function ChatHistoryCard({ chatMessages, isChatLoading }: { chatMessages: ChatMessage[]; isChatLoading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Filter to only non-initial messages (exclude the very first seeding message)
  const visible = chatMessages.filter(m => m.id !== '1');

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        bottom: 'calc(100% + 16px)',
        // Perfect center: card is 480px, container is 140px.
        // Left edge = (140 - 480) / 2 = -170px from container left edge.
        left: -170,
        zIndex: 60,
        width: 480,
        animation: 'responseCardIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 6px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Scrollable message list */}
        <div
          ref={scrollRef}
          onWheel={(e) => e.stopPropagation()}
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            padding: '20px 24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {visible.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'ai' ? (
                <p
                  className="text-[14px] leading-[1.65] text-[#1a1a2e] whitespace-pre-wrap"
                  style={{ maxWidth: '90%' }}
                  dangerouslySetInnerHTML={{ __html: formatBold(msg.text) }}
                />
              ) : (
                <span
                  className="text-[13px] leading-[1.5] text-white"
                  style={{
                    background: '#1a1a2e',
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
          {isChatLoading && (
            <div style={{ display: 'flex', gap: 4, paddingLeft: 2 }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="rounded-full bg-[#c0bfbb]"
                  style={{
                    width: 6, height: 6,
                    animation: `gentlePulse 1.2s ease-in-out ${i * 200}ms infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CenterNode({ data }: { data: CenterNodeData }) {
  const {
    label, isLoading, isExpanded, onExpand, onCollapse,
    floatingMessages, onSendMessage, isChatLoading,
    responseCard, onDismissResponse, onAddNode,
  } = data;

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isChatLoading) return;
    onSendMessage(trimmed);
    setInput('');
  }, [input, isChatLoading, onSendMessage]);

  const handleClose = useCallback(() => {
    onCollapse();
  }, [onCollapse]);

  // Single render — animate between states
  return (
    <div className="relative" style={{ width: 140, height: 48, overflow: 'visible' }}>
      {/* Chat history card — above the pill, shown when responseCard is active */}
      {responseCard && (
        <ChatHistoryCard
          chatMessages={data.chatMessages}
          isChatLoading={isChatLoading}
        />
      )}

      {/* Floating AI messages above — only when no response card and not expanded */}
      {!responseCard && !isExpanded && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-[320px] pointer-events-none"
          style={{
            bottom: 'calc(100% + 24px)',
            zIndex: 50,
          }}
        >
          {floatingMessages.slice(-2).map((msg, i) => (
            <p
              key={msg.id}
              className="text-[15px] leading-[1.5] text-[#1a1a2e] text-center font-semibold"
              style={{
                animation: `floatIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both`,
                backgroundColor: 'rgba(245,244,240,0.9)',
                padding: '4px 12px',
                borderRadius: 8,
              }}
            >
              {msg.text}
            </p>
          ))}
        </div>
      )}

      {/* Handles — always in same position */}
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />

      {/* The morphing pill/input — centered on the 140×48 box */}
      <div
        className="absolute rounded-full flex items-center"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isExpanded ? 460 : 140,
          height: isExpanded ? 60 : 48,
          backgroundColor: isExpanded ? '#ffffff' : '#1a1a2e',
          border: isExpanded ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
          boxShadow: isExpanded
            ? '0 2px 6px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.07)'
            : '0 2px 8px rgba(26,26,46,0.2), 0 8px 24px rgba(26,26,46,0.15)',
          cursor: isExpanded ? 'text' : 'pointer',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: isExpanded ? 'none' : 'pillBreathe 3s ease-in-out infinite',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isExpanded) onExpand();
        }}
        onMouseEnter={e => {
          if (!isExpanded) {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(26,26,46,0.3), 0 12px 32px rgba(26,26,46,0.2)';
            (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1.03)';
          }
        }}
        onMouseLeave={e => {
          if (!isExpanded) {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(26,26,46,0.2), 0 8px 24px rgba(26,26,46,0.15)';
            (e.currentTarget as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1)';
          }
        }}
      >
        {/* Three subtle dots — indicates interaction */}
        <span
          className="absolute inset-0 flex items-center justify-center gap-[6px] pointer-events-none"
          style={{
            opacity: isExpanded ? 0 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          <span className="w-[5px] h-[5px] rounded-full bg-white/40" />
          <span className="w-[5px] h-[5px] rounded-full bg-white/40" />
          <span className="w-[5px] h-[5px] rounded-full bg-white/40" />
        </span>

        {/* Input content — fades in when expanded */}
        <div
          className="flex items-center w-full h-full"
          style={{
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 0.2s ease 0.15s',
            pointerEvents: isExpanded ? 'auto' : 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
              if (e.key === 'Escape') handleClose();
            }}
            placeholder="Ask the orchestrator..."
            className="flex-1 bg-transparent text-[14px] text-[#1a1a2e] placeholder:text-[#c0bfbb] outline-none"
            style={{ paddingLeft: 24, paddingRight: 8 }}
            disabled={isChatLoading}
            tabIndex={isExpanded ? 0 : -1}
          />
          <div className="flex items-center gap-1" style={{ paddingRight: 10 }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              disabled={!input.trim() || isChatLoading}
              className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center transition-opacity disabled:opacity-20 hover:opacity-75"
              tabIndex={isExpanded ? 0 : -1}
            >
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Add node button — below the capsule */}
      {!isExpanded && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddNode(); }}
          className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          style={{
            top: 'calc(50% + 34px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            cursor: 'pointer',
          }}
        >
          <Plus className="w-3 h-3 text-[#888]" />
        </button>
      )}
    </div>
  );
}
