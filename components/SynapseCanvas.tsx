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
import { DeliverableNode } from './nodes/DeliverableNode';
import { AgentDetailPanel } from './AgentDetailPanel';


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

interface Deliverable {
  title: string;
  summary: string;
  content: string;
  type: string;
}

interface AgentState {
  branchId: string;
  status: 'idle' | 'thinking' | 'done';
  currentThinking: string;
  deliverables: Deliverable[];
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
  deliverable: DeliverableNode,
};

const EDGE_STYLE = { stroke: '#C8C4BC', strokeWidth: 1.5, strokeDasharray: '6 4' };

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

  // Keep a ref in sync so we can read current nodes without setState callbacks
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const hasSpawnedRef = useRef(false);
  const hasTriggeredAgentsRef = useRef(false);
  const nodesRef = useRef<Node[]>([]);
  const reactFlowInstance = useReactFlow();

  // Agent states — tracks thinking/status for each branch
  const [agentStates, setAgentStates] = useState<Map<string, AgentState>>(new Map());

  // Orchestrator chat state
  const [centerMessages, setCenterMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', text: `Let's work on "${idea}". I'm breaking this into branches for you...` },
  ]);
  const [floatingMessages, setFloatingMessages] = useState<ChatMessage[]>([
    { id: 'float-1', role: 'ai', text: `Breaking "${idea}" into branches...` },
  ]);
  const [isCenterChatLoading, setIsCenterChatLoading] = useState(false);
  const [centerExpanded, setCenterExpanded] = useState(false);

  // Orchestrator response card
  const [responseCard, setResponseCard] = useState<string | null>(null);
  const savedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // ─── AUTO-TRIGGER AGENTS ───
  // When branches arrive, automatically start each agent thinking
  useEffect(() => {
    if (branches.length === 0 || hasTriggeredAgentsRef.current) return;
    hasTriggeredAgentsRef.current = true;

    // Initialize agent states
    const initialStates = new Map<string, AgentState>();
    branches.forEach(b => {
      initialStates.set(b.id, {
        branchId: b.id,
        status: 'thinking',
        currentThinking: 'Starting up...',
        deliverables: [],
      });
    });
    setAgentStates(initialStates);

    // Stagger agent starts
    branches.forEach((branch, index) => {
      setTimeout(() => {
        triggerAgent(branch, index);
      }, index * 800 + 1500); // stagger + wait for spawn animation
    });
  }, [branches]);

  // Trigger a single agent
  const triggerAgent = useCallback(async (branch: Branch, colorIndex: number) => {
    const thinkingSteps = [
      `Analyzing ${branch.label.toLowerCase()}...`,
      'Gathering insights...',
      'Preparing findings...',
    ];

    // Simulate thinking steps with delays
    for (let i = 0; i < thinkingSteps.length; i++) {
      await new Promise(r => setTimeout(r, 1200));

      const step = thinkingSteps[i];

      // Update agent thinking status
      setAgentStates(prev => {
        const next = new Map(prev);
        const state = next.get(branch.id);
        if (state) {
          next.set(branch.id, { ...state, currentThinking: step });
        }
        return next;
      });

      // (Thinking now shown above each agent's node — not above center)

    }

    // Call the API
    try {
      const res = await fetch('/api/agent-think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchLabel: branch.label,
          branchDescription: branch.description,
          agentPersonality: branch.agentPersonality,
          rootIdea: idea,
        }),
      });

      if (!res.ok) throw new Error('Agent think failed');
      const data = await res.json();

      // Show real thinking steps from API
      for (const step of data.thinkingSteps) {
        setAgentStates(prev => {
          const next = new Map(prev);
          const state = next.get(branch.id);
          if (state) {
            next.set(branch.id, { ...state, currentThinking: step });
          }
          return next;
        });

        // (Thinking steps are rendered above each BranchNode directly)


        await new Promise(r => setTimeout(r, 1000));
      }

      // Mark agent as done
      setAgentStates(prev => {
        const next = new Map(prev);
        const state = next.get(branch.id);
        if (state) {
          next.set(branch.id, {
            ...state,
            status: 'done',
            currentThinking: '',
            deliverables: data.deliverables || [],
          });
        }
        return next;
      });

      // Spawn deliverable nodes
      const color = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];
      spawnDeliverableNodes(branch.id, data.deliverables || [], color);

      // Update center message
      const delivCount = data.deliverables?.length || 0;
      const msg: ChatMessage = {
        id: `center-${Date.now()}`,
        role: 'ai',
        text: `${branch.label} agent finished — produced ${delivCount} deliverable${delivCount !== 1 ? 's' : ''}.`,
      };
      // After all agents are done, invite the user to interact via center pill
      const allDone = !Array.from(agentStates.values()).some(s => s.status !== 'done');
      if (allDone || [...agentStates.entries()].filter(([,s]) => s.status !== 'done').length <= 1) {
        setFloatingMessages([{
          id: `float-${Date.now()}`,
          role: 'ai',
          text: 'All done — ask me anything about your plan ↓',
        }]);
      }

    } catch (err) {
      console.error(`Agent ${branch.label} error:`, err);
      setAgentStates(prev => {
        const next = new Map(prev);
        const state = next.get(branch.id);
        if (state) {
          next.set(branch.id, { ...state, status: 'done', currentThinking: 'Error occurred' });
        }
        return next;
      });
    }
  }, [idea]);

  // Track which branches already have deliverables spawned
  const spawnedDeliverablesRef = useRef<Set<string>>(new Set());

  // Spawn deliverable nodes around a branch — no nested state setters
  const spawnDeliverableNodes = useCallback((branchId: string, deliverables: Deliverable[], color: string) => {
    // Prevent double-spawning
    if (spawnedDeliverablesRef.current.has(branchId)) return;
    spawnedDeliverablesRef.current.add(branchId);

    // Read current node positions from ref (not from state setter)
    const branchNode = nodesRef.current.find(n => n.id === branchId);
    if (!branchNode) return;

    const bx = branchNode.position.x;
    const by = branchNode.position.y;
    const outwardAngle = Math.atan2(by, bx);
    const timestamp = Date.now();

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    deliverables.forEach((deliv, i) => {
      const spreadRange = Math.PI * 0.45;
      const offset = deliverables.length === 1
        ? 0
        : ((i / (deliverables.length - 1)) - 0.5) * spreadRange;
      const angle = outwardAngle + offset;
      const radius = 220;
      const x = bx + Math.cos(angle) * radius;
      const y = by + Math.sin(angle) * radius;
      const nodeId = `deliv-${branchId}-${i}-${timestamp}`;

      newNodes.push({
        id: nodeId,
        type: 'deliverable',
        position: { x, y },
        data: {
          title: deliv.title,
          summary: deliv.summary,
          content: deliv.content,
          type: deliv.type,
          color,
          isExpanded: false,
          isDimmed: false,
          onExpand: () => handleDeliverableExpand(nodeId, x, y),
          onCollapse: () => setExpandedNodeId(null),
        },
      });

      newEdges.push({
        id: `e-${branchId}-${nodeId}`,
        source: branchId,
        target: nodeId,
        type: 'straight',
        style: { ...EDGE_STYLE, stroke: `${color}80` },
      });
    });

    // Flat calls — no nesting
    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => {
      // Deduplicate by id to be safe
      const existingIds = new Set(prev.map(e => e.id));
      const unique = newEdges.filter(e => !existingIds.has(e.id));
      return [...prev, ...unique];
    });
  }, [setNodes, setEdges]);

  // Handle deliverable expand
  const handleDeliverableExpand = useCallback((nodeId: string, x: number, y: number) => {
    setCenterExpanded(false);
    setExpandedNodeId(nodeId);
  }, []);

  // Update floating message when branches arrive
  useEffect(() => {
    if (branches.length > 0 && !hasTriggeredAgentsRef.current) {
      const branchNames = branches.map(b => b.label).join(', ');
      const msg: ChatMessage = {
        id: `float-${Date.now()}`,
        role: 'ai',
        text: `Setting up ${branches.length} agents: ${branchNames}...`,
      };
      setFloatingMessages([msg]);
      setCenterMessages(prev => [...prev, msg]);
    }
  }, [branches]);

  // Push nodes away from the response card zone, save original positions
  const pushNodesForCard = useCallback(() => {
    // The chat card is 480px wide centered at flow x=0 (center node is at x=-70 with width 140).
    // Card spans: x=[-70 + (-170)] = -240 to -240+480 = 240 in flow coords.
    // Pill is 460px wide centered at flow x=0 → y goes from ~-24 to ~-430 above it.
    const cardRect = { x: -240, y: -450, width: 480, height: 450 };
    const padding = 30;

    setNodes(nds => {
      const saved = new Map<string, { x: number; y: number }>();
      const pushVectors = new Map<string, { dx: number; dy: number }>();

      // 1. Calculate safe push vectors per branch cluster
      nds.forEach(node => {
        if (node.type === 'branch') {
          const branchId = node.id;
          const deliverables = nds.filter(n => n.type === 'deliverable' && n.id.includes(branchId));
          const cluster = [node, ...deliverables];
          
          let overlaps = false;
          let minX = Infinity, maxX = -Infinity, minY = Infinity;
          
          cluster.forEach(gn => {
            const nx = gn.position.x; const ny = gn.position.y;
            const nodeW = 180; const nodeH = 60;
            if (nx + nodeW > cardRect.x - padding && nx < cardRect.x + cardRect.width + padding &&
                ny + nodeH > cardRect.y - padding && ny < cardRect.y + cardRect.height + padding) {
              overlaps = true;
            }
            minX = Math.min(minX, nx);
            maxX = Math.max(maxX, nx + nodeW);
            minY = Math.min(minY, ny);
          });

          if (overlaps) {
            const bx = node.position.x;
            const by = node.position.y;
            let dx = 0;
            let dy = 0;

            if (by > -60) {
              // It's mostly below the text box. Push it down more.
              dy = 120;
              dx = (bx < 0) ? -80 : 80; 
            } else {
              // Push it cleanly to the side to avoid hanging above the response
              if (bx < 0) {
                // Shift left so cluster right bounds clear the left of the card
                const requiredDx = (cardRect.x - padding) - maxX;
                dx = Math.min(-140, requiredDx);
              } else {
                // Shift right so cluster left bounds clear the right of the card
                const requiredDx = (cardRect.x + cardRect.width + padding) - minX;
                dx = Math.max(140, requiredDx);
              }
            }
            pushVectors.set(branchId, { dx, dy });
          }
        }
      });

      if (pushVectors.size === 0) return nds;

      const updated = nds.map(node => {
        if (node.id === 'center' || node.type === 'note') return node;

        let pushV = { dx: 0, dy: 0 };
        if (node.type === 'branch' && pushVectors.has(node.id)) {
          pushV = pushVectors.get(node.id)!;
        } else if (node.type === 'deliverable') {
          // Node IDs are 'deliv-{branchId}-{i}-{timestamp}'
          // branchId itself might contain dashes so strip 'deliv-' prefix, then
          // try each progressively shorter suffix until we find a known branch.
          const withoutPrefix = node.id.replace(/^deliv-/, '');
          const subParts = withoutPrefix.split('-');
          for (let k = subParts.length - 1; k >= 1; k--) {
            const candidateId = subParts.slice(0, k).join('-');
            if (pushVectors.has(candidateId)) {
              pushV = pushVectors.get(candidateId)!;
              break;
            }
          }
        }

        if (pushV.dx !== 0 || pushV.dy !== 0) {
          saved.set(node.id, { x: node.position.x, y: node.position.y });
          return {
            ...node,
            position: {
              x: node.position.x + pushV.dx,
              y: node.position.y + pushV.dy
            }
          };
        }
        return node;
      });

      // Merge with any previously saved positions (first-save wins)
      const merged = new Map([...saved, ...savedPositionsRef.current]);
      savedPositionsRef.current = merged;
      return updated;
    });
  }, [setNodes]);

  // Restore nodes to saved positions when card closes
  const restoreNodes = useCallback(() => {
    const saved = savedPositionsRef.current;
    if (saved.size === 0) return;

    setNodes(nds =>
      nds.map(node => {
        const pos = saved.get(node.id);
        if (pos) {
          return { ...node, position: pos };
        }
        return node;
      })
    );
    savedPositionsRef.current = new Map();
  }, [setNodes]);

  // Dismiss response card and restore nodes
  const handleDismissResponse = useCallback(() => {
    setResponseCard(null);
    restoreNodes();
  }, [restoreNodes]);

  // Handle orchestrator chat messages
  const handleCenterSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setCenterMessages(prev => [...prev, userMsg]);
    setIsCenterChatLoading(true);
    
    // Instantly pop up the chat panel and push nodes aside while we wait
    setResponseCard('thinking...');
    setTimeout(() => pushNodesForCard(), 50);

    try {
      const agentContext = Array.from(agentStates.entries()).map(([id, state]) => {
        const branch = branches.find(b => b.id === id);
        return `${branch?.label || id}: ${state.status}${state.deliverables.length > 0 ? ` (${state.deliverables.length} deliverables)` : ''}`;
      }).join('\n');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...centerMessages, userMsg],
          agentPersonality: `You are the central orchestrator for a brainstorming session about "${idea}". You have visibility into all agents:\n${agentContext}\n\nBe conversational, concise (2-3 sentences). Help the user understand the big picture. When they give new context, suggest which agents/branches might be affected.`,
          nodeLabel: idea,
          rootIdea: idea,
        }),
      });

      if (res.ok) {
        const { reply } = await res.json();
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: reply };
        setCenterMessages(prev => [...prev, aiMsg]);
        setResponseCard(reply);
        setTimeout(() => pushNodesForCard(), 50);
      }
    } catch (err) {
      console.error('Center chat error:', err);
    } finally {
      setIsCenterChatLoading(false);
    }
  }, [centerMessages, idea, agentStates, branches, pushNodesForCard]);

  // Handle center node expand
  const handleCenterExpand = useCallback(() => {
    setExpandedNodeId(null);
    // Do NOT dismiss the response card — the user should still see chat history
    setCenterExpanded(true);
  }, []);

  const handleCenterCollapse = useCallback(() => {
    setCenterExpanded(false);
  }, []);

  // Deep-dive panel state
  const [openPanelBranchId, setOpenPanelBranchId] = useState<string | null>(null);

  // Handle agent click — open side panel
  const handleAgentClick = useCallback((branchId: string) => {
    setOpenPanelBranchId(prev => prev === branchId ? null : branchId);
  }, []);

  // Create center node on mount + keep it updated
  useEffect(() => {
    const centerNode: Node = {
      id: 'center',
      type: 'center',
      position: { x: -70, y: -24 },
      draggable: false,
      selectable: true,
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
        responseCard,
        onDismissResponse: handleDismissResponse,
      },
      style: { cursor: 'default' },
    };

    setNodes(prev => {
      const otherNodes = prev.filter(n => n.id !== 'center');
      return [centerNode, ...otherNodes];
    });
  }, [idea, isLoading, centerExpanded, floatingMessages, centerMessages, isCenterChatLoading, setNodes, handleCenterExpand, handleCenterCollapse, handleCenterSendMessage, responseCard, handleDismissResponse]);

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
          isDimmed: false,
          onClickAgent: () => handleAgentClick(branch.id),
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

    const maxSpawnDelay = (total - 1) * 100;
    setTimeout(() => {
      setNodes(prev => [...prev, ...newNodes]);
      setEdges(newEdges);
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.25, duration: 700, minZoom: 0.4, maxZoom: 0.85 });
      }, maxSpawnDelay + 300);
    }, 150);
  }, [branches, idea, setNodes, setEdges, reactFlowInstance, handleAgentClick]);

  // Update branch node data when agentStates or expandedNodeId changes
  useEffect(() => {
    setNodes(nds =>
      nds.map(node => {
        if (node.type === 'branch') {
          const agentState = agentStates.get(node.id);
          return {
            ...node,
            data: {
              ...node.data,
              isDimmed: !!expandedNodeId && expandedNodeId !== node.id,
              onClickAgent: () => handleAgentClick(node.id),
              agentThinking: agentState?.currentThinking,
              agentStatus: agentState?.status || 'idle',
            },
          };
        }
        if (node.type === 'deliverable') {
          const nodeX = node.position.x;
          const nodeY = node.position.y;
          return {
            ...node,
            data: {
              ...node.data,
              isExpanded: expandedNodeId === node.id,
              isDimmed: !!expandedNodeId && expandedNodeId !== node.id,
              onExpand: () => handleDeliverableExpand(node.id, nodeX, nodeY),
              onCollapse: () => setExpandedNodeId(null),
            },
          };
        }
        return node;
      })
    );
  }, [expandedNodeId, agentStates, setNodes, handleAgentClick, handleDeliverableExpand]);

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
      lastPaneClickRef.current = 0;
    } else {
      lastPaneClickRef.current = now;
      lastPaneClickPosRef.current = { x: event.clientX, y: event.clientY };
    }
  }, [expandedNodeId, centerExpanded, responseCard, handleDismissResponse, reactFlowInstance, setNodes, handleNoteTextChange]);

  return (
    <div className="w-full h-full">

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClickWithDoubleDetect}
        onNodeClick={(_, node) => {
          if (node.id === 'center') {
            if (centerExpanded) handleCenterCollapse();
            else handleCenterExpand();
          } else if (node.type === 'branch') {
            handleAgentClick(node.id);
          } else if (node.type === 'deliverable') {
            const isExp = expandedNodeId === node.id;
            if (isExp) setExpandedNodeId(null);
            else handleDeliverableExpand(node.id, node.position.x, node.position.y);
          }
        }}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: window.innerWidth / 2 - 70, y: window.innerHeight / 2 - 24, zoom: 0.75 }}
        nodesDraggable={!expandedNodeId && !centerExpanded}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
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

      {/* Agent deep-dive panel */}
      {openPanelBranchId && (() => {
        const branch = branches.find(b => b.id === openPanelBranchId);
        const agentState = agentStates.get(openPanelBranchId);
        const colorIndex = branches.findIndex(b => b.id === openPanelBranchId);
        const color = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];

        if (!branch) return null;

        return (
          <AgentDetailPanel
            label={branch.label}
            color={color}
            status={agentState?.status || 'idle'}
            currentThinking={agentState?.currentThinking || ''}
            deliverables={agentState?.deliverables || []}
            onClose={() => setOpenPanelBranchId(null)}
          />
        );
      })()}
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
