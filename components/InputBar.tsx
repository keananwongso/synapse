'use client';

import { useState, useRef, useEffect } from 'react';

interface InputBarProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  isProcessing?: boolean;
}

export function InputBar({
  onSubmit,
  placeholder = "What's on your mind?",
  isProcessing = false
}: InputBarProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus shortcut: / key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && !isProcessing) {
      onSubmit(trimmed);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/40
                   rounded-2xl px-5 py-3 shadow-2xl shadow-indigo-500/5
                   min-w-[400px] max-w-[500px]
                   focus-within:border-indigo-500/30 focus-within:shadow-indigo-500/10
                   transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-slate-200 text-sm
                       placeholder:text-slate-500 outline-none
                       disabled:opacity-50"
            autoFocus
            disabled={isProcessing}
          />

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-indigo-400">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              Processing...
            </div>
          )}
        </div>

        {/* Hint text */}
        {!value && !isProcessing && (
          <div className="mt-1 text-[10px] text-slate-600">
            Press <kbd className="px-1 py-0.5 bg-slate-800/50 rounded border border-slate-700/30">Enter</kbd> to send
            {' • '}
            <kbd className="px-1 py-0.5 bg-slate-800/50 rounded border border-slate-700/30">/</kbd> to focus
          </div>
        )}
      </div>
    </div>
  );
}
