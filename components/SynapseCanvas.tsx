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
import { NoteNode } from './nodes/NoteNode';

interface Branch {
  id: string;
  label: string;
  description: string;
  color: string;
  agentPersonality: string;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

interface SynapseCanvasProps {
  idea: string;
  branches: Branch[];
  isLoading: boolean;
}

const nodeTypes = {
  center: CenterNode,
  branch: BranchNode,
  note: NoteNode,
};

const EDGE_STYLE = { stroke: '#C8C4BC', strokeWidth: 1.5, strokeDasharray: '6 4' };

// Accent dot colors — richer tones, used as small dots on white cards
const BRANCH_COLORS = [
  '#9B8EC4', // soft violet
  '#7BA99A', // sage teal
  '#C4956A', // warm amber
  '#7A9BBF', // dusty blue
  '#B07A8A', // muted rose
];

function SynapseCanvasInner({ idea, branches, isLoading }: SynapseCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const hasSpawnedRef = useRef(false);
  const reactFlowInstance = useReactFlow();

  // Orchestrator chat state
  const [centerMessages, setCenterMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', text: `Let's work on "${idea}". I'm breaking this into branches for you...` },
  ]);
  const [floatingMessages, setFloatingMessages] = useState<ChatMessage[]>([
    { id: 'float-1', role: 'ai', text: `Breaking "${idea}" into branches...` },
  ]);
  const [isCenterChatLoading, setIsCenterChatLoading] = useState(false);
  const [centerExpanded, setCenterExpanded] = useState(false);

  // Update floating message when branches arrive
  useEffect(() => {
    if (branches.length > 0) {
      const branchNames = branches.map(b => b.label).join(', ');
      const msg: ChatMessage = {
        id: `float-${Date.now()}`,
        role: 'ai',
        text: `I've set up ${branches.length} agents: ${branchNames}. Click any branch to start exploring.`,
      };
      setFloatingMessages([msg]);
      setCenterMessages(prev => [...prev, msg]);
    }
  }, [branches]);

