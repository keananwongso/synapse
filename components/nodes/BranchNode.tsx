'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect } from 'react';

interface BranchNodeData {
  label: string;
  description: string;
  color: string;
  agentPersonality: string;
  rootIdea: string;
  isDimmed: boolean;
  onClickAgent: () => void;
  spawnDelay: number;
  // Agent thinking state
  agentThinking?: string;
  agentStatus: 'idle' | 'thinking' | 'done';
}

function darkenColor(hex: string, factor: number = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
}

export function BranchNode({ data }: { data: BranchNodeData }) {
  const {
    label, color, isDimmed, onClickAgent, spawnDelay,
    agentThinking, agentStatus = 'idle',
  } = data;

  const [spawned, setSpawned] = useState(false);
  const accentColor = darkenColor(color, 0.35);

  // Spawn animation delay
  useEffect(() => {
    const timer = setTimeout(() => setSpawned(true), spawnDelay);
    return () => clearTimeout(timer);
  }, [spawnDelay]);

  if (!spawned) return null;

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
    <div className="relative" style={{ minWidth: 150 }}>
      <div
        className="node-spawn flex flex-col cursor-pointer relative"
        style={{
          minWidth: 160,
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
        onClick={() => { if (!isDimmed) onClickAgent(); }}
      >
        {/* AGENT badge + status dot */}
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
          {agentStatus === 'done' && (
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4a9e6b' }} />
          )}
        </div>

        {/* Label */}
        <span className="text-[13px] font-semibold text-[#1a1a2e] whitespace-nowrap tracking-[-0.1px]">{label}</span>

        {/* Thinking status text inside card */}
        {agentStatus === 'thinking' && agentThinking && (
          <p
            className="text-[11px] text-[#888780] mt-1.5 leading-[1.4] animate-pulse"
            style={{ maxWidth: 160 }}
          >
            {agentThinking}
          </p>
        )}

        {agentStatus === 'done' && (
          <p className="text-[11px] text-[#4a9e6b] mt-1.5 leading-[1.4]">
            Done — click to explore
          </p>
        )}
      </div>
      {handles}
    </div>
  );
}
