'use client';

import { Handle, Position } from 'reactflow';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronDown } from 'lucide-react';

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
  // Floating messages above the collapsed node
  floatingMessages: ChatMessage[];
  // Chat messages (when expanded)
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isChatLoading: boolean;
}

export function CenterNode({ data }: { data: CenterNodeData }) {
  const {
    label, isLoading, isExpanded, onExpand, onCollapse,
    floatingMessages, chatMessages, onSendMessage, isChatLoading,
  } = data;

  const [chatVisible, setChatVisible] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fade in chat after expand animation
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setChatVisible(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setChatVisible(false);
    }
  }, [isExpanded]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isChatLoading) return;
    onSendMessage(trimmed);
    setInput('');
  }, [input, isChatLoading, onSendMessage]);

  const handleClose = useCallback(() => {
    setChatVisible(false);
    setTimeout(() => onCollapse(), 200);
  }, [onCollapse]);

  // ─── COLLAPSED: pill + floating messages ───
  if (!isExpanded) {
    return (
      <div className="relative" style={{ width: 140, height: 48 }}>
        {/* Floating AI messages above — plain text, above edges */}
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col items-center gap-1.5 w-[280px] pointer-events-none"
          style={{ zIndex: 10 }}
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

        {/* The pill */}
        <div
          className={`relative flex items-center justify-center rounded-full cursor-pointer ${isLoading ? 'pulse-loading' : ''}`}
          style={{
            width: 140,
            height: 48,
            backgroundColor: '#1a1a2e',
            boxShadow: '0 2px 8px rgba(26,26,46,0.2), 0 8px 24px rgba(26,26,46,0.15)',
            transition: 'box-shadow 0.2s ease, transform 0.15s ease',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 4px 12px rgba(26,26,46,0.3), 0 12px 32px rgba(26,26,46,0.2)'; el.style.transform = 'scale(1.03)'; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 2px 8px rgba(26,26,46,0.2), 0 8px 24px rgba(26,26,46,0.15)'; el.style.transform = 'scale(1)'; }}
          onClick={() => onExpand()}
        >
          <span className="text-[13px] font-medium text-white/90 tracking-[-0.1px]">Chat</span>
          <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />
          <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />
          <Handle type="source" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />
          <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" style={{ top: '50%' }} />
        </div>
      </div>
    );
  }

  // ─── EXPANDED: chat UI ───
  return (
    <div
      className="node-spawn"
      style={{
        width: 400,
        height: 360,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />

      <div
        className="flex flex-col h-full w-full"
        style={{
          opacity: chatVisible ? 1 : 0,
          transition: 'opacity 0.25s ease-in-out',
          transitionDelay: chatVisible ? '0.05s' : '0s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e8e6e0]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a9e6b]" />
            <span className="text-[13px] font-medium text-[#1a1a2e]">{label}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            className="p-1 rounded-md hover:bg-black/5 transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-[#888780]" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] px-3 py-2 text-[13px] leading-[1.55] text-[#1a1a2e]"
                style={
                  msg.role === 'ai'
                    ? { backgroundColor: 'rgba(255,255,255,0.9)', borderLeft: '3px solid #4a9e6b', borderRadius: '0 10px 10px 0' }
                    : { backgroundColor: '#E7E3DC', borderRadius: '10px 10px 0 10px' }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="px-3 py-2 text-[13px] rounded-r-lg" style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderLeft: '3px solid #4a9e6b' }}>
                <span className="text-[#888780]">
                  <span className="inline-block animate-pulse">thinking</span>
                  <span className="inline-block animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="inline-block animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                  <span className="inline-block animate-pulse" style={{ animationDelay: '0.6s' }}>.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-[#e8e6e0]">
          <div className="flex items-center gap-2">
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
              placeholder="Reply..."
              className="flex-1 px-3.5 py-2 rounded-full bg-[#f0eeea] text-[13px] text-[#1a1a2e] placeholder:text-[#b4b2a9] outline-none border border-transparent focus:border-[#d4d0c8] transition-colors"
              disabled={isChatLoading}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              disabled={!input.trim() || isChatLoading}
              className="w-8 h-8 rounded-full bg-[#1a1a2e] flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-80"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
