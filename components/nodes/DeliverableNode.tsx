'use client';

import { Handle, Position } from 'reactflow';
import { useRef, useEffect, useCallback, useState } from 'react';
import { FileText, Globe, X } from 'lucide-react';

interface DeliverableNodeData {
  title: string;
  summary: string;
  content: string;
  html?: string;
  type: 'doc' | 'chart' | 'mockup';
  color: string;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  isDimmed: boolean;
}

const PANEL_WIDTH = 680;
const CHIP_WIDTH = 130;
const STEM = 16;

export function DeliverableNode({ data }: { data: DeliverableNodeData }) {
  const { title, summary, content, html, type, color, isExpanded, onExpand, onCollapse, isDimmed } = data;
  const isMockup = type === 'mockup';
  const editorRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState<'above' | 'below' | 'left' | 'right'>('above');

  // Pick direction based on the node's position relative to viewport center.
  // Compare horizontal vs vertical displacement — expand along the dominant axis, outward.
  const pickDirection = useCallback(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const chipCenterX = rect.left + rect.width / 2;
    const chipCenterY = rect.top + rect.height / 2;
    const dx = chipCenterX - window.innerWidth / 2;
    const dy = chipCenterY - window.innerHeight / 2;

    if (Math.abs(dy) > Math.abs(dx)) {
      // Primarily vertical displacement — open above or below
      setDir(dy < 0 ? 'above' : 'below');
    } else {
      // Primarily horizontal displacement — open left or right
      setDir(dx < 0 ? 'left' : 'right');
    }
  }, []);

  useEffect(() => {
    if (isExpanded) pickDirection();
  }, [isExpanded, pickDirection]);

  // Seed editor with content on first expand
  useEffect(() => {
    if (isExpanded && editorRef.current && editorRef.current.innerHTML === '') {
      const html = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
      editorRef.current.innerHTML = html;
    }
  }, [isExpanded, content]);

  // Panel position styles
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    width: PANEL_WIDTH,
    maxHeight: 560,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    border: `1.5px solid ${color}25`,
    boxShadow: '0 24px 64px rgba(0,0,0,0.10), 0 6px 20px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 80,
  };

  const stemStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: `${color}60`,
  };

  if (dir === 'above') {
    panelStyle.bottom = `calc(100% + ${STEM}px)`;
    panelStyle.left = `${(CHIP_WIDTH - PANEL_WIDTH) / 2}px`;
    panelStyle.animation = 'panelRise 0.28s cubic-bezier(0.16,1,0.3,1) both';
    Object.assign(stemStyle, { bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: 1.5, height: STEM });
  } else if (dir === 'left') {
    panelStyle.right = `calc(100% + ${STEM}px)`;
    panelStyle.top = '50%';
    panelStyle.transform = 'translateY(-50%)';
    panelStyle.animation = 'panelSlideIn 0.28s cubic-bezier(0.16,1,0.3,1) both';
    Object.assign(stemStyle, { right: '100%', top: '50%', transform: 'translateY(-50%)', height: 1.5, width: STEM });
  } else if (dir === 'below') {
    panelStyle.top = `calc(100% + ${STEM}px)`;
    panelStyle.left = `${(CHIP_WIDTH - PANEL_WIDTH) / 2}px`;
    panelStyle.animation = 'panelDrop 0.28s cubic-bezier(0.16,1,0.3,1) both';
    Object.assign(stemStyle, { top: '100%', left: '50%', transform: 'translateX(-50%)', width: 1.5, height: STEM });
  } else {
    panelStyle.left = `calc(100% + ${STEM}px)`;
    panelStyle.top = '50%';
    panelStyle.transform = 'translateY(-50%)';
    panelStyle.animation = 'panelSlideIn 0.28s cubic-bezier(0.16,1,0.3,1) both';
    Object.assign(stemStyle, { left: '100%', top: '50%', transform: 'translateY(-50%)', height: 1.5, width: STEM });
  }

  const handles = (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
    </>
  );

  return (
    <div style={{ position: 'relative', overflow: 'visible', width: CHIP_WIDTH }}>
      {handles}

      {/* ── Editor panel ── */}
      {isExpanded && (
        <div className="nodrag nowheel" style={panelStyle} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: '#faf9f7', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isMockup
                ? <Globe style={{ width: 16, height: 16, color }} />
                : <FileText style={{ width: 16, height: 16, color }} />
              }
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', letterSpacing: '-0.2px' }}>{title}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onCollapse(); }}
              style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa8a2', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Summary */}
          {summary && !isMockup && (
            <div style={{ padding: '12px 24px 0', fontSize: 13, lineHeight: 1.6, color: '#888780', flexShrink: 0 }}>
              {summary}
            </div>
          )}

          {/* Mockup: sandboxed iframe */}
          {isMockup ? (
            <iframe
              srcDoc={html || '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888">No content generated</body></html>'}
              sandbox="allow-scripts"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ flex: 1, border: 'none', width: '100%', minHeight: 480, display: 'block' }}
            />
          ) : (
            /* Editable body for doc type */
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              onKeyPress={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px', fontSize: 14, lineHeight: 1.85, color: '#2a2a3e', outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'text' }}
            />
          )}
        </div>
      )}

      {/* ── Stem connector ── */}
      {isExpanded && <div style={stemStyle} />}

      {/* ── The doc chip ── */}
      <div
        ref={chipRef}
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
        onClick={() => { if (!isDimmed) isExpanded ? onCollapse() : onExpand(); }}
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

      <style>{`
        @keyframes panelRise {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes panelDrop {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes panelSlideIn {
          from { opacity: 0; transform: translateY(-50%) scale(0.98); }
          to   { opacity: 1; transform: translateY(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
