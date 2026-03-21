'use client';

import { Cluster, Node } from '@/lib/types';
import { calculateCentroid } from '@/lib/physics';
import { useMemo } from 'react';

interface ClusterLabelProps {
  cluster: Cluster;
  nodes: Node[];
  onClick?: (cluster: Cluster) => void;
}

export function ClusterLabel({ cluster, nodes, onClick }: ClusterLabelProps) {
  // Get cluster nodes
  const clusterNodes = useMemo(() => {
    return nodes.filter((n) => cluster.nodeIds.includes(n.id));
  }, [nodes, cluster.nodeIds]);

  // Calculate centroid position
  const position = useMemo(() => {
    const centroid = calculateCentroid(clusterNodes);
    // Offset label above the cluster
    return {
      x: centroid.x,
      y: centroid.y - 60,
    };
  }, [clusterNodes]);

  if (clusterNodes.length === 0) return null;

  return (
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      className="absolute pointer-events-auto"
    >
      <button
        onClick={() => onClick && onClick(cluster)}
        className="px-3 py-1.5 rounded-full bg-[#E7E3DC] border border-[#D4A857]/40
                   text-xs text-[#1A1A1A]/70 font-medium
                   hover:bg-[#D4A857]/20 hover:border-[#D4A857]/60 hover:text-[#1A1A1A]
                   transition-all duration-200 cursor-pointer
                   shadow-sm"
      >
        {cluster.label}
      </button>
    </div>
  );
}
