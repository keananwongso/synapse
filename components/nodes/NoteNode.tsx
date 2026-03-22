'use client';

import { Handle, Position } from 'reactflow';
import { useState, useRef, useEffect, useCallback } from 'react';

interface NoteNodeData {
  text: string;
  onTextChange: (id: string, text: string) => void;
  nodeId: string;
}

export function NoteNode({ data }: { data: NoteNodeData }) {
  const { text, onTextChange, nodeId } = data;
  const [isEditing, setIsEditing] = useState(!text);
  const [value, setValue] = useState(text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isEditing]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (value.trim()) {
      onTextChange(nodeId, value.trim());
    }
  }, [value, nodeId, onTextChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      handleBlur();
    }
  }, [handleBlur]);

  return (
    <div className="relative">
      <div
        className="node-spawn rounded-[16px] cursor-pointer relative overflow-hidden"
        style={{
          minWidth: 120,
          maxWidth: 200,
          padding: '10px 14px',
          background: '#fffef9',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.2s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)'; }}
        onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[12px] leading-[1.5] text-[#1a1a2e] outline-none resize-none"
            rows={2}
            placeholder="Type a note..."
            style={{ minWidth: 100 }}
          />
        ) : (
          <p className="text-[12px] leading-[1.5] text-[#3a3a3a]">
            {value || 'Empty note'}
          </p>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
    </div>
  );
}
