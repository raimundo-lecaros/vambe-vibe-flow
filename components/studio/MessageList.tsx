'use client';

import React, { useRef, useEffect } from 'react';
import { C, EXAMPLE_PROMPTS } from '@/lib/studio/constants';
import type { Message } from '@/lib/studio/types';

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  genStatus: string;
  agentStatuses: Record<string, 'running' | 'done' | 'error'>;
  onExampleClick: (prompt: string) => void;
}

export default function MessageList({ messages, isGenerating, genStatus, agentStatuses, onExampleClick }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeAgents = Object.entries(agentStatuses);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#18181f' }}>
      {/* Empty state */}
      {messages.length === 0 && (
        <div className="pt-1">
          <p className="text-[13px] mb-4 leading-relaxed" style={{ color: C.text2 }}>
            Describí tu producto y generaré una landing page completa con componentes, copy optimizado y animaciones.
          </p>
          <div className="space-y-2">
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => onExampleClick(p)}
                className="w-full text-left text-[12px] rounded-xl px-3.5 py-2.5 transition-all leading-relaxed"
                style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.text2 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderHi; (e.currentTarget as HTMLElement).style.color = C.text1; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.text2; }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className="max-w-[86%] text-[13px] leading-relaxed px-3.5 py-2.5"
            style={
              msg.role === 'user'
                ? { background: C.accent, color: '#fff', borderRadius: '14px 14px 4px 14px' }
                : { background: C.panel, color: C.text2, borderRadius: '14px 14px 14px 4px', border: `1px solid ${C.border}` }
            }
          >
            {msg.content}
          </div>
        </div>
      ))}

      {/* Generating indicator */}
      {isGenerating && (
        <div className="flex justify-start">
          <div className="max-w-[86%] text-[12px] px-3.5 py-2.5 space-y-2" style={{ background: C.panel, borderRadius: '14px 14px 14px 4px', border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2">
              <span className="inline-flex gap-0.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1 h-1 rounded-full animate-bounce inline-block" style={{ background: C.text3, animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span className="truncate" style={{ color: C.text3 }}>{genStatus || 'Generando…'}</span>
            </div>
            {activeAgents.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeAgents.map(([agent, status]) => (
                  <span
                    key={agent}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: status === 'done' ? '#0d2b14' : status === 'error' ? '#2b0d0d' : '#0d1b33',
                      color: status === 'done' ? '#4ade80' : status === 'error' ? '#f87171' : '#93c5fd',
                      border: `1px solid ${status === 'done' ? '#16a34a44' : status === 'error' ? '#dc262644' : '#3b82f644'}`,
                    }}
                  >
                    {status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                    {agent}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
