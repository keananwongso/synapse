'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { NODE_COLORS } from '@/lib/constants';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface NodeChatProps {
  nodeId: string;
  label: string;
  nodeType: string;
  visible: boolean; // controls fade-in after expansion
  onClose: () => void;
}

export function NodeChat({ nodeId, label, nodeType, visible, onClose }: NodeChatProps) {
  const colors = NODE_COLORS[nodeType] || NODE_COLORS.thought;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', text: `Let's explore "${label}" together. What would you like to dive into?` },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [visible]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: `${label}: ${trimmed}`, count: 1 }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiText = data.ideas?.[0]?.text || data.taskId
          ? `I'm working on that. Results will appear on the canvas soon.`
          : 'Let me think about that...';
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: aiText }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: 'Something went wrong. Try again?' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: 'Connection error. Try again?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease-in-out',
        transitionDelay: visible ? '0.3s' : '0s',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: colors.accent + '40' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.dot }} />
          <span className="text-xs font-semibold text-[#1A1A1A]/80">{label}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-1 rounded-md hover:bg-black/5 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-[#1A1A1A]/40" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] px-2.5 py-1.5 rounded-lg text-[12px] leading-[1.5]"
              style={
                msg.role === 'ai'
                  ? {
                      backgroundColor: 'rgba(255,255,255,0.85)',
                      borderLeft: `3px solid ${colors.accent}`,
                      color: '#1A1A1A',
                    }
                  : {
                      backgroundColor: colors.bgDarker,
                      color: '#1A1A1A',
                      textAlign: 'right' as const,
                    }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="px-2.5 py-1.5 rounded-lg text-[12px]"
              style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderLeft: `3px solid ${colors.accent}` }}
            >
              <span className="animate-pulse text-[#1A1A1A]/50">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t" style={{ borderColor: colors.accent + '30' }}>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
              if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
            }}
            placeholder="Ask something..."
            className="flex-1 px-3 py-1.5 rounded-full bg-white/60 text-[12px] text-[#1A1A1A] placeholder:text-[#1A1A1A]/25 outline-none border border-transparent focus:border-[#CFCBC3]"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ backgroundColor: colors.accent }}
          >
            <Send className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
