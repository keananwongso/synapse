'use client';

import { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { InputBar } from '@/components/InputBar';
import { ActionPanel } from '@/components/ActionPanel';
import { Node, Connection, Cluster } from '@/lib/types';
import { usePhysics } from '@/hooks/usePhysics';
import { generateId, debounce } from '@/lib/utils';
import { initializeNodePhysics } from '@/lib/physics';

export default function DriftPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Physics simulation
  const { wake } = usePhysics({
    nodes,
    connections,
    onUpdate: setNodes,
    enabled: true,
  });

  // Helper: Spawn nodes from chatbox position (bottom-center of viewport)
  const spawnNodesFromChatbox = useCallback(
    (nodeData: Array<{ text: string; isAI: boolean; nodeType: Node['nodeType']; metadata?: any }>) => {
      // Chatbox is at bottom-center in screen coordinates
      // Convert to world coordinates (for now, just use center of viewport)
      const baseX = window.innerWidth / 2;
      const baseY = window.innerHeight - 150; // Above the chatbox

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
    [wake]
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

          const { ideas } = await brainstormResponse.json();

          // Spawn idea nodes from chatbox
          spawnNodesFromChatbox(
            ideas.map((idea: any) => ({
              text: idea.text,
              isAI: true,
              nodeType: 'ai_idea',
              metadata: { source: 'brainstorm', topic: parameters.topic },
            }))
          );
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
        } else if (action === 'research') {
          // TODO: Implement research action
          console.log('🔍 Research not implemented yet');
        } else if (action === 'analyze') {
          // TODO: Implement analyze action (cluster existing nodes)
          console.log('🔬 Analyze not implemented yet');
        }

        console.log('✅ Action complete');
      } catch (error) {
        console.error('❌ Chat processing error:', error);
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [nodes, clusters, spawnNodesFromChatbox]
  );

  // Handle node drag
  const handleNodeDrag = useCallback(
    (id: string, x: number, y: number, isDragging: boolean) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id
            ? { ...node, x, y, isDragging, vx: 0, vy: 0 }
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

    try {
      const response = await fetch('/api/ai/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterLabel: selectedCluster.label,
          thoughts: clusterNodes.map((n) => n.text),
          nodeIds: selectedCluster.nodeIds,
        }),
      });

      if (!response.ok) throw new Error('Brainstorm failed');

      const { ideas } = await response.json();

      console.log('✅ Generated', ideas.length, 'new ideas');

      // Add AI idea nodes
      const aiNodes: Node[] = ideas.map((idea: any) =>
        initializeNodePhysics({
          id: generateId(),
          text: idea.text,
          x: clusterNodes[0].x + (Math.random() - 0.5) * 200,
          y: clusterNodes[0].y + (Math.random() - 0.5) * 200,
          vx: 0,
          vy: 0,
          isAI: true,
          isDragging: false,
          nodeType: 'ai_idea',
          metadata: {},
          relatedNodeIds: idea.relatedNodeIds,
        })
      );

      setNodes((prev) => [...prev, ...aiNodes]);

      // Create connections to related nodes
      const newConnections: Connection[] = aiNodes.flatMap((aiNode) =>
        aiNode.relatedNodeIds.map((relatedId) => ({
          id: generateId(),
          from: aiNode.id,
          to: relatedId,
          strength: 0.7,
        }))
      );

      setConnections((prev) => [...prev, ...newConnections]);
      wake();
    } catch (error) {
      console.error('❌ Brainstorm error:', error);
    }
  }, [selectedCluster, nodes, wake]);

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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-950/60 backdrop-blur-sm
                        rounded-full border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2 animate-in">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          {processingStatus}
        </div>
      )}
    </main>
  );
}
