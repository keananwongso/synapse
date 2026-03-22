'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, GitBranch } from 'lucide-react';

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
  isExpanded: boolean;
  isDimmed: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  spawnDelay: number;
  // Agent thinking state
  agentThinking?: string;
  agentStatus?: 'idle' | 'thinking' | 'done';
}

function darkenColor(hex: string, factor: number = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
}

export function BranchNode({ data }: { data: BranchNodeData }) {
  const {
    label, description, color, agentPersonality, rootIdea,
    isExpanded, isDimmed, onExpand, onCollapse, spawnDelay,
    agentThinking, agentStatus = 'idle',
  } = data;

  const [spawned, setSpawned] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentColor = darkenColor(color, 0.35);

  // Spawn animation delay
  useEffect(() => {
    const timer = setTimeout(() => setSpawned(true), spawnDelay);
    return () => clearTimeout(timer);
  }, [spawnDelay]);

  // Show chat after expand
  useEffect(() => {
    if (isExpanded) {
      if (messages.length === 0) {
        setMessages([{
          id: '1',
          role: 'ai',
          text: `Let's explore "${label}" for your "${rootIdea}" project. What aspect would you like to start with?`,
        }]);
      }
      const timer = setTimeout(() => {
        setChatVisible(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setChatVisible(false);
    }
  }, [isExpanded, label, rootIdea, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: trimmed };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          agentPersonality,
          nodeLabel: label,
          rootIdea,
        }),
      });
      if (res.ok) {
        const { reply } = await res.json();
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: reply }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, agentPersonality, label, rootIdea]);

  const handleClose = useCallback(() => {
    setChatVisible(false);
    setTimeout(() => onCollapse(), 200);
  }, [onCollapse]);

  if (!spawned) return null;

  // Handles (shared)
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

  // ─── COLLAPSED ───
  if (!isExpanded) {
    return (
      <div className="relative" style={{ minWidth: 130 }}>
        {/* Agent thinking text above */}
        {agentStatus === 'thinking' && agentThinking && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl text-[11px] text-[#1a1a2e]/60 whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(6px)',
              border: `1px solid ${accentColor}30`,
              animation: 'floatIn 0.3s ease forwards',
            }}
          >
            <span className="animate-pulse">{agentThinking}</span>
          </div>
        )}

        <div
          className="node-spawn flex flex-col cursor-pointer relative"
          style={{
            minWidth: 140,
            padding: '10px 14px',
            background: 'linear-gradient(160deg, #ffffff 0%, #faf9f7 100%)',
            border: `1.5px dashed ${color}`,
            borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
            opacity: isDimmed ? 0.25 : 1,
            pointerEvents: isDimmed ? 'none' : 'auto',
            transition: 'opacity 0.3s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          }}
          onMouseEnter={e => { if (!isDimmed) { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = accentColor; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = color; }}
          onClick={() => { if (!isDimmed) onExpand(); }}
        >
          {/* AGENT badge */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color, color: accentColor }}
            >
              Agent
            </span>
            {agentStatus === 'thinking' && (
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
            )}
          </div>
          <span className="text-[13px] font-semibold text-[#1a1a2e] whitespace-nowrap tracking-[-0.1px]">{label}</span>
        </div>
        {handles}
      </div>
    );
  }

  // ─── EXPANDED: Chat ───
  return (
    <div
      style={{
        width: 380,
        height: 340,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        border: `1.5px dashed ${color}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {handles}

      <div
        className="flex flex-col h-full w-full"
        style={{
          opacity: chatVisible ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
          transitionDelay: chatVisible ? '0.05s' : '0s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color, color: accentColor }}
            >
              Agent
            </span>
            <span className="text-[13px] font-semibold text-[#1a1a2e] tracking-[-0.1px]">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-[#888780] hover:bg-black/5 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <GitBranch className="w-3 h-3" />
              Branch
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              className="p-1 rounded-md hover:bg-black/5 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#888780]" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] px-2.5 py-1.5 text-[12px] leading-[1.55] text-[#1a1a2e]"
                style={
                  msg.role === 'ai'
                    ? { backgroundColor: 'rgba(255,255,255,0.85)', borderLeft: `3px solid ${accentColor}`, borderRadius: '0 8px 8px 0' }
                    : { backgroundColor: darkenColor(color, 0.08), borderRadius: '8px 8px 0 8px' }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-2.5 py-1.5 text-[12px] rounded-r-lg" style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderLeft: `3px solid ${accentColor}` }}>
                <span className="animate-pulse text-[#888780]">thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-2.5 py-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-1.5">
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
              placeholder="Ask something..."
              className="flex-1 px-3 py-1.5 rounded-full bg-white/60 text-[12px] text-[#1a1a2e] placeholder:text-[#b4b2a9] outline-none border border-transparent focus:border-[#d4d0c8] transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              disabled={!input.trim() || isLoading}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
