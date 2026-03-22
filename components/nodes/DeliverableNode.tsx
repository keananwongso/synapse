'use client';

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import { FileText, X } from 'lucide-react';

interface DeliverableNodeData {
  title: string;
  summary: string;
  content: string;
  type: 'doc' | 'chart' | 'mockup';
  color: string; // inherited from parent agent's accent color
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  isDimmed: boolean;
}

export function DeliverableNode({ data }: { data: DeliverableNodeData }) {
  const { title, summary, content, color, isExpanded, onExpand, onCollapse, isDimmed } = data;

  const handles = (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
    </>
  );

  // ─── COLLAPSED: small circular node ───
  if (!isExpanded) {
    return (
      <div className="relative">
        <div
          className="node-spawn flex flex-col items-center justify-center cursor-pointer"
          style={{
            width: 130,
            padding: '12px 14px',
            background: 'linear-gradient(160deg, #ffffff 0%, #faf9f7 100%)',
            border: `1.5px solid ${color}40`,
            borderRadius: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
            opacity: isDimmed ? 0.25 : 1,
            pointerEvents: isDimmed ? 'none' : 'auto',
            transition: 'opacity 0.3s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          }}
          onMouseEnter={e => { if (!isDimmed) { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = color; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = `${color}40`; }}
          onClick={() => { if (!isDimmed) onExpand(); }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="w-3 h-3" style={{ color }} />
            <span
              className="text-[9px] font-bold tracking-[0.06em] uppercase"
              style={{ color }}
            >
              Doc
            </span>
          </div>
          <span className="text-[12px] font-medium text-[#1a1a2e] text-center leading-[1.3]">{title}</span>
        </div>
        {handles}
      </div>
    );
  }

  // ─── EXPANDED: show full content ───
  return (
    <div
      style={{
        width: 340,
        maxHeight: 380,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        border: `1.5px solid ${color}40`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.13), 0 4px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {handles}

      <div
        className="flex flex-col h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" style={{ color }} />
            <span className="text-[13px] font-semibold text-[#1a1a2e] tracking-[-0.1px]">{title}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onCollapse(); }}
            className="p-1 rounded-md hover:bg-black/5 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[#888780]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          <p className="text-[11px] text-[#888780] mb-2">{summary}</p>
          <div className="text-[12px] leading-[1.65] text-[#2a2a3e] whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
