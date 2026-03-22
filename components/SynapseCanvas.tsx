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
  EdgeProps,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  getStraightPath,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CenterNode } from './nodes/CenterNode';
import { BranchNode } from './nodes/BranchNode';
import { NoteNode } from './nodes/NoteNode';
import { DeliverableNode } from './nodes/DeliverableNode';


interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

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
  html?: string;
  type: string;
}

interface AgentState {
  branchId: string;
  status: 'idle' | 'thinking' | 'done';
  currentThinking: string;
  deliverables: Deliverable[];
}

interface OpenPanel {
  nodeId: string;
  title: string;
  summary: string;
  content: string;
  html?: string;
  type: 'doc' | 'mockup';
  color: string;
}

interface SynapseCanvasProps {
  idea: string;
  branches: Branch[];
  isLoading: boolean;
}

function PanelNode({ data }: { data: {
  title: string;
  summary: string;
  content: string;
  html?: string;
  type: 'doc' | 'mockup';
  color: string;
  onClose: () => void;
} }) {
  const { title, summary, content, html, type, color, onClose } = data;
  const isMockup = type === 'mockup';
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 420, h: 360 });
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    if (!isMockup && contentRef.current) {
      contentRef.current.innerHTML = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
    }
  }, [content, isMockup]);

  const darken = (hex: string) => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgb(${Math.round(r*0.65)},${Math.round(g*0.65)},${Math.round(b*0.65)})`;
  };
  const accent = darken(color);

  // Shared resize handler — pass dx/dy multipliers for each edge/corner
  const startResize = (e: React.MouseEvent, mx: number, my: number) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = (ev.clientX - resizeRef.current.startX) * mx;
      const dh = (ev.clientY - resizeRef.current.startY) * my;
      setSize({
        w: Math.max(280, resizeRef.current.startW + dw),
        h: Math.max(180, resizeRef.current.startH + dh),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Header height (~42) + summary (~28 if present) = offset for content area
  const headerH = 42 + (summary ? 28 : 0);
  const contentH = Math.max(60, size.h - headerH - 24); // 24 for padding

  return (
    <div
      className="node-spawn"
      style={{
        width: size.w,
        height: size.h,
        borderRadius: 16,
        backgroundColor: '#fff',
        border: `1.5px solid ${color}30`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />

      {/* Header */}
      <div
        style={{
          padding: '12px 14px 10px',
          borderBottom: `1px solid ${color}20`,
          background: `linear-gradient(135deg, #fff 0%, ${color}08 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase',
              backgroundColor: color, color: accent,
              padding: '2px 7px', borderRadius: 6,
            }}
          >
            {isMockup ? 'Site' : 'Doc'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{title}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            width: 24, height: 24, borderRadius: 8,
            border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#888780', fontSize: 15, lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid #f0eeea', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: '#888780', margin: 0 }}>{summary}</p>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {isMockup && html ? (
          <iframe
            srcDoc={html}
            sandbox="allow-scripts"
            style={{ width: '100%', height: '100%', minHeight: contentH, border: 'none', borderRadius: 10 }}
            title={title}
          />
        ) : (
          <div
            ref={contentRef}
            style={{ fontSize: 12, lineHeight: 1.7, color: '#2a2a3e' }}
          />
        )}
      </div>

      {/* Resize handles — nodrag class prevents React Flow from intercepting */}
      {/* Right edge */}
      <div
        className="nodrag"
        onMouseDown={e => startResize(e, 1, 0)}
        style={{ position: 'absolute', top: 0, right: -3, width: 6, height: '100%', cursor: 'ew-resize' }}
      />
      {/* Bottom edge */}
      <div
        className="nodrag"
        onMouseDown={e => startResize(e, 0, 1)}
        style={{ position: 'absolute', bottom: -3, left: 0, width: '100%', height: 6, cursor: 'ns-resize' }}
      />
      {/* Bottom-right corner */}
      <div
        className="nodrag"
        onMouseDown={e => startResize(e, 1, 1)}
        style={{
          position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, cursor: 'nwse-resize',
          borderBottomRightRadius: 16,
        }}
      />
    </div>
  );
}

