'use client';

import { Handle, Position } from 'reactflow';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface BranchNodeData {
  label: string;
  description: string;
  color: string;
  agentPersonality: string;
  rootIdea: string;
  isDimmed: boolean;
  onClickAgent: () => void;
  onAddNode: () => void;
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
    label, color, isDimmed, onClickAgent, onAddNode, spawnDelay,
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



        {agentStatus === 'done' && (
          <p className="text-[11px] text-[#4a9e6b] mt-1.5 leading-[1.4]">
            Done — click to explore
          </p>
        )}
      </div>
      {/* Add node button — below the branch card */}
      {!isDimmed && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddNode(); }}
          className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          style={{
            top: 'calc(100% + 6px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            cursor: 'pointer',
            zIndex: 5,
          }}
        >
          <Plus className="w-3 h-3 text-[#888]" />
        </button>
      )}

      {/* Floating thinking bubble above the node */}
      {agentStatus === 'thinking' && agentThinking && (
        <div
          className="absolute left-1/2 pointer-events-none"
          style={{
            bottom: 'calc(100% + 8px)',
            transform: 'translateX(-50%)',
            zIndex: 10,
            maxWidth: 220,
            whiteSpace: 'nowrap',
            animation: 'floatIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <span
            className="text-[11px] text-[#666460] font-medium"
            style={{
              backgroundColor: 'rgba(245,244,240,0.92)',
              padding: '3px 10px',
              borderRadius: 20,
              display: 'inline-block',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            {agentThinking}
          </span>
        </div>
      )}
      {handles}
    </div>
  );
}
