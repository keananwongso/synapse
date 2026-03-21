'use client';

import { CornerRightUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAutoResizeTextarea } from '@/components/hooks/use-auto-resize-textarea';

interface InputBarProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  isProcessing?: boolean;
}

export function InputBar({
  onSubmit,
  placeholder = "What's on your mind?",
  isProcessing = false,
}: InputBarProps) {
  const [inputValue, setInputValue] = useState('');

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 52,
    maxHeight: 200,
  });

  // Focus shortcut: / key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== textareaRef.current) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [textareaRef]);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isProcessing) return;
    onSubmit(trimmed);
    setInputValue('');
    adjustHeight(true);
  };

  return (
    <div
      className="fixed bottom-8 z-50 pointer-events-auto"
      style={{ left: '50%', transform: 'translateX(-50%)', width: '576px', maxWidth: 'calc(100vw - 2rem)' }}
    >
      <div className="relative w-full flex flex-col gap-2">
        {/* Input container with glass morphism */}
        <div className={cn(
          'relative w-full rounded-3xl input-glow transition-all duration-300',
          'backdrop-blur-xl bg-[#F2EFE9]/85 border border-[#CFCBC3]',
          'shadow-lg shadow-black/5',
        )}>
          <textarea
            id="drift-input"
            placeholder={placeholder}
            ref={textareaRef}
            value={inputValue}
            disabled={isProcessing}
            autoFocus
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInputValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape') {
                textareaRef.current?.blur();
              }
            }}
            style={{
              minHeight: '52px',
              paddingLeft: '1.5rem',
              paddingRight: '3rem',
              paddingTop: '0.875rem',
              paddingBottom: '0.875rem',
            }}
            className="w-full rounded-3xl bg-transparent border-none focus:outline-none text-[#1A1A1A] text-sm placeholder:text-[#1A1A1A]/30 resize-none leading-[1.5] disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 transition-all duration-200',
              isProcessing
                ? 'bg-transparent'
                : 'bg-[#E7E3DC] hover:bg-[#D4A857]/20'
            )}
            type="button"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div
                className="w-4 h-4 bg-[#D4A857] rounded-sm animate-spin"
                style={{ animationDuration: '3s' }}
              />
            ) : (
              <CornerRightUp
                className={cn(
                  'w-4 h-4 transition-opacity text-[#1A1A1A]',
                  inputValue ? 'opacity-70' : 'opacity-20'
                )}
              />
            )}
          </button>
        </div>

        <p className="h-4 text-xs text-center text-[#1A1A1A]/35">
          {isProcessing
            ? 'AI is thinking...'
            : inputValue
            ? 'Enter to send · Shift+Enter for new line'
            : 'Press / to focus'}
        </p>
      </div>
    </div>
  );
}
