'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const SynapseCanvas = dynamic(() => import('@/components/SynapseCanvas'), { ssr: false });

type Phase = 'homepage' | 'transitioning' | 'canvas';

interface Branch {
  id: string;
  label: string;
  description: string;
  color: string;
  agentPersonality: string;
}

const SUGGESTIONS = [
  { text: 'Start a student club at UBC' },
  { text: 'Plan a hackathon' },
  { text: 'Ace final exam season' },
];

export default function SynapsePage() {
  const [phase, setPhase] = useState<Phase>('homepage');
  const [idea, setIdea] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [morphed, setMorphed] = useState(false); // triggers ghost pill CSS transition
  const inputRef = useRef<HTMLInputElement>(null);

  // Cursor orb — smooth RAF interpolation, no re-renders
  const orbRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: -999, y: -999 });
  const currentPos = useRef({ x: -999, y: -999 });
  const rafId = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (currentPos.current.x === -999) {
        currentPos.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('mousemove', onMove);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const animate = () => {
      currentPos.current.x = lerp(currentPos.current.x, targetPos.current.x, 0.08);
      currentPos.current.y = lerp(currentPos.current.y, targetPos.current.y, 0.08);
      if (orbRef.current) {
        orbRef.current.style.left = `${currentPos.current.x}px`;
        orbRef.current.style.top = `${currentPos.current.y}px`;
      }
      rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'homepage') {
      const timer = setTimeout(() => inputRef.current?.focus(), 500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Trigger ghost pill morph one frame after it mounts
  useEffect(() => {
    if (phase === 'transitioning') {
      // Double-rAF ensures the browser has painted the initial state first
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMorphed(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setMorphed(false);
    }
  }, [phase]);

  const handleSubmit = useCallback(async () => {
    const trimmed = idea.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    // Single transition: ghost pill morphs, text fades, canvas rises
    setPhase('transitioning');

    // Wait for morph animation to finish
    await new Promise((r) => setTimeout(r, 700));
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

  // ─── UNIFIED RENDER ───
  return (
    <div className={`h-screen w-screen overflow-hidden relative ${phase === 'homepage' ? 'dot-grid' : ''}`}>
      {/* Static corner orbs — anchored deep into corners, present in all phases */}
      <div style={{ position: 'fixed', top: -300, left: -300, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,142,196,0.75) 0%, rgba(155,142,196,0.35) 40%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: -300, right: -300, width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,169,154,0.7) 0%, rgba(123,169,154,0.3) 40%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -300, left: -300, width: 660, height: 660, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,149,106,0.7) 0%, rgba(196,149,106,0.3) 40%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -300, right: -300, width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle, rgba(176,122,138,0.7) 0%, rgba(176,122,138,0.3) 40%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Cursor-following orb */}
      <div
        ref={orbRef}
        style={{
          position: 'fixed',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122,155,191,0.6) 0%, rgba(122,155,191,0.2) 35%, transparent 65%)',
          left: -999,
          top: -999,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 0,
          willChange: 'left, top',
        }}
      />

      {/* HOMEPAGE LAYER — unmounts instantly when transitioning starts (ghost pill takes over) */}
      {phase === 'homepage' && (
        <div
          className="absolute inset-0 flex flex-col items-center px-6 w-full"
          style={{ paddingTop: '18vh', zIndex: 2 }}
        >
          {/* Tagline + description on top */}
          <div className="entrance-h1">
            <h1 className="text-[56px] font-bold text-[#1a1a2e] text-center leading-[1] tracking-[-0.04em]">
              <span style={{ color: '#7B6BA8' }}>Reimagine</span> thinking
            </h1>
          </div>
          <div className="entrance-subtitle" style={{ marginTop: 10 }}>
            <p className="text-[14px] text-center" style={{ color: '#1a1a2e', opacity: 0.4 }}>
              Type an idea. AI agents brainstorm, research, and execute in real time.
            </p>
          </div>

          {/* Input pill */}
          <div className="entrance-chatbox w-full max-w-[560px]" style={{ marginTop: 64 }}>
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
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!idea.trim()}
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
                  className="rounded-full text-[13px] text-[#555] hover:text-[#222] transition-all"
                  style={{ padding: '8px 18px', backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {s.text}
                </button>
              </div>
            ))}
          </div>

          {/* Synapse — subtle footer branding */}
          <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0 }}>
            <p className="text-[28px] font-semibold text-[#1a1a2e] text-center tracking-[-0.03em]" style={{ opacity: 0.12 }}>
              Synapse.
            </p>
          </div>

        </div>
      )}

      {/* GHOST PILL — mounts in white/wide state, then morphed flips to trigger CSS transition to dark/small capsule */}
      {phase === 'transitioning' && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: morphed ? '50%' : 'calc(18vh + 120px)',
            transform: morphed ? 'translate(-50%, -50%)' : 'translateX(-50%)',
            zIndex: 30,
            pointerEvents: 'none',
            width: morphed ? 140 : 560,
            height: morphed ? 48 : 60,
            backgroundColor: morphed ? '#1a1a2e' : '#ffffff',
            borderRadius: 9999,
            border: morphed ? '1px solid transparent' : '1px solid rgba(0,0,0,0.07)',
            boxShadow: morphed
              ? '0 2px 8px rgba(26,26,46,0.2), 0 8px 24px rgba(26,26,46,0.15)'
              : '0 2px 6px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            // Fade out at end so it dissolves into the real CenterNode underneath
            opacity: morphed ? 0 : 1,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1), height 0.5s cubic-bezier(0.4,0,0.2,1), top 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1), background-color 0.5s cubic-bezier(0.4,0,0.2,1), box-shadow 0.5s cubic-bezier(0.4,0,0.2,1), border-color 0.5s ease, opacity 0.3s ease 0.35s',
          }}
        >
          {/* Text fades out as pill shrinks */}
          <span
            style={{
              color: morphed ? 'transparent' : '#1a1a2e',
              fontSize: 16,
              fontWeight: 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              transition: 'color 0.2s ease',
              paddingLeft: 32,
              paddingRight: 64,
              width: '100%',
            }}
          >
            {idea}
          </span>
          {/* Three dots fade in as it becomes the dark capsule */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: morphed ? 1 : 0,
              transition: 'opacity 0.2s ease 0.3s',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      )}

      {/* CANVAS LAYER — fades in behind the ghost pill during morph */}
      {(phase === 'transitioning' || phase === 'canvas') && (
        <div
          className="absolute inset-0 z-10 w-full h-full"
          style={{
            opacity: phase === 'canvas' ? 1 : morphed ? 1 : 0,
            transition: 'opacity 0.4s ease 0.1s',
          }}
        >
          <SynapseCanvas idea={idea} branches={branches} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
