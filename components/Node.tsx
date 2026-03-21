'use client';

import { useDrag } from '@use-gesture/react';
import { Node as NodeType } from '@/lib/types';
import { NODE_STYLES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NodeProps {
  node: NodeType;
  onDrag: (id: string, x: number, y: number, isDragging: boolean) => void;
  onDoubleClick?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function Node({ node, onDrag, onDoubleClick, onClick }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);

  const styles = NODE_STYLES[node.nodeType] || NODE_STYLES.thought;

  // Drag gesture
  const bind = useDrag(
    ({ offset: [x, y], active }) => {
      onDrag(node.id, x, y, active);
    },
    {
      from: () => [node.x, node.y],
    }
  );

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick(node.id);
    }
    setIsEditing(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(node.id);
    }
  };

  return (
    <div
      {...bind()}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        touchAction: 'none',
      }}
      className="absolute cursor-grab active:cursor-grabbing select-none"
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
    >
      <div
        className={cn(
          'px-4 py-3 rounded-xl backdrop-blur-sm border max-w-[240px]',
          'transition-all duration-300',
          'hover:scale-105',
          'node-spawn',
          styles.bg,
          styles.border,
          styles.glow
        )}
      >
        <p className={cn('text-sm leading-relaxed', styles.text)}>
          {node.text}
        </p>

        {/* Node type indicator */}
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          {node.isAI && (
            <span className="text-purple-400/60">AI</span>
          )}
          {styles.icon && (
            <span className="opacity-60">{styles.icon}</span>
          )}
        </div>
      </div>
    </div>
  );
}
