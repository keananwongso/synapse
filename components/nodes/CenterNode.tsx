'use client';

import { Handle, Position } from 'reactflow';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

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
}

export function CenterNode({ data }: { data: CenterNodeData }) {
  const {
    label, isLoading, isExpanded, onExpand, onCollapse,
    floatingMessages, onSendMessage, isChatLoading,
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
      {/* Floating AI messages above — only when collapsed */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col items-center gap-1.5 w-[280px] pointer-events-none"
        style={{
          zIndex: 10,
          opacity: isExpanded ? 0 : 1,
          transition: 'opacity 0.25s ease',
        }}
      >
        {floatingMessages.slice(-2).map((msg, i) => (
          <p
            key={msg.id}
            className="text-[12px] leading-[1.5] text-[#777] text-center"
            style={{
              animation: `floatIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both`,
              textShadow: '0 1px 8px rgba(245,244,240,0.9), 0 0 4px rgba(245,244,240,1)',
            }}
          >
            {msg.text}
          </p>
        ))}
      </div>

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
          width: isExpanded ? 420 : 140,
          height: isExpanded ? 56 : 48,
          backgroundColor: isExpanded ? '#ffffff' : '#1a1a2e',
          border: isExpanded ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
          boxShadow: isExpanded
            ? '0 2px 6px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.07)'
            : '0 2px 8px rgba(26,26,46,0.2), 0 8px 24px rgba(26,26,46,0.15)',
          cursor: isExpanded ? 'text' : 'pointer',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
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
        {/* "Chat" label — fades out when expanded */}
        <span
          className="absolute inset-0 flex items-center justify-center text-[13px] font-medium text-white/90 tracking-[-0.1px] pointer-events-none"
          style={{
            opacity: isExpanded ? 0 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          Chat
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
          <div className="flex items-center gap-1 pr-2">
            {isChatLoading && (
              <span className="text-[12px] text-[#aaa] animate-pulse mr-1">thinking...</span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              disabled={!input.trim() || isChatLoading}
              className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center transition-opacity disabled:opacity-20 hover:opacity-75"
              tabIndex={isExpanded ? 0 : -1}
            >
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
              tabIndex={isExpanded ? 0 : -1}
            >
              <ChevronDown className="w-4 h-4 text-[#888780]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
