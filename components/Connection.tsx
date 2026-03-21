'use client';

import { Connection as ConnectionType, Node } from '@/lib/types';

interface ConnectionProps {
  connection: ConnectionType;
  nodes: Node[];
}

export function Connection({ connection, nodes }: ConnectionProps) {
  const { from, to, strength } = connection;

  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);

  if (!fromNode || !toNode) return null;

  const x1 = fromNode.x;
  const y1 = fromNode.y;
  const x2 = toNode.x;
  const y2 = toNode.y;

  // Cubic bezier with curvature proportional to distance
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(dist * 0.4, 80);

  const path = `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;

  // Style scales with connection strength
  const opacity = 0.15 + strength * 0.35;
  const strokeWidth = 0.5 + strength * 1.5;

  return (
    <path
      d={path}
      stroke={`rgba(212, 168, 87, ${opacity})`}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      className="transition-opacity duration-300"
    />
  );
}
