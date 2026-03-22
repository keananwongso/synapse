'use client';

import { Handle, Position } from 'reactflow';

interface PlanWeek {
  week: string;
  tasks: string[];
}

interface MasterPlanNodeData {
  title: string;
  weeks: PlanWeek[];
  color: string;
}

export function MasterPlanNode({ data }: { data: MasterPlanNodeData }) {
  const { title, weeks, color } = data;

  return (
    <div className="node-spawn" style={{ width: 380, position: 'relative' }}>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />

      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          border: '1.5px solid #1a1a2e',
          boxShadow: '0 8px 32px rgba(26,26,46,0.15), 0 2px 8px rgba(26,26,46,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#1a1a2e',
            padding: '14px 18px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            Action Plan
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{title}</span>
        </div>

        {/* Weeks */}
        <div style={{ background: '#fff', padding: '6px 0' }}>
          {weeks.map((week, wi) => (
            <div
              key={wi}
              style={{
                padding: '10px 18px',
                borderBottom: wi < weeks.length - 1 ? '1px solid #f0eeea' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#1a1a2e',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: wi === 0 ? '#4a9e6b' : '#d4d0c8',
                    flexShrink: 0,
                  }}
                />
                {week.week}
              </div>
              {week.tasks.map((task, ti) => (
                <div
                  key={ti}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '3px 0 3px 12px',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      border: '1.5px solid #d4d0c8',
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#2a2a3e', lineHeight: 1.5 }}>{task}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#faf9f7',
            padding: '8px 18px',
            borderTop: '1px solid #f0eeea',
          }}
        >
          <p style={{ fontSize: 10, color: '#888780', margin: 0, textAlign: 'center' }}>
            Synthesized from {weeks.reduce((a, w) => a + w.tasks.length, 0)} action items across all agents
          </p>
        </div>
      </div>
    </div>
  );
}
