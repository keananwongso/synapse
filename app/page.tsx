'use client';

import { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { InputBar } from '@/components/InputBar';
import { ActionPanel } from '@/components/ActionPanel';
import { Node, Connection, Cluster } from '@/lib/types';
import { usePhysics } from '@/hooks/usePhysics';
import { useAgentResults } from '@/hooks/useAgentResults';
import { generateId, debounce } from '@/lib/utils';
import { initializeNodePhysics } from '@/lib/physics';

export default function DriftPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [pan, setPan] = useState({ x: 400, y: 300 });
  const [zoom, setZoom] = useState(1);

  // Physics simulation
  const { wake } = usePhysics({
    nodes,
    connections,
    onUpdate: setNodes,
    enabled: true,
    pan,
    zoom,
  });

  // Listen for agent results via Realtime
  useAgentResults((nodeType, results) => {
    console.log('🎉 Agent results received:', nodeType, results);

    // Spawn nodes from results
    const newNodeData = results.map((result: any) => ({
      text: result.text,
      isAI: true,
      nodeType: nodeType as Node['nodeType'],
      metadata: result.metadata || {},
    }));

    spawnNodesFromChatbox(newNodeData);

    // Clear processing state
    setIsProcessing(false);
    setProcessingStatus('');
  });

  // Helper: Spawn nodes from chatbox position (bottom-center of viewport)
  const spawnNodesFromChatbox = useCallback(
    (nodeData: Array<{ text: string; isAI: boolean; nodeType: Node['nodeType']; metadata?: any }>) => {
      // Convert screen center to world coordinates using current pan/zoom
      const baseX = (window.innerWidth / 2 - pan.x) / zoom;
      const baseY = (window.innerHeight / 2 - pan.y) / zoom;

      const newNodes: Node[] = nodeData.map((data, index) => {
        // Add some spread so nodes don't spawn on top of each other
        const angle = (Math.PI * 2 * index) / nodeData.length;
        const spread = 80;
        const offsetX = Math.cos(angle) * spread;
        const offsetY = Math.sin(angle) * spread;

        // Add outward velocity so nodes drift away from origin
        const velocityStrength = 3;
        const vx = Math.cos(angle) * velocityStrength;
        const vy = Math.sin(angle) * velocityStrength;

        return initializeNodePhysics({
          id: generateId(),
          text: data.text,
          x: baseX + offsetX,
          y: baseY + offsetY,
          vx,
          vy,
          isAI: data.isAI,
          isDragging: false,
          nodeType: data.nodeType,
          metadata: data.metadata || {},
          relatedNodeIds: [],
        });
      });

      setNodes((prev) => [...prev, ...newNodes]);
      wake(); // Wake physics

      return newNodes;
    },
    [wake, pan, zoom]
  );

  // Handle chat input submission
  const handleChatSubmit = useCallback(
    async (input: string) => {
      setIsProcessing(true);
      setProcessingStatus('Understanding your request...');

      try {
        // Step 1: Process input to determine intent
        console.log('💬 Processing input:', input);
        const processResponse = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input,
            context: {
              nodeCount: nodes.length,
              topics: clusters.map((c) => c.label),
            },
          }),
        });

        if (!processResponse.ok) throw new Error('Failed to process input');

        const { action, parameters, summary } = await processResponse.json();

        console.log('🎯 Intent:', action, '|', summary);
        setProcessingStatus(summary);

        // Step 2: Execute the appropriate action
        if (action === 'brainstorm') {
          console.log('🧠 Brainstorming:', parameters.topic);
          setProcessingStatus('Dispatching brainstorm agent...');

          const brainstormResponse = await fetch('/api/ai/brainstorm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: parameters.topic,
              count: parameters.count || 3,
              focus: parameters.focus,
            }),
          });

          if (!brainstormResponse.ok) throw new Error('Brainstorm failed');

          const { taskId } = await brainstormResponse.json();
          console.log('📝 Task created:', taskId);
          setProcessingStatus('Waiting for agent results...');

          // Results will arrive via Realtime subscription (handled by useAgentResults hook)
        } else if (action === 'note') {
          // Simple note - just add as a thought node
          spawnNodesFromChatbox([
            {
              text: parameters.topic,
              isAI: false,
              nodeType: 'thought',
              metadata: {},
            },
          ]);

          // Clear processing state immediately for notes (no agent needed)
          setIsProcessing(false);
          setProcessingStatus('');
        } else if (action === 'research') {
          console.log('🔍 Researching:', parameters.topic);
          setProcessingStatus('Dispatching research agent...');

          const researchResponse = await fetch('/api/ai/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: parameters.topic,
              count: parameters.count || 3,
              focus: parameters.focus,
            }),
          });

          if (!researchResponse.ok) throw new Error('Research failed');

          const { taskId } = await researchResponse.json();
          console.log('📝 Task created:', taskId);
          setProcessingStatus('Waiting for agent results...');

          // Results will arrive via Realtime subscription (handled by useAgentResults hook)
        } else if (action === 'analyze') {
          // TODO: Implement analyze action (cluster existing nodes)
          console.log('🔬 Analyze not implemented yet');
        }

        console.log('✅ Task dispatched');
      } catch (error) {
        console.error('❌ Chat processing error:', error);
        setIsProcessing(false);
        setProcessingStatus('');
      }
      // Don't clear processing state in finally - useAgentResults will handle that when results arrive
    },
    [nodes, clusters, spawnNodesFromChatbox]
  );

  // Handle node drag (with optional throw velocity on release)
  const handleNodeDrag = useCallback(
    (id: string, x: number, y: number, isDragging: boolean, throwVx?: number, throwVy?: number) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id
            ? {
                ...node,
                x,
                y,
                isDragging,
                vx: isDragging ? 0 : (throwVx || 0),
                vy: isDragging ? 0 : (throwVy || 0),
              }
            : node
        )
      );

      if (!isDragging) {
        wake(); // Wake physics after drag ends
      }
    },
    [wake]
  );

  // Handle cluster click
  const handleClusterClick = useCallback((cluster: Cluster) => {
    setSelectedCluster(cluster);
  }, []);

  // Handle brainstorm action
  const handleBrainstorm = useCallback(async () => {
    if (!selectedCluster) return;

    const clusterNodes = nodes.filter((n) =>
      selectedCluster.nodeIds.includes(n.id)
    );

    console.log('🧠 Brainstorming for cluster:', selectedCluster.label);
    setIsProcessing(true);
    setProcessingStatus('Dispatching brainstorm agent...');

    try {
      const response = await fetch('/api/ai/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedCluster.label,
          count: 3,
          focus: clusterNodes.map((n) => n.text).join(', '),
        }),
      });

      if (!response.ok) throw new Error('Brainstorm failed');

      const { taskId } = await response.json();
      console.log('📝 Task created:', taskId);
      setProcessingStatus('Waiting for agent results...');

      // Results will arrive via Realtime subscription (handled by useAgentResults hook)
    } catch (error) {
      console.error('❌ Brainstorm error:', error);
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [selectedCluster, nodes]);

  return (
    <main className="w-screen h-screen overflow-hidden">
      {/* Canvas with nodes and connections */}
      <Canvas
        nodes={nodes}
        connections={connections}
        clusters={clusters}
        onNodeDrag={handleNodeDrag}
        onCanvasClick={() => setSelectedCluster(null)}
        onClusterClick={handleClusterClick}
        initialPan={pan}
        onPanChange={setPan}
        onZoomChange={setZoom}
      />

      {/* Input bar */}
      <InputBar
        onSubmit={handleChatSubmit}
        isProcessing={isProcessing}
        placeholder={
          isProcessing && processingStatus
            ? processingStatus
            : "What would you like to explore?"
        }
      />

      {/* Action panel */}
      <ActionPanel
        cluster={selectedCluster}
        nodes={nodes}
        onClose={() => setSelectedCluster(null)}
        onBrainstorm={handleBrainstorm}
        isLoading={{}}
      />

      {/* Status indicator */}
      {isProcessing && processingStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#E7E3DC]/90 backdrop-blur-sm
                        rounded-full border border-[#CFCBC3] text-xs text-[#1A1A1A]/70 flex items-center gap-2 animate-in">
          <div className="w-2 h-2 bg-[#D4A857] rounded-full animate-pulse" />
          {processingStatus}
        </div>
      )}
    </main>
  );
}
