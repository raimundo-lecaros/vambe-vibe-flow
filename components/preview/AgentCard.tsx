'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X, Brain, Cpu, Star, Zap, Menu, AlignJustify, MousePointer, MessageSquare, Tag, HelpCircle, Layers, Code2 } from 'lucide-react';

const AGENT_META: Record<string, { icon: React.ElementType; accent: string }> = {
  Planner:      { icon: Brain,         accent: '#818cf8' },
  Layout:       { icon: Layers,        accent: '#38bdf8' },
  Hero:         { icon: Star,          accent: '#f472b6' },
  Features:     { icon: Zap,           accent: '#34d399' },
  Navbar:       { icon: Menu,          accent: '#fb923c' },
  Footer:       { icon: AlignJustify,  accent: '#a78bfa' },
  CTA:          { icon: MousePointer,  accent: '#f59e0b' },
  Testimonials: { icon: MessageSquare, accent: '#06b6d4' },
  Pricing:      { icon: Tag,           accent: '#84cc16' },
  FAQ:          { icon: HelpCircle,    accent: '#e879f9' },
  Datos:        { icon: Code2,         accent: '#94a3b8' },
};

const DEF = { icon: Cpu, accent: '#94a3b8' };

export interface AgentCardProps {
  agent: string;
  status: 'running' | 'done' | 'error';
  files?: string[];
  compact?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  motionProps?: React.ComponentProps<typeof motion.div>;
  size?: number;
}

export default function AgentCard({ agent, status, compact = false, selected, onToggle, motionProps, size = 60 }: AgentCardProps) {
  const { icon: Icon, accent } = AGENT_META[agent] ?? DEF;
  const done = status === 'done';
  const err  = status === 'error';
  const running = status === 'running';
  const color = done ? '#4ade80' : err ? '#f87171' : accent;
  const iconSz = Math.round(size * 0.37);

  if (compact) {
    return (
      <motion.div onClick={onToggle}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 8,
          background: done ? '#080f0a' : err ? '#0f0808' : '#09101f',
          border: `1px solid ${color}30`, cursor: onToggle ? 'pointer' : 'default' }}
        {...motionProps}
      >
        {done    && <CheckCircle size={11} color={color} />}
        {err     && <X           size={11} color={color} />}
        {running && <span style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${accent}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.9s linear infinite' }} />}
        <span style={{ fontSize: 9, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{agent}</span>
      </motion.div>
    );
  }

  return (
    <motion.div onClick={onToggle}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: onToggle ? 'pointer' : 'default' }}
      {...motionProps}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {running && (
          <motion.div style={{ position: 'absolute', inset: -5, borderRadius: '50%', border: `1px solid ${accent}40` }}
            animate={{ opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: selected ? `${accent}18` : '#0d1020',
          border: `1.5px solid ${selected ? accent + '70' : color + '30'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, transition: 'border-color 0.4s, background 0.4s',
        }}>
          {done    && <CheckCircle size={iconSz} />}
          {err     && <X size={iconSz} />}
          {running && <Icon size={iconSz} style={{ opacity: 0.85 }} />}
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color, textAlign: 'center', whiteSpace: 'nowrap' }}>{agent}</span>
    </motion.div>
  );
}
