'use client';

import { useDrag } from '@use-gesture/react';
import { Node as NodeType } from '@/lib/types';
import { NODE_STYLES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

interface NodeProps {
  node: NodeType;
  onDrag: (id: string, x: number, y: number, isDragging: boolean, throwVx?: number, throwVy?: number) => void;
  onDoubleClick?: (id: string) => void;
  onClick?: (id: string) => void;
  zoom?: number;
}

export function Node({ node, onDrag, onDoubleClick, onClick, zoom = 1 }: NodeProps) {
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const lastPosRef = useRef({ x: node.x, y: node.y });

  const styles = NODE_STYLES[node.nodeType] || NODE_STYLES.thought;

  // Drag gesture with throw velocity
  const bind = useDrag(
    ({ offset: [x, y], active, velocity: [vxGesture, vyGesture], direction: [dx, dy] }) => {
      setIsDraggingLocal(active);

      if (active) {
        // Track velocity for throw
        velocityRef.current = {
          vx: vxGesture * dx * 3,
          vy: vyGesture * dy * 3,
        };
        lastPosRef.current = { x, y };
        onDrag(node.id, x, y, true);
      } else {
        // Release: pass throw velocity
        const throwVx = Math.abs(vxGesture) > 0.2 ? velocityRef.current.vx : 0;
        const throwVy = Math.abs(vyGesture) > 0.2 ? velocityRef.current.vy : 0;
        onDrag(node.id, x, y, false, throwVx, throwVy);
      }
    },
    {
      from: () => [node.x, node.y],
    }
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(node.id);
  };

  return (
    <div
      {...bind()}
      style={{
        transform: `translate(${node.x}px, ${node.y}px) scale(${isDraggingLocal ? 1.05 : 1})`,
        touchAction: 'none',
        transition: isDraggingLocal ? 'none' : 'transform 0.15s ease-out',
      }}
      className={cn(
        'absolute select-none',
        isDraggingLocal ? 'cursor-grabbing z-10' : 'cursor-grab'
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'px-4 py-3 rounded-xl border max-w-[240px]',
          'transition-all duration-200',
          'node-spawn',
          styles.bg,
          styles.border,
          styles.glow,
          // Hover: brighter border, stronger shadow
          'hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]',
          isDraggingLocal && 'shadow-[0_8px_30px_rgba(0,0,0,0.15)]'
        )}
      >
        <p className={cn('text-sm leading-relaxed', styles.text)}>
          {node.text}
        </p>

        {/* Node type indicator */}
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          {node.isAI && (
            <span className="text-[#D4A857]/70 font-medium">AI</span>
          )}
          {styles.icon && (
            <span className="opacity-60">{styles.icon}</span>
          )}
        </div>
      </div>
    </div>
  );
}
