'use client';

import { Handle, Position } from 'reactflow';

interface CenterNodeData {
  label: string;
  isLoading: boolean;
}

export function CenterNode({ data }: { data: CenterNodeData }) {
  return (
    <div
      className={`flex items-center justify-center bg-white border-[1.5px] border-[#d0cdc6] rounded-full px-6 ${data.isLoading ? 'pulse-loading' : ''}`}
      style={{ width: 190, height: 58 }}
    >
      <span className="text-[14px] font-medium text-[#1a1a2e] text-center truncate max-w-[150px]">
        {data.label}
      </span>
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
    </div>
  );
}
