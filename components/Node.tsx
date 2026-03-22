'use client';

import { useDrag } from '@use-gesture/react';
import { Node as NodeType } from '@/lib/types';
import { NODE_STYLES, NODE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { NodeChat } from './NodeChat';

interface NodeProps {
  node: NodeType;
  onDrag: (id: string, x: number, y: number, isDragging: boolean, throwVx?: number, throwVy?: number) => void;
  onClick?: (id: string) => void;
  zoom?: number;
  isExpanded?: boolean;
  isDimmed?: boolean;
  onExpand?: (id: string) => void;
  onCollapse?: () => void;
}

export function Node({
  node,
  onDrag,
  onClick,
  zoom = 1,
  isExpanded = false,
  isDimmed = false,
  onExpand,
  onCollapse,
}: NodeProps) {
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const wasDragging = useRef(false);

  const styles = NODE_STYLES[node.nodeType] || NODE_STYLES.thought;
  const colors = NODE_COLORS[node.nodeType] || NODE_COLORS.thought;

  // When expanded, show chat content after expansion animation completes
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => setChatVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setChatVisible(false);
    }
  }, [isExpanded]);

  // Drag gesture — disabled when expanded
  const bind = useDrag(
    ({ offset: [x, y], active, velocity: [vxGesture, vyGesture], direction: [dx, dy], movement: [mx, my] }) => {
      if (isExpanded) return;

      setIsDraggingLocal(active);

      if (active) {
        wasDragging.current = Math.abs(mx) > 3 || Math.abs(my) > 3;
        velocityRef.current = { vx: vxGesture * dx * 3, vy: vyGesture * dy * 3 };
        onDrag(node.id, x, y, true);
      } else {
        const throwVx = Math.abs(vxGesture) > 0.2 ? velocityRef.current.vx : 0;
        const throwVy = Math.abs(vyGesture) > 0.2 ? velocityRef.current.vy : 0;
        onDrag(node.id, x, y, false, throwVx, throwVy);
      }
    },
    { from: () => [node.x, node.y] }
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDimmed) return;
    // Don't expand if user was dragging
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    if (!isExpanded && onExpand) {
      onExpand(node.id);
    }
    onClick?.(node.id);
  };

  const handleClose = () => {
    setChatVisible(false);
    // Wait for chat fade-out, then collapse
    setTimeout(() => onCollapse?.(), 200);
  };

  // Dimensions: pill vs expanded chatbox
  const expandedWidth = 380;
  const expandedHeight = 340;
  // Pill size (approximate)
  const pillWidth = 160;
  const pillHeight = 52;

  // Offset so the node stays centered on its original position when expanded
  const currentWidth = isExpanded ? expandedWidth : pillWidth;
  const currentHeight = isExpanded ? expandedHeight : pillHeight;
  const offsetX = -currentWidth / 2;
  const offsetY = -currentHeight / 2;

  return (
    <div
      {...bind()}
      style={{
        transform: `translate(${node.x + offsetX}px, ${node.y + offsetY}px)`,
        width: `${currentWidth}px`,
        height: `${currentHeight}px`,
        touchAction: 'none',
        transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
        zIndex: isExpanded ? 50 : (isDraggingLocal ? 10 : 1),
        opacity: isDimmed ? 0.35 : 1,
        pointerEvents: isDimmed ? 'none' : 'auto',
      }}
      className={cn(
        'absolute select-none',
        isExpanded ? 'cursor-default' : (isDraggingLocal ? 'cursor-grabbing' : 'cursor-grab'),
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'w-full h-full border overflow-hidden',
          'transition-[border-radius,box-shadow] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          'node-spawn',
          styles.border,
          isExpanded
            ? 'rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.12)]'
            : cn('rounded-full', styles.glow, 'hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]'),
        )}
        style={{ backgroundColor: colors.bg }}
      >
        {isExpanded ? (
          /* ---- Expanded: Chat UI ---- */
          <NodeChat
            nodeId={node.id}
            label={node.text}
            nodeType={node.nodeType}
            visible={chatVisible}
            onClose={handleClose}
          />
        ) : (
          /* ---- Collapsed: Pill label ---- */
          <div className="flex items-center justify-center h-full px-5">
            <p className={cn('text-sm font-medium leading-tight text-center', styles.text)}>
              {node.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