function SkeletonNode({ data }: { data: { color: string } }) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
      <div
        className="node-spawn"
        style={{
          width: 160,
          padding: '10px 14px',
          background: 'linear-gradient(160deg, #ffffff 0%, #faf9f7 100%)',
          border: `1.5px dashed ${data.color}`,
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
          opacity: 0.6,
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <div className="skeleton-shimmer h-[14px] w-[40px] rounded" />
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: data.color }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-shimmer h-[10px] w-[80%]" />
          <div className="skeleton-shimmer h-[7px] w-[90%]" style={{ animationDelay: '0.1s' }} />
          <div className="skeleton-shimmer h-[7px] w-[70%]" style={{ animationDelay: '0.2s' }} />
          <div className="skeleton-shimmer h-[7px] w-[80%]" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </>
  );
}

function ThinkingEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <path id={id} d={edgePath} stroke="#C8C4BC" strokeWidth={1.5} strokeDasharray="6 4" fill="none" />
      {data?.isThinking && (
        <circle r={3} fill={data?.color ?? '#C8C4BC'} opacity={0.7}>
          <animateMotion dur="1.6s" repeatCount="indefinite">
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      )}
    </>
  );
}

const nodeTypes = {
  center: CenterNode,
  branch: BranchNode,
  note: NoteNode,
  deliverable: DeliverableNode,
  skeleton: SkeletonNode,
  panel: PanelNode,
};

