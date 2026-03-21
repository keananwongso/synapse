// Physics engine for node clustering and drift effect

import { Node, Connection } from './types';
import { PHYSICS_CONSTANTS } from './constants';

/**
 * Runs a single physics simulation step.
 * Applies spring, repulsion, and centering gravity forces, then integrates.
 * centerX/centerY are the world-space coordinates of the viewport center.
 */
export function simulateStep(
  nodes: Node[],
  connections: Connection[],
  centerX: number = 0,
  centerY: number = 0
): void {
  const {
    SPRING_STRENGTH,
    SPRING_LENGTH,
    REPULSION,
    REPULSION_RADIUS,
    DAMPING,
    MAX_VELOCITY,
    GRAVITY,
  } = PHYSICS_CONSTANTS;

  // Build a quick ID → index map for O(1) lookups
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) {
    idToIndex.set(nodes[i].id, i);
  }

  // 1. Spring forces (connected nodes attract)
  for (const conn of connections) {
    const ai = idToIndex.get(conn.from);
    const bi = idToIndex.get(conn.to);
    if (ai === undefined || bi === undefined) continue;

    const nodeA = nodes[ai];
    const nodeB = nodes[bi];

    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;

    const force = (distance - SPRING_LENGTH) * SPRING_STRENGTH * conn.strength;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;

    if (!nodeA.isDragging) { nodeA.vx += fx; nodeA.vy += fy; }
    if (!nodeB.isDragging) { nodeB.vx -= fx; nodeB.vy -= fy; }
  }

  // 2. Repulsion forces (all nodes push apart)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const distanceSquared = dx * dx + dy * dy || 1;

      if (distanceSquared > REPULSION_RADIUS * REPULSION_RADIUS) continue;

      const distance = Math.sqrt(distanceSquared);
      const force = REPULSION / distanceSquared;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      if (!nodeA.isDragging) { nodeA.vx -= fx; nodeA.vy -= fy; }
      if (!nodeB.isDragging) { nodeB.vx += fx; nodeB.vy += fy; }
    }
  }

  // 3. Centering gravity (gentle pull toward viewport center)
  for (const node of nodes) {
    if (node.isDragging) continue;

    const dx = centerX - node.x;
    const dy = centerY - node.y;
    node.vx += dx * GRAVITY;
    node.vy += dy * GRAVITY;
  }

  // 4. Integration: damping + velocity clamp + position update
  for (const node of nodes) {
    if (node.isDragging) continue;

    node.vx *= DAMPING;
    node.vy *= DAMPING;

    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    if (speed > MAX_VELOCITY) {
      node.vx = (node.vx / speed) * MAX_VELOCITY;
      node.vy = (node.vy / speed) * MAX_VELOCITY;
    }

    node.x += node.vx;
    node.y += node.vy;
  }
}

/**
 * Checks if physics simulation has settled (all nodes nearly stationary)
 */
export function hasSettled(nodes: Node[], threshold: number = PHYSICS_CONSTANTS.SETTLE_THRESHOLD): boolean {
  return nodes.every((node) => {
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    return speed < threshold;
  });
}

/**
 * Calculate the centroid (average position) of a group of nodes
 */
export function calculateCentroid(nodes: Node[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 };

  const sum = nodes.reduce(
    (acc, node) => ({ x: acc.x + node.x, y: acc.y + node.y }),
    { x: 0, y: 0 }
  );

  return { x: sum.x / nodes.length, y: sum.y / nodes.length };
}

/**
 * Initialize a new node with random velocity for a natural "pop-in" effect
 */
export function initializeNodePhysics(node: Node): Node {
  return {
    ...node,
    vx: node.vx || (Math.random() - 0.5) * 2,
    vy: node.vy || (Math.random() - 0.5) * 2,
  };
}
