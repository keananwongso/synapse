'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowUp, Plus, FileText, Settings, LogOut } from 'lucide-react';
import dynamic from 'next/dynamic';

const SynapseCanvas = dynamic(() => import('@/components/SynapseCanvas'), { ssr: false });

type Phase = 'homepage' | 'collapsing' | 'canvas';

interface Branch {
  id: string;
  label: string;
  description: string;
  color: string;
  agentPersonality: string;
}

const SUGGESTIONS = [
  { emoji: '🎉', text: 'Birthday party', bg: '#dce8d8', border: '#c5d9bf', hoverBorder: '#8aba7a' },
  { emoji: '🚀', text: 'Startup launch', bg: '#e2dced', border: '#d1c9e0', hoverBorder: '#a893c9' },
  { emoji: '📝', text: 'Thesis writing', bg: '#f0e0d0', border: '#e6d2be', hoverBorder: '#d4a87a' },
  { emoji: '🎵', text: 'Music festival', bg: '#d5e5e8', border: '#c0d8dc', hoverBorder: '#7fbbc4' },
];

const DUMMY_SESSIONS = [
  { id: '1', title: 'Coffee shop branding' },
  { id: '2', title: 'Hackathon project ideas' },
  { id: '3', title: 'Marketing strategy Q2' },
];

export default function SynapsePage() {
  const [phase, setPhase] = useState<Phase>('homepage');
  const [idea, setIdea] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'homepage') {
      const timer = setTimeout(() => inputRef.current?.focus(), 500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleSubmit = useCallback(async () => {
    const trimmed = idea.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setPhase('collapsing');

    await new Promise((r) => setTimeout(r, 500));
    setPhase('canvas');

    try {
      const res = await fetch('/api/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: trimmed }),
      });
      if (!res.ok) throw new Error('Branch failed');
      const data = await res.json();
      setBranches(data.branches);
    } catch (err) {
      console.error('Branch error:', err);
      setBranches([
        { id: '1', label: 'Planning', description: 'Overall planning', color: '#d4edda', agentPersonality: 'Think systematically about planning.' },
        { id: '2', label: 'Research', description: 'Research needed', color: '#cce5ff', agentPersonality: 'Think analytically about research.' },
        { id: '3', label: 'Budget', description: 'Budget considerations', color: '#fff3cd', agentPersonality: 'Think practically about costs.' },
        { id: '4', label: 'Timeline', description: 'Timeline and deadlines', color: '#f8d7da', agentPersonality: 'Think about scheduling.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [idea, isLoading]);

  const handleChipClick = (text: string) => {
    setIdea(text);
    inputRef.current?.focus();
  };

  // ─── SIDEBAR ───
  const sidebar = (
    <div className="fixed top-0 left-0 w-16 h-screen bg-[#1a1a2e] flex flex-col items-center py-4 z-50">
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-1">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <circle cx="4" cy="7" r="2" fill="white" />
          <circle cx="10" cy="7" r="2" fill="white" />
          <line x1="6" y1="7" x2="8" y2="7" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="w-8 h-px bg-white/10 my-3" />
      <button className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all mb-3">
        <Plus size={18} />
      </button>
      <div className="flex flex-col gap-1 w-full px-2">
        {DUMMY_SESSIONS.map((s) => (
          <button
            key={s.id}
            className="flex items-center gap-1.5 px-1.5 py-2 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all w-full"
            title={s.title}
          >
            <FileText size={14} className="shrink-0" />
            <span className="text-[10px] truncate">{s.title}</span>
          </button>
        ))}
      </div>
      <div className="flex-grow" />
      <button className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all mb-1">
        <Settings size={18} />
      </button>
      <button className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all">
        <LogOut size={18} />
      </button>
    </div>
  );

  // ─── HOMEPAGE ───
  if (phase === 'homepage' || phase === 'collapsing') {
    return (
      <div className="h-screen w-screen flex">
        {sidebar}
        <div className="flex-1 ml-16 dot-grid flex flex-col items-center justify-center relative overflow-hidden">
          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none entrance-glow"
            style={{
              background: 'radial-gradient(ellipse 800px 500px at 50% 65%, rgba(200,230,192,0.4) 0%, transparent 65%)',
            }}
          />

          {/* Content container */}
          <div
            className="flex flex-col items-center relative z-[1]"
            style={{
              opacity: phase === 'collapsing' ? 0 : undefined,
              transform: phase === 'collapsing' ? 'translateY(-20px)' : undefined,
              transition: phase === 'collapsing' ? 'all 0.5s ease' : undefined,
            }}
          >
            {/* Badge */}
            <div className="entrance-badge">
              <div className="mb-5 px-3.5 py-1.5 rounded-full bg-[#f0eeea] text-[11px] text-[#888780] font-medium tracking-wide">
                ✦ AI-powered brainstorming
              </div>
            </div>

            {/* h1 */}
            <div className="entrance-h1">
              <h1 className="text-[36px] font-medium text-[#1a1a2e] text-center leading-[1.2]" style={{ letterSpacing: '-0.5px' }}>
                Your thoughts,<br />beautifully untangled
              </h1>
            </div>

            {/* Subtitle */}
            <div className="entrance-subtitle">
              <p className="text-[15px] text-[#888780] mt-4 text-center">
                Type an idea. Watch it grow into something actionable.
              </p>
            </div>

            {/* Chatbox */}
            <div
              className="mt-12 w-full flex justify-center entrance-chatbox"
              style={phase === 'collapsing' ? { transform: 'scale(0.1)', opacity: 0, transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' } : undefined}
            >
              <div
                className="relative rounded-[18px] shadow-[0_2px_12px_rgba(0,0,0,0.05)] focus-within:shadow-[0_0_0_3px_rgba(176,206,184,0.18)] transition-shadow duration-200"
                style={{
                  width: '640px',
                  maxWidth: 'calc(100vw - 8rem)',
                  backgroundColor: '#fdfcfa',
                  border: '1px solid #e0ddd8',
                  borderLeft: '3px solid #4a9e6b',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
                  }}
                  placeholder="What are you working on?"
                  className="w-full bg-transparent pl-5 pr-16 text-[16px] text-[#1a1a2e] placeholder:text-[#B4B2A9] outline-none rounded-[18px]"
                  style={{ height: '56px', lineHeight: '56px' }}
                  disabled={phase === 'collapsing'}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!idea.trim() || phase === 'collapsing'}
                  className="absolute right-0 top-0 w-14 h-14 rounded-r-[18px] bg-[#1a1a2e] flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-80"
                >
                  <ArrowUp className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {SUGGESTIONS.map((s, i) => (
                <div key={s.text} className={`entrance-chip-${i}`}>
                  <button
                    onClick={() => handleChipClick(s.text)}
                    className="flex items-center gap-2 rounded-full text-[12px] text-[#555] hover:text-[#1a1a2e] transition-all"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: s.bg,
                      border: `1px solid ${s.border}`,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = s.hoverBorder; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = s.border; }}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.text}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="entrance-footer">
              <p className="mt-8 text-[12px] text-[#b4b2a9]">
                Press Enter to branch your idea into focused AI agents
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CANVAS ───
  return (
    <div className="h-screen w-screen flex">
      {sidebar}
      <div className="flex-1 ml-16 h-screen">
        <SynapseCanvas idea={idea} branches={branches} isLoading={isLoading} />
      </div>
    </div>
  );
}
