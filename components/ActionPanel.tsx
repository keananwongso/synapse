'use client';

import { Cluster, Node } from '@/lib/types';
import { X } from 'lucide-react';

interface ActionPanelProps {
  cluster: Cluster | null;
  nodes: Node[];
  onClose: () => void;
  onBrainstorm?: () => void;
  onResearch?: () => void;
  onWrite?: () => void;
  onMockup?: () => void;
  isLoading?: {
    brainstorm?: boolean;
    research?: boolean;
    write?: boolean;
    mockup?: boolean;
  };
}

export function ActionPanel({
  cluster,
  nodes,
  onClose,
  onBrainstorm,
  onResearch,
  onWrite,
  onMockup,
  isLoading = {},
}: ActionPanelProps) {
  if (!cluster) return null;

  const clusterNodes = nodes.filter((n) => cluster.nodeIds.includes(n.id));

  return (
    <div
      className="fixed right-0 top-0 h-full w-[360px] bg-[#F2EFE9]/95 backdrop-blur-xl
                 border-l border-[#CFCBC3] shadow-2xl shadow-black/10
                 z-50 overflow-y-auto
                 animate-in slide-in-from-right duration-250"
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#F2EFE9]/95 backdrop-blur-xl border-b border-[#CFCBC3] p-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">{cluster.label}</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{clusterNodes.length} thoughts</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#E7E3DC] rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-[#1A1A1A]/50" />
        </button>
      </div>

      {/* Thoughts */}
      <div className="p-4 space-y-2">
        <h3 className="text-xs font-medium text-[#1A1A1A]/40 uppercase tracking-wider mb-2">
          Related Thoughts
        </h3>
        {clusterNodes.map((node) => (
          <div
            key={node.id}
            className="p-3 bg-[#E7E3DC]/50 rounded-lg border border-[#CFCBC3] text-sm text-[#1A1A1A]/80"
          >
            {node.text}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <h3 className="text-xs font-medium text-[#1A1A1A]/40 uppercase tracking-wider mb-2">
          Actions
        </h3>

        <ActionButton
          onClick={onBrainstorm}
          isLoading={isLoading.brainstorm}
          icon="🧠"
          label="Brainstorm More Ideas"
          description="AI generates related ideas"
        />

        <ActionButton
          onClick={onResearch}
          isLoading={isLoading.research}
          icon="🔍"
          label="Research This"
          description="Find facts and insights"
        />

        <ActionButton
          onClick={onWrite}
          isLoading={isLoading.write}
          icon="📝"
          label="Draft Document"
          description="Create structured content"
        />

        <ActionButton
          onClick={onMockup}
          isLoading={isLoading.mockup}
          icon="🎨"
          label="Generate Mockup"
          description="Visualize as UI design"
        />
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
  icon: string;
  label: string;
  description: string;
}

function ActionButton({ onClick, isLoading, icon, label, description }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="w-full p-3 bg-[#E7E3DC]/60 hover:bg-[#D4A857]/10
                 rounded-lg border border-[#CFCBC3] hover:border-[#D4A857]/40
                 text-left transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed
                 group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-[#1A1A1A] group-hover:text-[#1A1A1A]">
            {isLoading ? 'Processing...' : label}
          </div>
          <div className="text-xs text-[#1A1A1A]/40 mt-0.5">{description}</div>
        </div>
      </div>
    </button>
  );
}
