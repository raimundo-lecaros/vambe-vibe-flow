'use client';

import React, { useRef, useEffect, useState } from 'react';
import AgentCard from './AgentCard';

const STEP_MS = 700; const CX = 50; const CY = 50;
const RINGS = [0, 1, 2, 3] as const;

interface Props {
  agents: string[]; agentStatuses: Record<string, 'running' | 'done' | 'error'>;
  agentFiles: Record<string, string[]>; agentLogs: Record<string, string>;
  genStatus: string; expandedAgent: string | null; setExpandedAgent: (a: string | null) => void;
}

function getRadius(n: number) { return n <= 1 ? 32 : Math.max(32, Math.ceil(13 / Math.sin(Math.PI / n))); }
function childPos(i: number, total: number, r: number) {
  const a = (i / total) * Math.PI * 2 - Math.PI / 2;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

type Center = 'Planner' | 'Verificador' | 'AutoFix';

export default function AgentProgress({ agents, agentStatuses, agentFiles, agentLogs, genStatus, expandedAgent, setExpandedAgent }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const outerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const innerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [center, setCenter] = useState<Center>('Planner');
  const [inward, setInward] = useState(false);
  const [fade, setFade] = useState(1);
  const [childOverride, setChildOverride] = useState<'running' | null>(null);

  const planner = agents.find((a) => a === 'Planner') ?? 'Planner';
  const children = agents.filter((a) => a !== 'Planner' && a !== 'Verificador' && a !== 'AutoFix');
  const radius = getRadius(children.length);
  const doneCount = Object.values(agentStatuses).filter((s) => s === 'done').length;
  const progress = agents.length > 0 ? Math.round((doneCount / agents.length) * 100) : 0;
  const ringColor = '#8888a4';
  const breatheAnim = inward ? 'ring-in' : 'ring-out';

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [agentLogs[expandedAgent ?? '']]);
  useEffect(() => { setVisibleCount(0); }, [agents[0]]);
  useEffect(() => {
    if (visibleCount >= children.length) return;
    const t = setTimeout(() => setVisibleCount((v) => v + 1), visibleCount === 0 ? 400 : STEP_MS);
    return () => clearTimeout(t);
  }, [visibleCount, children.length]);

  function swapCenter(next: Center, newInward: boolean, override: 'running' | null) {
    if (outerTimer.current) clearTimeout(outerTimer.current);
    if (innerTimer.current) clearTimeout(innerTimer.current);
    setFade(0);
    innerTimer.current = setTimeout(() => { setCenter(next); setInward(newInward); setChildOverride(override); setFade(1); }, 350);
  }

  useEffect(() => {
    const vs = agentStatuses['Verificador']; const afs = agentStatuses['AutoFix'];
    if (vs === 'running') {
      swapCenter('Verificador', true, null);
    } else if (afs === 'running') {
      swapCenter('AutoFix', false, 'running');
    } else if ((vs === 'done' || vs === 'error') && (!afs || afs === 'done' || afs === 'error')) {
      swapCenter('Planner', false, null);
    }
    return () => { if (outerTimer.current) clearTimeout(outerTimer.current); if (innerTimer.current) clearTimeout(innerTimer.current); };
  }, [agentStatuses['Verificador'], agentStatuses['AutoFix']]);

  const displayAgent = center === 'Planner' ? planner : center;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#0d0d12', backgroundImage: 'radial-gradient(circle, #2a2a34 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      <div className="px-6 pt-6 pb-4 shrink-0" style={{ background: 'rgba(13,13,18,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-white mb-0.5">Generando página</p>
            {genStatus && <p className="text-[11px] text-zinc-500 font-mono truncate">{genStatus}</p>}
          </div>
          <span className="text-zinc-600 text-[11px] font-mono tabular-nums">{doneCount}/{agents.length}</span>
        </div>
        <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '1' }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
            {RINGS.map((_, i) => {
              const delay = i * -(3.8 / RINGS.length);
              const anim = `${breatheAnim} 3.8s cubic-bezier(0.08, 0.6, 0.3, 1) ${delay}s infinite`;
              const sw = 0.65 - i * 0.08;
              return (
                <circle key={`${ringColor}-${i}`} cx={CX} cy={CY} r={28}
                  fill="none" stroke={ringColor} strokeWidth={sw}
                  style={{ transformBox: 'fill-box' as React.CSSProperties['transformBox'], transformOrigin: 'center', animation: anim }}
                />
              );
            })}
          </svg>

          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, calc(-50% + 11px))', zIndex: 2, opacity: fade, transition: 'opacity 0.35s ease' }}>
            <AgentCard agent={displayAgent} status={agentStatuses[displayAgent] ?? 'running'} size={72}
              selected={expandedAgent === planner} onToggle={() => setExpandedAgent(expandedAgent === planner ? null : planner)}
              motionProps={{ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }}
            />
          </div>

          {children.slice(0, visibleCount).map((agent, i) => {
            const pos = childPos(i, children.length, radius);
            return (
              <div key={agent} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, calc(-50% + 11px))', zIndex: 2 }}>
                <AgentCard agent={agent} status={childOverride ?? agentStatuses[agent] ?? 'running'}
                  files={agentFiles[agent]} size={52} selected={expandedAgent === agent}
                  onToggle={() => setExpandedAgent(expandedAgent === agent ? null : agent)}
                  motionProps={{ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.35, ease: 'easeOut' } }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {expandedAgent && agentLogs[expandedAgent] && (
        <div className="shrink-0 px-6 pb-4">
          <p className="text-[10px] text-zinc-600 font-mono mb-1.5">{expandedAgent} · log</p>
          <div ref={logRef} className="max-h-36 overflow-y-auto rounded-xl border border-zinc-800 px-3 py-2.5" style={{ background: '#06060a' }}>
            <pre className="text-[9px] font-mono text-zinc-500 whitespace-pre-wrap break-all leading-relaxed">{agentLogs[expandedAgent]}</pre>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes ring-out {
          0%   { transform: scale(0.03); opacity: 0; }
          7%   { opacity: 0.65; }
          35%  { opacity: 0.04; }
          100% { transform: scale(1);    opacity: 0; }
        }
        @keyframes ring-in {
          0%   { transform: scale(1);    opacity: 0; }
          7%   { opacity: 0.65; }
          35%  { opacity: 0.04; }
          100% { transform: scale(0.03); opacity: 0; }
        }
      ` }} />
    </div>
  );
}