  // Handle orchestrator chat messages
  const handleCenterSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setCenterMessages(prev => [...prev, userMsg]);
    setIsCenterChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...centerMessages, userMsg],
          agentPersonality: 'You are the central orchestrator. Think holistically about the project. Be conversational and concise (2-3 sentences). Ask follow-up questions. When the user gives new context, acknowledge it and suggest which branches might be affected.',
          nodeLabel: idea,
          rootIdea: idea,
        }),
      });

      if (res.ok) {
        const { reply } = await res.json();
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: reply };
        setCenterMessages(prev => [...prev, aiMsg]);
        // Also show as floating when collapsed
        setFloatingMessages([aiMsg]);
      }
    } catch (err) {
      console.error('Center chat error:', err);
    } finally {
      setIsCenterChatLoading(false);
    }
  }, [centerMessages, idea]);

  // Handle center node expand
  const handleCenterExpand = useCallback(() => {
    // Collapse any expanded branch first
    setExpandedNodeId(null);
    reactFlowInstance.setCenter(0, 0, { duration: 400, zoom: 1 });
    setTimeout(() => setCenterExpanded(true), 100);
  }, [reactFlowInstance]);

  const handleCenterCollapse = useCallback(() => {
    setCenterExpanded(false);
  }, []);

  // Create center node on mount
  useEffect(() => {
    const centerNode: Node = {
      id: 'center',
      type: 'center',
      position: { x: -70, y: -24 }, // Offset so 140x48 pill is centered at origin
      draggable: false,
      selectable: false,
      deletable: false,
      connectable: false,
      data: {
        label: idea,
        isLoading,
        isExpanded: centerExpanded,
        onExpand: handleCenterExpand,
        onCollapse: handleCenterCollapse,
        floatingMessages,
        chatMessages: centerMessages,
        onSendMessage: handleCenterSendMessage,
        isChatLoading: isCenterChatLoading,
      },
      style: { cursor: 'default' },
    };

    setNodes(prev => {
      // Preserve branch nodes, update center
      const branchNodes = prev.filter(n => n.id !== 'center');
      return [centerNode, ...branchNodes];
    });
  }, [idea, isLoading, centerExpanded, floatingMessages, centerMessages, isCenterChatLoading, setNodes, handleCenterExpand, handleCenterCollapse, handleCenterSendMessage]);

  // Spawn branch nodes when branches arrive
  useEffect(() => {
    if (branches.length === 0 || hasSpawnedRef.current) return;
    hasSpawnedRef.current = true;

    const total = branches.length;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    branches.forEach((branch, index) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * 400;
      const y = Math.sin(angle) * 320;

      const color = BRANCH_COLORS[index % BRANCH_COLORS.length];

      newNodes.push({
        id: branch.id,
        type: 'branch',
        position: { x, y },
        data: {
          label: branch.label,
          description: branch.description,
          color,
          agentPersonality: branch.agentPersonality,
          rootIdea: idea,
          isExpanded: false,
          isDimmed: false,
          onExpand: () => handleBranchExpand(branch.id, x, y),
          onCollapse: () => setExpandedNodeId(null),
          spawnDelay: index * 100,
          agentThinking: undefined,
          agentStatus: 'idle' as const,
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

    // Wait for all spawn animations + render before fitting
    const maxSpawnDelay = (total - 1) * 100;
    setTimeout(() => {
      setNodes(prev => [...prev, ...newNodes]);
      setEdges(newEdges);
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.25, duration: 700, minZoom: 0.4, maxZoom: 0.85 });
      }, maxSpawnDelay + 300);
    }, 150);
  }, [branches, idea, setNodes, setEdges, reactFlowInstance]);

  // Handle branch node expand
  const handleBranchExpand = useCallback((nodeId: string, x: number, y: number) => {
    // Collapse center if expanded
    setCenterExpanded(false);
    reactFlowInstance.setCenter(x, y, { duration: 400, zoom: 1 });
    setTimeout(() => setExpandedNodeId(nodeId), 150);
  }, [reactFlowInstance]);

  // Update branch node data when expandedNodeId changes
  useEffect(() => {
    setNodes(nds =>
      nds.map(node => {
        if (node.type !== 'branch') return node;
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        return {
          ...node,
          data: {
            ...node.data,
            isExpanded: expandedNodeId === node.id,
            isDimmed: !!expandedNodeId && expandedNodeId !== node.id,
            onExpand: () => handleBranchExpand(node.id, nodeX, nodeY),
            onCollapse: () => setExpandedNodeId(null),
          },
        };
      })
    );
  }, [expandedNodeId, setNodes, handleBranchExpand]);

  // Handle note text change
  const handleNoteTextChange = useCallback((nodeId: string, text: string) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, text } } : n
    ));
  }, [setNodes]);

  // Double-click canvas pane to add a note
  const lastPaneClickRef = useRef<number>(0);
  const lastPaneClickPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPaneClickWithDoubleDetect = useCallback((event: React.MouseEvent) => {
    // Single-click: collapse expanded nodes
    if (expandedNodeId) setExpandedNodeId(null);
    if (centerExpanded) setCenterExpanded(false);

    const now = Date.now();
    const timeDiff = now - lastPaneClickRef.current;
    const posDiff = Math.abs(event.clientX - lastPaneClickPosRef.current.x) + Math.abs(event.clientY - lastPaneClickPosRef.current.y);

    if (timeDiff < 400 && posDiff < 10) {
      // Double-click detected — add note
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const noteId = `note-${Date.now()}`;
      const newNote: Node = {
        id: noteId,
        type: 'note',
        position,
        data: {
          text: '',
          onTextChange: handleNoteTextChange,
          nodeId: noteId,
        },
      };

      setNodes(prev => [...prev, newNote]);
      lastPaneClickRef.current = 0; // Reset to prevent triple-click
    } else {
      lastPaneClickRef.current = now;
      lastPaneClickPosRef.current = { x: event.clientX, y: event.clientY };
    }
  }, [expandedNodeId, centerExpanded, reactFlowInstance, setNodes, handleNoteTextChange]);

  // (pane click + double-click detection is handled above in onPaneClickWithDoubleDetect)

  return (
    <div className="w-full h-full">
      {/* Floating navbar */}
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
          <span className="text-[13px] text-[#888780] truncate max-w-[200px]">{idea}</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClickWithDoubleDetect}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: window.innerWidth / 2 - 70, y: window.innerHeight / 2 - 24, zoom: 0.75 }}
        nodesDraggable={!expandedNodeId && !centerExpanded}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'straight', style: EDGE_STYLE }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(200,196,188,0.4)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={(n) => n.data?.color || '#E8E4DC'}
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
