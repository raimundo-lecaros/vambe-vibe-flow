'use client';

import React, { useRef, useEffect } from 'react';
import AgentNode from './AgentNode';

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
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [agentLogs[expandedAgent ?? '']]);

  const rootAgents = agents.filter((a) => a === 'Planner');
  const childAgents = agents.filter((a) => a !== 'Planner');

  const toggleAgent = (agent: string) =>
    setExpandedAgent(expandedAgent === agent ? null : agent);

  const nodeProps = (agent: string) => ({
    agent,
    status: agentStatuses[agent] ?? ('running' as const),
    files: agentFiles[agent],
    log: agentLogs[agent],
    expanded: expandedAgent === agent,
    onToggle: () => toggleAgent(agent),
    logRef: expandedAgent === agent ? logRef : null,
  });

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-white mb-0.5">Generando página</p>
            {genStatus && (
              <p className="text-[11px] text-zinc-500 font-mono truncate">{genStatus}</p>
            )}
          </div>
          <span className="text-zinc-600 text-[11px] font-mono tabular-nums">
            {doneCount}/{totalCount}
          </span>
        </div>
        <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-sm">
          <div className="space-y-1.5">
            {rootAgents.map((agent) => (
              <AgentNode key={agent} {...nodeProps(agent)} />
            ))}
          </div>

          {childAgents.length > 0 && (
            <div className="ml-3 pl-4 border-l border-zinc-800 mt-1.5 space-y-1.5">
              {childAgents.map((agent) => (
                <AgentNode key={agent} {...nodeProps(agent)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: '@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeSlide { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }',
      }} />
    </div>
  );
}
