'use client';

import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import { C } from './constants';

interface AgentOverlayProps {
  agents: string[];
  agentStatuses: Record<string, 'running' | 'done' | 'error'>;
  genStatus: string;
}

const STATUS_COLOR = {
  done:    '#4ade80',
  error:   '#f87171',
  running: '#93bbff',
};

export default function AgentOverlay({ agents, agentStatuses, genStatus }: AgentOverlayProps) {
  const doneCount = Object.values(agentStatuses).filter((s) => s === 'done').length;
  const totalCount = agents.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const rootAgents = agents.filter((a) => a === 'Planner');
  const childAgents = agents.filter((a) => a !== 'Planner');

  const renderAgent = (agent: string) => {
    const status = agentStatuses[agent];
    return (
      <div key={agent} className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          {status === 'done'    && <CheckCircle size={11} className="text-green-400" />}
          {status === 'error'   && <X size={11} className="text-red-400" />}
          {status === 'running' && (
            <span
              className="w-2.5 h-2.5 rounded-full border-[1.5px] border-blue-500 border-t-transparent inline-block"
              style={{ animation: 'spin 0.8s linear infinite' }}
            />
          )}
          {!status && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: C.text3 }} />}
        </div>
        <span className="text-[11px] truncate" style={{ color: status ? STATUS_COLOR[status] : C.text3 }}>
          {agent}
        </span>
      </div>
    );
  };

  return (
    <div
      className="absolute bottom-5 right-5 z-10 rounded-xl shadow-2xl overflow-hidden"
      style={{ background: C.toolbar, border: `1px solid ${C.border}`, minWidth: '200px', maxWidth: '260px' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium" style={{ color: C.text1 }}>Aplicando cambios</span>
          <span className="text-[11px] font-mono tabular-nums" style={{ color: C.text3 }}>
            {doneCount}/{totalCount}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: C.input }}>
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="space-y-1.5">
          {rootAgents.map(renderAgent)}
        </div>
        {childAgents.length > 0 && (
          <div className="ml-2 pl-3 border-l mt-1.5 space-y-1.5" style={{ borderColor: C.border }}>
            {childAgents.map(renderAgent)}
          </div>
        )}
        {genStatus && (
          <p className="text-[10px] pt-2 font-mono truncate" style={{ color: C.text3 }}>{genStatus}</p>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg) } }' }} />
    </div>
  );
}
