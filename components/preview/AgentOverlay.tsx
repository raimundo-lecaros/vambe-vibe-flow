'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AgentCard from './AgentCard';
import { C } from './constants';

interface Props {
  agents: string[];
  agentStatuses: Record<string, 'running' | 'done' | 'error'>;
  genStatus: string;
}

const STEP_MS = 950;

export default function AgentOverlay({ agents, agentStatuses, genStatus }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const doneCount = Object.values(agentStatuses).filter((s) => s === 'done').length;
  const totalCount = agents.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const planner = agents.find((a) => a === 'Planner');
  const children = agents.filter((a) => a !== 'Planner');

  useEffect(() => { setVisibleCount(0); }, [planner]);
  useEffect(() => {
    if (visibleCount >= children.length) return;
    const t = setTimeout(() => setVisibleCount((v) => v + 1), visibleCount === 0 ? 600 : STEP_MS);
    return () => clearTimeout(t);
  }, [visibleCount, children.length]);

  const nodeEnter = (delay = 0) => ({
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { delay, type: 'spring' as const, stiffness: 320, damping: 22 },
  });

  return (
    <div className="absolute bottom-5 right-5 z-10 rounded-2xl shadow-2xl overflow-hidden" style={{ background: C.toolbar, border: `1px solid ${C.border}`, maxWidth: 340 }}>
      <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium" style={{ color: C.text1 }}>Aplicando cambios</span>
          <span className="text-[10px] font-mono tabular-nums" style={{ color: C.text3 }}>{doneCount}/{totalCount}</span>
        </div>
        <div style={{ height: 3, borderRadius: 999, overflow: 'hidden', background: C.input }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#3b82f6,#818cf8)', borderRadius: 999, transition: 'width 0.5s' }} />
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col items-center gap-3">
        {planner && (
          <AgentCard agent={planner} status={agentStatuses[planner] ?? 'running'} compact motionProps={nodeEnter(0)} />
        )}

        {children.length > 0 && planner && (
          <div style={{ width: 1, height: 12, background: 'linear-gradient(#38bdf8,#818cf8)' }} />
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: 300 }}>
          {children.slice(0, visibleCount).map((agent) => (
            <AgentCard key={agent} agent={agent} status={agentStatuses[agent] ?? 'running'} compact motionProps={nodeEnter(0.3)} />
          ))}
        </div>
      </div>

      {genStatus && (
        <div className="px-4 pb-3">
          <p className="text-[9px] font-mono truncate" style={{ color: C.text3 }}>{genStatus}</p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
    </div>
  );
}
