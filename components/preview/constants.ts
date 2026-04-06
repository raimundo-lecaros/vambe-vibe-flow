import React from 'react';
import {
  Layout,
  Smartphone,
  Contrast,
  Sparkles,
  Type,
  MousePointer,
  Bug,
} from 'lucide-react';

export const AGENT_ORDER = ['Planner', 'Datos'];

export function sortAgents(agents: string[]): string[] {
  return [...agents].sort((a, b) => {
    const ai = AGENT_ORDER.indexOf(a);
    const bi = AGENT_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function basename(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  layout: React.createElement(Layout, { size: 11 }),
  mobile: React.createElement(Smartphone, { size: 11 }),
  contrast: React.createElement(Contrast, { size: 11 }),
  animation: React.createElement(Sparkles, { size: 11 }),
  content: React.createElement(Type, { size: 11 }),
  ux: React.createElement(MousePointer, { size: 11 }),
  error: React.createElement(Bug, { size: 11 }),
};

export const SEVERITY_COLOR = {
  critical:   { bg: '#2d0d0d', border: '#dc262644', text: '#f87171', dot: '#ef4444' },
  warning:    { bg: '#1a1200', border: '#92400e44', text: '#fbbf24', dot: '#f59e0b' },
  suggestion: { bg: '#0a0f1a', border: '#006AFF44', text: '#60a5fa', dot: '#3b82f6' },
};

export const C = {
  bg:      '#14141a',
  toolbar: '#1c1c22',
  panel:   '#222228',
  input:   '#2a2a32',
  border:  '#38383f',
  borderHi:'#52525c',
  text1:   '#f0f0f4',
  text2:   '#a0a0b0',
  text3:   '#68687a',
  accent:  '#006AFF',
} as const;
