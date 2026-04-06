'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SelectedElement } from '../types';

export function useSelectionMode(onElementSelect?: (element: SelectedElement) => void) {
  const [selectionMode, setSelectionMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cleanupSelectionRef = useRef<(() => void) | null>(null);

  // Listen for element selection messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'vibe-element-selected') {
        onElementSelect?.(e.data.element as SelectedElement);
        setSelectionMode(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelect]);

  // Inject / remove selection mode script in iframe
  const injectSelectionMode = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.head) return;

    doc.getElementById('__vibe_sel')?.remove();
    cleanupSelectionRef.current?.();
    cleanupSelectionRef.current = null;

    const style = doc.createElement('style');
    style.id = '__vibe_sel';
    style.textContent = `
      * { cursor: crosshair !important; }
      *:hover { outline: 2px solid #006AFF !important; outline-offset: 2px; }
    `;
    doc.head.appendChild(style);

    const onClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const el = e.target as HTMLElement;
      window.parent.postMessage({
        type: 'vibe-element-selected',
        element: {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
          classes: Array.from(el.classList).slice(0, 6),
          outerHTMLSnippet: el.outerHTML.slice(0, 500),
        },
      }, '*');
    };

    doc.addEventListener('click', onClick, true);
    cleanupSelectionRef.current = () => {
      doc.getElementById('__vibe_sel')?.remove();
      doc.removeEventListener('click', onClick, true);
    };
  }, []);

  useEffect(() => {
    if (selectionMode) {
      injectSelectionMode();
    } else {
      cleanupSelectionRef.current?.();
      cleanupSelectionRef.current = null;
    }
    return () => {
      cleanupSelectionRef.current?.();
      cleanupSelectionRef.current = null;
    };
  }, [selectionMode, injectSelectionMode]);

  return { selectionMode, setSelectionMode, iframeRef, injectSelectionMode };
}
