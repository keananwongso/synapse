// Physics simulation hook - runs at 60fps using requestAnimationFrame
// Stores physics state in a mutable ref for performance,
// syncs to React state every frame for rendering.

import { useEffect, useRef, useCallback } from 'react';
import { Node, Connection } from '@/lib/types';
import { simulateStep, hasSettled } from '@/lib/physics';

interface UsePhysicsOptions {
  nodes: Node[];
  connections: Connection[];
  onUpdate: (nodes: Node[]) => void;
  enabled?: boolean;
  /** Current pan offset — used to compute viewport center for gravity */
  pan?: { x: number; y: number };
  /** Current zoom level */
  zoom?: number;
}

export function usePhysics({
  nodes,
  connections,
  onUpdate,
  enabled = true,
  pan = { x: 400, y: 300 },
  zoom = 1,
}: UsePhysicsOptions) {
  // Mutable physics state (never triggers re-renders)
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<Connection[]>(connections);
  const animationFrameRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const frameCountRef = useRef(0);

  // Keep pan/zoom refs up to date
  useEffect(() => { panRef.current = pan; }, [pan.x, pan.y]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Sync React node state → physics ref (only when React state changes externally)
  useEffect(() => {
    // Merge: keep physics velocities for existing nodes, add new nodes
    const existingMap = new Map<string, Node>(nodesRef.current.map(n => [n.id, n]));
    nodesRef.current = nodes.map(n => {
      const existing = existingMap.get(n.id);
      if (existing) {
        // If the node is being dragged in React, respect the React position
        if (n.isDragging || existing.isDragging !== n.isDragging) {
          return { ...n };
        }
        // Otherwise keep the physics-simulated position/velocity
        return { ...existing, text: n.text, nodeType: n.nodeType, isAI: n.isAI, metadata: n.metadata };
      }
      // Brand new node
      return { ...n };
    });
  }, [nodes]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  // Wake on new connections
  useEffect(() => {
    if (connections.length > 0) {
      isPausedRef.current = false;
    }
  }, [connections.length]);

  // Main animation loop
  useEffect(() => {
    if (!enabled) return;

    const animate = () => {
      const currentNodes = nodesRef.current;
      if (currentNodes.length === 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check if settled
      if (hasSettled(currentNodes, 0.1)) {
        if (!isPausedRef.current) {
          isPausedRef.current = true;
        }
      } else {
        isPausedRef.current = false;
      }

      if (!isPausedRef.current) {
        // Compute viewport center in world coordinates
        const p = panRef.current;
        const z = zoomRef.current;
        const centerX = (window.innerWidth / 2 - p.x) / z;
        const centerY = (window.innerHeight / 2 - p.y) / z;

        // Run physics step (mutates nodesRef in place)
        simulateStep(currentNodes, connectionsRef.current, centerX, centerY);

        // Sync to React every frame for smooth rendering
        frameCountRef.current++;
        onUpdate(currentNodes.map(n => ({ ...n })));
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, onUpdate]);

  // Manually wake physics
  const wake = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  return { wake };
}
