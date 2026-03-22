'use client';

import { Handle, Position } from 'reactflow';
import { FileText, Globe } from 'lucide-react';

interface DeliverableNodeData {
  title: string;
  type: 'doc' | 'chart' | 'mockup';
  color: string;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  isDimmed: boolean;
}

const CHIP_WIDTH = 130;

export function DeliverableNode({ data }: { data: DeliverableNodeData }) {
  const { title, type, color, isExpanded, onExpand, onCollapse, isDimmed } = data;
  const isMockup = type === 'mockup';

  return (
    <div style={{ position: 'relative', width: CHIP_WIDTH }}>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />

      <div
        className="node-spawn flex flex-col items-center justify-center cursor-pointer"
        style={{
          width: CHIP_WIDTH,
          padding: '12px 14px',
          background: isExpanded
            ? `linear-gradient(160deg, #ffffff 0%, ${color}12 100%)`
            : 'linear-gradient(160deg, #ffffff 0%, #faf9f7 100%)',
          border: isExpanded ? `1.5px solid ${color}` : `1.5px solid ${color}40`,
          borderRadius: 20,
          boxShadow: isExpanded
            ? `0 2px 8px ${color}30, 0 6px 20px ${color}15`
            : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
          opacity: isDimmed ? 0.25 : 1,
          pointerEvents: isDimmed ? 'none' : 'auto',
          transition: 'opacity 0.3s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
        }}
        onMouseEnter={e => {
          if (!isDimmed && !isExpanded) {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLElement).style.borderColor = color;
          }
        }}
        onMouseLeave={e => {
          if (!isExpanded) {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)';
            (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
          }
        }}
        onClick={(e) => { e.stopPropagation(); if (!isDimmed) isExpanded ? onCollapse() : onExpand(); }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {isMockup
            ? <Globe className="w-3 h-3" style={{ color }} />
            : <FileText className="w-3 h-3" style={{ color }} />
          }
          <span className="text-[9px] font-bold tracking-[0.06em] uppercase" style={{ color }}>
            {isMockup ? 'Site' : 'Doc'}
          </span>
        </div>
        <span className="text-[12px] font-medium text-[#1a1a2e] text-center leading-[1.3]">{title}</span>
      </div>
    </div>
  );
}
