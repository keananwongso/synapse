'use client';

import { X, FileText } from 'lucide-react';

interface Deliverable {
  title: string;
  summary: string;
  content: string;
  type: string;
}

interface AgentDetailPanelProps {
  label: string;
  color: string;
  status: 'idle' | 'thinking' | 'done';
  currentThinking: string;
  deliverables: Deliverable[];
  onClose: () => void;
}

function darkenColor(hex: string, factor: number = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
}

export function AgentDetailPanel({ label, color, status, currentThinking, deliverables, onClose }: AgentDetailPanelProps) {
  const accentColor = darkenColor(color);

  return (
    <div
      className="fixed right-0 top-0 h-screen z-50 flex"
      style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
    >
      {/* Backdrop */}
      <div
        className="flex-1 cursor-pointer"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
      />

      {/* Panel */}
      <div
        className="h-full overflow-y-auto"
        style={{
          width: 380,
          backgroundColor: '#faf9f7',
          borderLeft: '1px solid #e8e6e0',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#faf9f7] border-b border-[#e8e6e0] px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: color, color: accentColor }}
            >
              Agent
            </span>
            <span className="text-[15px] font-semibold text-[#1a1a2e]">{label}</span>
            {status === 'thinking' && (
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
            )}
            {status === 'done' && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4a9e6b' }} />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4 text-[#888780]" />
          </button>
        </div>

        {/* Status */}
        {status === 'thinking' && (
          <div className="px-5 py-3 border-b border-[#e8e6e0]">
            <p className="text-[12px] text-[#888780] animate-pulse">{currentThinking}</p>
          </div>
        )}

        {/* Deliverables */}
        <div className="px-5 py-4 space-y-4">
          {deliverables.length === 0 && status !== 'thinking' && (
            <p className="text-[13px] text-[#aaa] text-center py-8">No deliverables yet.</p>
          )}

          {deliverables.map((deliv, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#e8e6e0] bg-white overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {/* Deliverable header */}
              <div className="px-4 py-3 border-b border-[#e8e6e0] flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span className="text-[13px] font-semibold text-[#1a1a2e]">{deliv.title}</span>
              </div>

              {/* Summary */}
              <div className="px-4 py-2 border-b border-[#f0eeea]">
                <p className="text-[11px] text-[#888780]">{deliv.summary}</p>
              </div>

              {/* Content */}
              <div className="px-4 py-3">
                <div className="text-[12px] leading-[1.7] text-[#2a2a3e] whitespace-pre-wrap">
                  {deliv.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
