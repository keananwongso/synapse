'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
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
  { text: 'Birthday party', bg: '#f3f0eb' },
  { text: 'Startup launch', bg: '#eeecf3' },
  { text: 'Thesis writing', bg: '#f3efe9' },
  { text: 'Music festival', bg: '#ebf0f2' },
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

  // ─── HOMEPAGE ───
  if (phase === 'homepage' || phase === 'collapsing') {
    return (
      <div className="h-screen w-screen dot-grid flex flex-col items-center relative overflow-hidden" style={{ paddingTop: '18vh' }}>
        {/* Content */}
        <div
          className="flex flex-col items-center relative z-[1] px-6 w-full"
          style={{
            opacity: phase === 'collapsing' ? 0 : undefined,
            transform: phase === 'collapsing' ? 'translateY(-30px) scale(0.98)' : undefined,
            transition: phase === 'collapsing' ? 'all 0.5s cubic-bezier(0.4,0,0.2,1)' : undefined,
          }}
        >
          {/* Heading */}
          <div className="entrance-h1">
            <h1 className="text-[64px] font-semibold text-[#1a1a2e] text-center leading-[1.1] tracking-[-0.035em]">
              Your thoughts,<br />beautifully untangled
            </h1>
          </div>

          {/* Subtitle */}
          <div className="entrance-subtitle" style={{ marginTop: 24 }}>
            <p className="text-[17px] text-[#aaa] text-center">
              Type an idea. AI agents will break it down and brainstorm with you.
            </p>
          </div>

          {/* Input */}
          <div
            className="entrance-chatbox w-full max-w-[560px]"
            style={{
              marginTop: 48,
              ...(phase === 'collapsing' ? { transform: 'scale(0.9)', opacity: 0, transition: 'all 0.3s ease' } : {}),
            }}
          >
            <div
              className="relative rounded-full"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.07)',
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
                className="w-full bg-transparent text-[16px] text-[#1a1a2e] placeholder:text-[#c0bfbb] outline-none rounded-full"
                style={{ height: '60px', paddingLeft: '32px', paddingRight: '64px' }}
                disabled={phase === 'collapsing'}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!idea.trim() || phase === 'collapsing'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#1a1a2e] flex items-center justify-center transition-all disabled:opacity-20 hover:opacity-75"
              >
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap justify-center gap-2" style={{ marginTop: 20 }}>
            {SUGGESTIONS.map((s, i) => (
              <div key={s.text} className={`entrance-chip-${i}`}>
                <button
                  type="button"
                  onClick={() => handleChipClick(s.text)}
                  className="rounded-full text-[13px] text-[#888] hover:text-[#444] transition-colors"
                  style={{ padding: '8px 18px', backgroundColor: s.bg }}
                >
                  {s.text}
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="entrance-footer" style={{ marginTop: 40 }}>
            <p className="text-[12px] text-[#ccc] tracking-wide">
              Press Enter to start
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── CANVAS ───
  return (
    <div className="h-screen w-screen">
      <SynapseCanvas idea={idea} branches={branches} isLoading={isLoading} />
    </div>
  );
}
