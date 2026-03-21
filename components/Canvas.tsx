'use client';

import { useDrag, usePinch } from '@use-gesture/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Node as NodeComponent } from './Node';
import { Connection } from './Connection';
import { ClusterLabel } from './ClusterLabel';
import { Node as NodeType, Connection as ConnectionType, Cluster } from '@/lib/types';

interface CanvasProps {
  nodes: NodeType[];
  connections: ConnectionType[];
  clusters: Cluster[];
  onNodeDrag: (id: string, x: number, y: number, isDragging: boolean, throwVx?: number, throwVy?: number) => void;
  onCanvasClick?: () => void;
  onClusterClick?: (cluster: Cluster) => void;
  onNodeClick?: (id: string) => void;
  initialPan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
}

export function Canvas({
  nodes,
  connections,
  clusters,
  onNodeDrag,
  onCanvasClick,
  onClusterClick,
  onNodeClick,
  initialPan = { x: 400, y: 300 },
  onPanChange,
  onZoomChange,
}: CanvasProps) {
  const [pan, setPan] = useState(initialPan);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingCanvasRef = useRef(false);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);

  // Keep refs in sync for use in event handlers
  const updatePan = useCallback((newPan: { x: number; y: number }) => {
    setPan(newPan);
    panRef.current = newPan;
    onPanChange?.(newPan);
  }, [onPanChange]);

  const updateZoom = useCallback((newZoom: number) => {
    setZoom(newZoom);
    zoomRef.current = newZoom;
    onZoomChange?.(newZoom);
  }, [onZoomChange]);

  // Pan gesture (drag empty space)
  const bindPan = useDrag(
    ({ offset: [x, y], active }) => {
      if (!active) {
        isDraggingCanvasRef.current = false;
        return;
      }
      isDraggingCanvasRef.current = true;
      updatePan({ x, y });
    },
    {
      from: () => [pan.x, pan.y],
      filterTaps: true,
      pointer: { capture: false },
    }
  );

  // Pinch-to-zoom gesture
  const bindPinch = usePinch(
    ({ offset: [scale] }) => {
      updateZoom(Math.max(0.2, Math.min(3, scale)));
    },
    {
      from: () => [zoom, 0] as [number, number],
      scaleBounds: { min: 0.2, max: 3 },
    }
  );

  // Mouse wheel zoom — zooms toward cursor position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const oldZoom = zoomRef.current;
    const newZoom = Math.max(0.2, Math.min(3, oldZoom * (1 - e.deltaY * 0.001)));

    // Adjust pan so the point under the cursor stays fixed
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const currentPan = panRef.current;
    const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / oldZoom);
    const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / oldZoom);

    updateZoom(newZoom);
    updatePan({ x: newPanX, y: newPanY });
  }, [updateZoom, updatePan]);

  // Track mouse position for subtle flashlight glow effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || e.target === canvasRef.current) {
      if (!isDraggingCanvasRef.current && onCanvasClick) {
        onCanvasClick();
      }
    }
  };

  return (
    <div
      ref={canvasRef}
      {...bindPan()}
      {...bindPinch()}
      suppressHydrationWarning
      className="fixed inset-0 overflow-hidden bg-[#F5F3EE] canvas-bg vignette cursor-move select-none"
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
    >
      {/* World container with pan/zoom transform */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
        className="pointer-events-none"
      >
        {/* SVG layer for connections (below nodes) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        >
          {connections.map((conn) => (
            <Connection key={conn.id} connection={conn} nodes={nodes} />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <NodeComponent
            key={node.id}
            node={node}
            onDrag={onNodeDrag}
            onClick={onNodeClick}
            zoom={zoom}
          />
        ))}

        {/* Cluster labels */}
        {clusters.map((cluster) => (
          <ClusterLabel
            key={cluster.id}
            cluster={cluster}
            nodes={nodes}
            onClick={onClusterClick}
          />
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-[#E7E3DC]/80 backdrop-blur-sm
                      rounded-lg border border-[#CFCBC3] text-xs text-[#1A1A1A]/50 pointer-events-none">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
