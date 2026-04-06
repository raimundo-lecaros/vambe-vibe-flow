'use client';

import React from 'react';
import { CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { basename } from './constants';

interface AgentNodeProps {
  agent: string;
  status: 'running' | 'done' | 'error';
  files?: string[];
  log?: string;
  expanded: boolean;
  onToggle: () => void;
  logRef?: React.RefObject<HTMLDivElement | null> | null;
}

const STATUS_COLORS = {
  done:    { text: '#4ade80', bg: '#0a1a0a', border: '#16a34a28' },
  error:   { text: '#f87171', bg: '#1a0a0a', border: '#dc262628' },
  running: { text: '#93bbff', bg: '#0a0f1a', border: '#006AFF28' },
};

export default function AgentNode({ agent, status, files, log, expanded, onToggle, logRef }: AgentNodeProps) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.running;

  return (
    <div
      className="rounded-lg border transition-colors"
      style={{ background: colors.bg, borderColor: colors.border, animation: 'fadeSlide 0.2s ease' }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {status === 'done'    && <CheckCircle size={13} className="text-green-400" />}
          {status === 'error'   && <X size={13} className="text-red-400" />}
          {status === 'running' && (
            <span
              className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent inline-block"
              style={{ animation: 'spin 0.8s linear infinite' }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium" style={{ color: colors.text }}>{agent}</span>
            {status === 'running' && (
              <span className="text-[10px]" style={{ color: '#4b5563' }}>generando...</span>
            )}
          </div>
          {files && files.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {files.map((f) => (
                <span
                  key={f}
                  className="text-[10px] font-mono px-1 py-px rounded"
                  style={{ background: '#1a2a1a', color: '#86efac', border: '1px solid #16a34a22' }}
                >
                  {basename(f)}
                </span>
              ))}
            </div>
          )}
        </div>

        {(log || status === 'running') && (
          <button
            onClick={onToggle}
            className="shrink-0 transition-colors"
            style={{ color: '#3f3f46' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#71717a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#3f3f46'; }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {expanded && (
        <div ref={logRef} className="max-h-40 overflow-y-auto px-3 pb-3 border-t border-zinc-800 pt-2">
          <pre className="text-[9px] font-mono text-zinc-600 whitespace-pre-wrap break-all leading-relaxed">
            {log ?? (status === 'running' ? 'Conectando con Claude...' : '')}
          </pre>
        </div>
      )}
    </div>
  );
}