const edgeTypes = {
  thinking: ThinkingEdge,
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
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  // Track open order so most-recently-opened panel is on top
  const [expandedNodeOrder, setExpandedNodeOrder] = useState<string[]>([]);
  const [openPanels, setOpenPanels] = useState<Map<string, OpenPanel>>(new Map());
  const hasSpawnedRef = useRef(false);
  const hasTriggeredAgentsRef = useRef(false);
  const nodesRef = useRef<Node[]>([]);
  const reactFlowInstance = useReactFlow();

  // Agent states — tracks thinking/status for each branch
  const [agentStates, setAgentStates] = useState<Map<string, AgentState>>(new Map());

  // Per-agent chat state
  const [agentMessages, setAgentMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [agentChatLoading, setAgentChatLoading] = useState<Map<string, boolean>>(new Map());

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
    const initialMessages = new Map<string, ChatMessage[]>();
    branches.forEach(b => {
      initialStates.set(b.id, {
        branchId: b.id,
        status: 'thinking',
        currentThinking: 'Starting up...',
        deliverables: [],
      });
      initialMessages.set(b.id, [{
        id: `init-${b.id}`,
        role: 'ai',
        text: `Hi! I'm your **${b.label}** agent. Ask me anything about this branch once I'm done thinking.`,
      }]);
    });
    setAgentStates(initialStates);
    setAgentMessages(initialMessages);

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

      const delivType = (deliv.type === 'mockup' ? 'mockup' : 'doc') as 'doc' | 'mockup';
      newNodes.push({
        id: nodeId,
        type: 'deliverable',
        position: { x, y },
        data: {
          title: deliv.title,
          summary: deliv.summary,
          content: deliv.content || '',
          html: deliv.html,
          type: delivType,
          color,
          isExpanded: false,
          isDimmed: false,
          onExpand: () => handleDeliverableExpand(nodeId, {
            nodeId,
            title: deliv.title,
            summary: deliv.summary,
            content: deliv.content || '',
            html: deliv.html,
            type: delivType,
            color,
          }),
          onCollapse: () => handleDeliverableExpand(nodeId),
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

  // Handle deliverable expand — spawns/removes a panel node on the canvas
  const handleDeliverableExpand = useCallback((nodeId: string, panelData?: OpenPanel) => {
    const panelNodeId = `panel-${nodeId}`;
    const panelEdgeId = `e-${nodeId}-${panelNodeId}`;

    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        // Collapsing — remove panel node + edge
        next.delete(nodeId);
        setExpandedNodeOrder(o => o.filter(id => id !== nodeId));
        setOpenPanels(p => { const n = new Map(p); n.delete(nodeId); return n; });
        setNodes(nds => nds.filter(n => n.id !== panelNodeId));
        setEdges(eds => eds.filter(e => e.id !== panelEdgeId));
      } else {
        // Expanding — spawn panel node near the deliverable chip
        next.add(nodeId);
        setExpandedNodeOrder(o => [...o.filter(id => id !== nodeId), nodeId]);
        if (panelData) {
          setOpenPanels(p => new Map(p).set(nodeId, panelData));

          // Find the deliverable chip position
          const delivNode = nodesRef.current.find(n => n.id === nodeId);
          if (delivNode) {
            // Place the panel to the right and slightly below the chip
            const px = delivNode.position.x + 160;
            const py = delivNode.position.y - 20;

            const panelNode: Node = {
              id: panelNodeId,
              type: 'panel',
              position: { x: px, y: py },
              data: {
                ...panelData,
                onClose: () => handleDeliverableExpand(nodeId),
              },
            };

            const panelEdge: Edge = {
              id: panelEdgeId,
              source: nodeId,
              target: panelNodeId,
              type: 'straight',
              style: { ...EDGE_STYLE, stroke: `${panelData.color}60` },
            };

            setNodes(nds => [...nds, panelNode]);
            setEdges(eds => [...eds, panelEdge]);
          }
        }
      }
      return next;
    });
  }, [setNodes, setEdges]);

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

  // Handle per-agent chat
  const handleAgentSendMessage = useCallback(async (branchId: string, text: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };

    setAgentMessages(prev => {
      const next = new Map(prev);
      next.set(branchId, [...(next.get(branchId) || []), userMsg]);
      return next;
    });
    setAgentChatLoading(prev => { const next = new Map(prev); next.set(branchId, true); return next; });

    try {
      const currentMessages = agentMessages.get(branchId) || [];
      const agentState = agentStates.get(branchId);
      const deliverablesContext = agentState?.deliverables.length
        ? `\n\nYour deliverables so far:\n${agentState.deliverables.map(d => `- ${d.title}: ${d.summary}`).join('\n')}`
        : '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...currentMessages, userMsg],
          agentPersonality: `You are the ${branch.label} expert agent in a brainstorming session about "${idea}". ${branch.agentPersonality}${deliverablesContext}\n\nBe conversational and concise (2-3 sentences). Help the user go deeper on this branch.`,
          nodeLabel: branch.label,
          rootIdea: idea,
        }),
      });

      if (res.ok) {
        const { reply } = await res.json();
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: reply };
        setAgentMessages(prev => {
          const next = new Map(prev);
          next.set(branchId, [...(next.get(branchId) || []), aiMsg]);
          return next;
        });
      }
    } catch (err) {
      console.error(`Agent ${branchId} chat error:`, err);
    } finally {
      setAgentChatLoading(prev => { const next = new Map(prev); next.set(branchId, false); return next; });
    }
  }, [branches, idea, agentMessages, agentStates]);

  // Handle center node expand
  const handleCenterExpand = useCallback(() => {
    // Do NOT dismiss the response card — the user should still see chat history
    setCenterExpanded(true);
  }, []);

  const handleCenterCollapse = useCallback(() => {
    setCenterExpanded(false);
  }, []);

  // Deep-dive panel state
  const [openPanelBranchId, setOpenPanelBranchId] = useState<string | null>(null);
  const branchExpandSavedRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Handle agent click — expand branch inline with chat, push deliverables outward
  const handleAgentClick = useCallback((branchId: string) => {
    setOpenPanelBranchId(prev => {
      const isClosing = prev === branchId;

      if (isClosing) {
        // Restore deliverable positions
        const saved = branchExpandSavedRef.current;
        if (saved.size > 0) {
          setNodes(nds => nds.map(n => {
            const pos = saved.get(n.id);
            return pos ? { ...n, position: pos } : n;
          }));
          branchExpandSavedRef.current = new Map();
        }
        return null;
      }

      // Opening — push this branch's deliverables outward so they don't overlap
      // Also restore any previously saved positions from another branch
      const prevSaved = branchExpandSavedRef.current;

      setNodes(nds => {
        // First restore any previously pushed nodes
        let restored = prevSaved.size > 0
          ? nds.map(n => {
              const pos = prevSaved.get(n.id);
              return pos ? { ...n, position: pos } : n;
            })
          : nds;

        const branchNode = restored.find(n => n.id === branchId);
        if (!branchNode) return restored;

        const bx = branchNode.position.x;
        const by = branchNode.position.y;
        const newSaved = new Map<string, { x: number; y: number }>();

        // The expanded branch card is ~280×200. Push deliverables that are too close.
        const expandedW = 300;
        const expandedH = 240;
        const minDistance = 180; // minimum distance from branch center

        restored = restored.map(n => {
          // Match deliverable nodes belonging to this branch
          if (n.type !== 'deliverable' || !n.id.includes(branchId)) return n;

          const dx = n.position.x - bx;
          const dy = n.position.y - by;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if node is within the expanded card bounding box or too close
          const withinX = n.position.x > bx - 40 && n.position.x < bx + expandedW;
          const withinY = n.position.y > by - 40 && n.position.y < by + expandedH;

          if ((withinX && withinY) || dist < minDistance) {
            newSaved.set(n.id, { x: n.position.x, y: n.position.y });
            // Push outward along the angle from branch to deliverable
            const angle = Math.atan2(dy || 1, dx || 1); // avoid zero
            const pushDist = Math.max(minDistance + 60, dist + 120);
            return {
              ...n,
              position: {
                x: bx + Math.cos(angle) * pushDist,
                y: by + Math.sin(angle) * pushDist,
              },
            };
          }
          return n;
        });

        branchExpandSavedRef.current = newSaved;
        return restored;
      });

      return branchId;
    });
  }, [setNodes]);

  // Handle note text change
  const handleNoteTextChange = useCallback((nodeId: string, text: string) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, text } } : n
    ));
  }, [setNodes]);

  // Spawn a note node attached to a parent node
  const spawnNoteFromNode = useCallback((parentId: string) => {
    const parentNode = nodesRef.current.find(n => n.id === parentId);
    if (!parentNode) return;

    const px = parentNode.position.x;
    const py = parentNode.position.y;

    // Place below-right of parent, with some random spread to avoid overlap
    const offsetX = 60 + Math.random() * 40;
    const offsetY = 80 + Math.random() * 40;
    const x = px + offsetX;
    const y = py + offsetY;

    const noteId = `note-${Date.now()}`;
    const newNote: Node = {
      id: noteId,
      type: 'note',
      position: { x, y },
      data: {
        text: '',
        onTextChange: handleNoteTextChange,
        nodeId: noteId,
      },
    };

    const newEdge: Edge = {
      id: `e-${parentId}-${noteId}`,
      source: parentId,
      target: noteId,
      type: 'straight',
      style: EDGE_STYLE,
    };

    setNodes(prev => [...prev, newNote]);
    setEdges(prev => [...prev, newEdge]);
  }, [handleNoteTextChange, setNodes, setEdges]);

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
        onAddNode: () => spawnNoteFromNode('center'),
      },
      style: { cursor: 'default' },
    };

    setNodes(prev => {
      const otherNodes = prev.filter(n => n.id !== 'center');
      return [centerNode, ...otherNodes];
    });
  }, [idea, isLoading, centerExpanded, floatingMessages, centerMessages, isCenterChatLoading, setNodes, handleCenterExpand, handleCenterCollapse, handleCenterSendMessage, responseCard, handleDismissResponse, spawnNoteFromNode]);

  // Spawn skeleton placeholder nodes while branches are loading
  const hasSpawnedSkeletonRef = useRef(false);
  useEffect(() => {
    if (!isLoading || hasSpawnedSkeletonRef.current || hasSpawnedRef.current) return;
    hasSpawnedSkeletonRef.current = true;

    const count = 5; // typical number of branches
    const skeletonNodes: Node[] = [];
    const skeletonEdges: Edge[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * 400;
      const y = Math.sin(angle) * 320;
      const id = `skeleton-${i}`;
      const color = BRANCH_COLORS[i % BRANCH_COLORS.length];

      skeletonNodes.push({
        id,
        type: 'skeleton',
        position: { x, y },
        draggable: false,
        selectable: false,
        data: { color },
      });

      skeletonEdges.push({
        id: `e-center-${id}`,
        source: 'center',
        target: id,
        type: 'thinking',
        data: { isThinking: true, color },
      });
    }

    setTimeout(() => {
      setNodes(prev => [...prev, ...skeletonNodes]);
      setEdges(skeletonEdges);
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.25, duration: 700, minZoom: 0.4, maxZoom: 0.85 });
      }, 350);
    }, 150);
  }, [isLoading, setNodes, setEdges, reactFlowInstance]);

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
          onAddNode: () => spawnNoteFromNode(branch.id),
          spawnDelay: index * 100,
          agentThinking: undefined,
          agentStatus: 'idle' as const,
          isExpanded: false,
          messages: [],
          onSendMessage: (_: string) => {},
          isChatLoading: false,
        },
      });

      newEdges.push({
        id: `e-center-${branch.id}`,
        source: 'center',
        target: branch.id,
        type: 'thinking',
        data: { isThinking: true, color },
      });
    });

    const maxSpawnDelay = (total - 1) * 100;
    setTimeout(() => {
      setNodes(prev => [...prev.filter(n => !n.id.startsWith('skeleton-')), ...newNodes]);
      setEdges(newEdges);
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.25, duration: 700, minZoom: 0.4, maxZoom: 0.85 });
      }, maxSpawnDelay + 300);
    }, 150);
  }, [branches, idea, setNodes, setEdges, reactFlowInstance, handleAgentClick, spawnNoteFromNode]);

  // Update branch node data when agentStates or expandedNodeIds changes
  useEffect(() => {
    // Sync traveling dot on center-to-branch edges
    setEdges(eds => eds.map(edge => {
      if (edge.id.startsWith('e-center-')) {
        const agentState = agentStates.get(edge.target);
        return {
          ...edge,
          data: {
            ...edge.data,
            isThinking: agentState?.status === 'thinking',
          },
        };
      }
      return edge;
    }));

    setNodes(nds =>
      nds.map(node => {
        if (node.type === 'branch') {
          const agentState = agentStates.get(node.id);
          return {
            ...node,
            data: {
              ...node.data,
              isDimmed: false,
              onClickAgent: () => handleAgentClick(node.id),
              onAddNode: () => spawnNoteFromNode(node.id),
              agentThinking: agentState?.currentThinking,
              agentStatus: agentState?.status || 'idle',
              isExpanded: openPanelBranchId === node.id,
              messages: agentMessages.get(node.id) || [],
              onSendMessage: (text: string) => handleAgentSendMessage(node.id, text),
              isChatLoading: agentChatLoading.get(node.id) || false,
            },
          };
        }
        if (node.type === 'deliverable') {
          return {
            ...node,
            data: {
              ...node.data,
              isExpanded: expandedNodeIds.has(node.id),
              isDimmed: false,
              onExpand: () => handleDeliverableExpand(node.id, {
                nodeId: node.id,
                title: node.data.title,
                summary: node.data.summary || '',
                content: node.data.content || '',
                html: node.data.html,
                type: node.data.type,
                color: node.data.color,
              }),
              onCollapse: () => handleDeliverableExpand(node.id),
            },
          };
        }
        if (node.type === 'panel') {
          // Extract the deliverable nodeId from the panel node id (panel-deliv-...)
          const delivNodeId = node.id.replace(/^panel-/, '');
          return {
            ...node,
            data: {
              ...node.data,
              onClose: () => handleDeliverableExpand(delivNodeId),
            },
          };
        }
        return node;
      })
    );
  }, [expandedNodeIds, expandedNodeOrder, agentStates, openPanelBranchId, agentMessages, agentChatLoading, setNodes, setEdges, handleAgentClick, handleDeliverableExpand, handleAgentSendMessage, spawnNoteFromNode]);

  // Double-click canvas pane to add a note
  const lastPaneClickRef = useRef<number>(0);
  const lastPaneClickPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onPaneClickWithDoubleDetect = useCallback((event: React.MouseEvent) => {
    // Single-click: collapse center chat if open
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
  }, [centerExpanded, responseCard, handleDismissResponse, reactFlowInstance, setNodes, handleNoteTextChange]);

  return (
    <div className="w-full h-full">

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClickWithDoubleDetect}
        onNodeClick={(_, node) => {
          if (node.type === 'branch') {
            handleAgentClick(node.id);
          }
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 0.75 }}
        nodesDraggable={!centerExpanded}
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
