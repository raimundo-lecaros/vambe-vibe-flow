'use client';

import React, { useRef, useEffect } from 'react';
import { CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { basename } from './constants';

interface AgentProgressProps {
  agents: string[];
  agentStatuses: Record<string, 'running' | 'done' | 'error'>;
  agentFiles: Record<string, string[]>;
  agentLogs: Record<string, string>;
  genStatus: string;
  expandedAgent: string | null;
  setExpandedAgent: (agent: string | null) => void;
}

export default function AgentProgress({
  agents,
  agentStatuses,
  agentFiles,
  agentLogs,
  genStatus,
  expandedAgent,
  setExpandedAgent,
}: AgentProgressProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const doneCount = Object.values(agentStatuses).filter((s) => s === 'done').length;
  const totalCount = agents.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [agentLogs[expandedAgent ?? '']]);

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span className="text-zinc-500 text-xs">Generando…</span>
        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden mx-2">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-zinc-500 text-xs font-mono">{doneCount}/{totalCount}</span>
      </div>

      {/* Agent cards grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-2">
          {genStatus && (
            <p className="text-zinc-500 text-xs mb-4 font-mono">{genStatus}</p>
          )}

          {agents.map((agent) => {
            const status = agentStatuses[agent];
            const files = agentFiles[agent] ?? [];
            const isExpanded = expandedAgent === agent;

            return (
              <div
                key={agent}
                className="rounded-xl border transition-all duration-200"
                style={{
                  background: status === 'done' ? '#0a1a0a' : status === 'error' ? '#1a0a0a' : status === 'running' ? '#0a0f1a' : '#111',
                  borderColor: status === 'done' ? '#16a34a44' : status === 'error' ? '#dc262644' : status === 'running' ? '#006AFF44' : '#27272a',
                }}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {status === 'done' && <CheckCircle size={14} className="text-green-400" />}
                    {status === 'error' && <X size={14} className="text-red-400" />}
                    {status === 'running' && (
                      <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent inline-block" style={{ animation: 'spin 0.8s linear infinite' }} />
                    )}
                    {status !== 'done' && status !== 'error' && status !== 'running' && (
                      <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: status === 'done' ? '#4ade80' : status === 'error' ? '#f87171' : status === 'running' ? '#93bbff' : '#71717a' }}>
                        {agent}
                      </span>
                      {status === 'running' && <span className="text-zinc-600 text-[10px]">generando…</span>}
                    </div>
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {files.map((f) => (
                          <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#1a2a1a', color: '#86efac', border: '1px solid #16a34a33' }}>
                            {basename(f)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(files.length > 0 || status === 'running' || agentLogs[agent]) && (
                    <button onClick={() => setExpandedAgent(isExpanded ? null : agent)} className="text-zinc-600 hover:text-zinc-400 shrink-0 transition-colors">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div ref={logRef} className="max-h-48 overflow-y-auto px-3 pb-3 border-t border-zinc-800 pt-2">
                    <pre className="text-[9px] font-mono text-zinc-600 whitespace-pre-wrap break-all leading-relaxed">
                      {agentLogs[agent] ? agentLogs[agent] : status === 'running' ? 'Conectando con Claude…' : ''}
                    </pre>
                    {agentLogs[agent] && (
                      <div className="text-[9px] text-zinc-700 mt-1 font-mono">{agentLogs[agent].length.toLocaleString()} chars</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg) } }' }} />
    </div>
  );
}
