'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CenterNode } from './nodes/CenterNode';
import { BranchNode } from './nodes/BranchNode';

interface Branch {
  id: string;
  label: string;
  description: string;
  color: string;
  agentPersonality: string;
}

interface SynapseCanvasProps {
  idea: string;
  branches: Branch[];
  isLoading: boolean;
}

const nodeTypes = {
  center: CenterNode,
  branch: BranchNode,
};

const EDGE_STYLE = { stroke: '#C8C4BC', strokeWidth: 1.5, strokeDasharray: '6 4' };

function SynapseCanvasInner({ idea, branches, isLoading }: SynapseCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const hasSpawnedRef = useRef(false);
  const reactFlowInstance = useReactFlow();

  // Create center node on mount — locked in place
  useEffect(() => {
    const centerNode: Node = {
      id: 'center',
      type: 'center',
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      deletable: false,
      connectable: false,
      data: {
        label: idea,
        isLoading,
      },
      style: { cursor: 'default' },
    };
    setNodes([centerNode]);
  }, [idea, setNodes, isLoading]);

  // Spawn branch nodes when branches arrive
  useEffect(() => {
    if (branches.length === 0 || hasSpawnedRef.current) return;
    hasSpawnedRef.current = true;

    const total = branches.length;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    branches.forEach((branch, index) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * 260;
      const y = Math.sin(angle) * 200;

      newNodes.push({
        id: branch.id,
        type: 'branch',
        position: { x, y },
        data: {
          label: branch.label,
          description: branch.description,
          color: branch.color,
          agentPersonality: branch.agentPersonality,
          rootIdea: idea,
          isExpanded: false,
          isDimmed: false,
          onExpand: () => handleNodeExpand(branch.id, x, y),
          onCollapse: () => setExpandedNodeId(null),
          spawnDelay: index * 80,
        },
      });

      newEdges.push({
        id: `e-center-${branch.id}`,
        source: 'center',
        target: branch.id,
        type: 'straight',
        style: EDGE_STYLE,
      });
    });

    setTimeout(() => {
      setNodes((prev) => [...prev, ...newNodes]);
      setEdges(newEdges);

      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.25, duration: 500 });
      }, 400);
    }, 100);
  }, [branches, idea, setNodes, setEdges, reactFlowInstance]);

  // Handle node expand: center then expand
  const handleNodeExpand = useCallback((nodeId: string, x: number, y: number) => {
    reactFlowInstance.setCenter(x, y, { duration: 400, zoom: 1 });
    setTimeout(() => {
      setExpandedNodeId(nodeId);
    }, 100);
  }, [reactFlowInstance]);

  // Update branch node data when expandedNodeId changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type !== 'branch') return node;
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        return {
          ...node,
          data: {
            ...node.data,
            isExpanded: expandedNodeId === node.id,
            isDimmed: !!expandedNodeId && expandedNodeId !== node.id,
            onExpand: () => handleNodeExpand(node.id, nodeX, nodeY),
            onCollapse: () => setExpandedNodeId(null),
          },
        };
      })
    );
  }, [expandedNodeId, setNodes, handleNodeExpand]);

  // Click canvas background to collapse
  const onPaneClick = useCallback(() => {
    if (expandedNodeId) {
      setExpandedNodeId(null);
    }
  }, [expandedNodeId]);

  return (
    <div className="w-full h-full">
      {/* Floating navbar on canvas */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-3 bg-white border border-[#e8e6e0] rounded-full px-5 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <div className="w-7 h-7 bg-[#1a1a2e] rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="7" r="2" fill="white" />
              <circle cx="10" cy="7" r="2" fill="white" />
              <line x1="6" y1="7" x2="8" y2="7" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="text-[15px] font-medium text-[#1a1a2e]">Synapse</span>
          <div className="w-px h-4 bg-[#e8e6e0] mx-1" />
          <button className="text-[13px] text-[#888780] hover:text-[#1a1a2e] transition-colors">
            Export to Notion ↗
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={!expandedNodeId}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'straight',
          style: EDGE_STYLE,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(200,196,188,0.4)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(n) => n.data?.color || '#fff'}
          maskColor="rgba(245,244,240,0.7)"
        />
      </ReactFlow>
    </div>
  );
}

export default function SynapseCanvas(props: SynapseCanvasProps) {
  return (
    <ReactFlowProvider>
      <SynapseCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
