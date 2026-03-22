// Core type definitions for Synapse

export interface Node {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  isAI: boolean;
  isDragging: boolean;
  nodeType: 'thought' | 'ai_idea' | 'research' | 'document' | 'mockup' | 'checklist' | 'chart';
  metadata: Record<string, any>;
  clusterId?: string;
  relatedNodeIds: string[];
  createdAt?: Date;
}

export interface Connection {
  id: string;
  from: string; // node id
  to: string;   // node id
  strength: number; // 0-1, higher = stronger relationship
}

export interface Cluster {
  id: string;
  nodeIds: string[];
  label: string;
  centroid: { x: number; y: number };
}

export interface AgentTask {
  id: string;
  canvasId: string;
  type: 'brainstorm' | 'research' | 'plan' | 'write' | 'mockup';
  input: {
    cluster_label: string;
    thoughts: string[];
    node_ids: string[];
  };
  status: 'pending' | 'processing' | 'complete' | 'error';
  createdAt?: Date;
}

export interface AgentResult {
  id: string;
  taskId: string;
  canvasId: string;
  nodeType: string;
  results: {
    text: string;
    metadata: Record<string, any>;
    related_node_ids: string[];
  }[];
  createdAt?: Date;
}

export interface Canvas {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  clusters: Cluster[];
}
