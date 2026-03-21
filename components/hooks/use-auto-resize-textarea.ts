'use client';

import { useRef, useCallback } from 'react';

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

export function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback((reset?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (reset) {
      textarea.style.height = `${minHeight}px`;
      return;
    }

    textarea.style.height = 'auto';
    const newHeight = Math.max(minHeight, textarea.scrollHeight);
    textarea.style.height = maxHeight
      ? `${Math.min(newHeight, maxHeight)}px`
      : `${newHeight}px`;
  }, [minHeight, maxHeight]);

  return { textareaRef, adjustHeight };
}
