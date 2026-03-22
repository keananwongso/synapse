'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect, useRef } from 'react';
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
}

// Darken a hex color by a factor
function darkenColor(hex: string, factor: number = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
}

export function BranchNode({ data }: { data: BranchNodeData }) {
  const { label, description, color, agentPersonality, rootIdea, isExpanded, isDimmed, onExpand, onCollapse, spawnDelay } = data;

  const [spawned, setSpawned] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Spawn animation delay
  useEffect(() => {
    const timer = setTimeout(() => setSpawned(true), spawnDelay);
    return () => clearTimeout(timer);
  }, [spawnDelay]);

  // Show chat content after expand animation
  useEffect(() => {
    if (isExpanded) {
      // Auto-generate first AI message
      if (messages.length === 0) {
        setMessages([{
          id: '1',
          role: 'ai',
          text: `Let's explore "${label}" for your "${rootIdea}" project. ${description} — what aspect would you like to start with?`,
        }]);
      }
      const timer = setTimeout(() => {
        setChatVisible(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 450);
      return () => clearTimeout(timer);
    } else {
      setChatVisible(false);
    }
  }, [isExpanded, label, rootIdea, description, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
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
  };

  const handleClose = () => {
    setChatVisible(false);
    setTimeout(() => onCollapse(), 200);
  };

  if (!spawned) return null;

  // Dimensions
  const width = isExpanded ? 380 : 'auto';
  const height = isExpanded ? 320 : 48;
  const borderRadius = isExpanded ? 20 : 9999;

  const accentColor = darkenColor(color, 0.25);

  return (
    <div
      className="node-spawn"
      style={{
        width,
        height,
        minWidth: isExpanded ? 380 : 130,
        borderRadius,
        backgroundColor: color,
        boxShadow: isExpanded
          ? '0 12px 48px rgba(0,0,0,0.15)'
          : '0 2px 10px rgba(0,0,0,0.07)',
        transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1), border-radius 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, opacity 0.3s ease',
        opacity: isDimmed ? 0.35 : 1,
        pointerEvents: isDimmed ? 'none' : 'auto',
        overflow: 'hidden',
        cursor: isExpanded ? 'default' : 'pointer',
        zIndex: isExpanded ? 50 : 1,
        position: 'relative',
      }}
      onClick={() => {
        if (!isExpanded && !isDimmed) onExpand();
      }}
    >
      {/* Handles for edges */}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />

      {isExpanded ? (
        /* ── EXPANDED: Chat UI ── */
        <div
          className="flex flex-col h-full w-full"
          style={{
            opacity: chatVisible ? 1 : 0,
            transition: 'opacity 0.25s ease-in-out',
            transitionDelay: chatVisible ? '0.05s' : '0s',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: accentColor + '30' }}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
              <span className="text-[13px] font-medium text-[#1a1a2e]">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-[#888780] hover:bg-black/5 transition-colors"
                onClick={(e) => { e.stopPropagation(); /* TODO: branch deeper */ }}
              >
                <GitBranch className="w-3 h-3" />
                Branch deeper →
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
                  <span className="animate-pulse text-[#888780]">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-2.5 py-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
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
                className="flex-1 px-3 py-1.5 rounded-full bg-white/60 text-[12px] text-[#1a1a2e] placeholder:text-[#b4b2a9] outline-none border border-transparent focus:border-[#d4d0c8]"
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
      ) : (
        /* ── COLLAPSED: Pill label ── */
        <div className="flex items-center justify-center h-full px-5">
          <span className="text-[13px] font-medium text-[#1a1a2e] whitespace-nowrap">{label}</span>
        </div>
      )}
    </div>
  );
}
