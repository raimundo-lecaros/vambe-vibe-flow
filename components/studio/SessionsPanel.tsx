'use client';

import React from 'react';
import { X, Trash2, FileText } from 'lucide-react';
import { C } from '@/lib/studio/constants';
import type { Session } from '@/lib/studio/types';

interface Props {
  sessions: Session[];
  onLoad: (s: Session) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export default function SessionsPanel({ sessions, onLoad, onDelete, onClose }: Props) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ borderBottom: `1px solid ${C.border}`, background: C.sidebar }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <span className="text-[12px] font-semibold" style={{ color: C.text1 }}>Páginas generadas</span>
        <button onClick={onClose} style={{ color: C.text3 }} className="hover:opacity-70 transition-opacity">
          <X size={13} />
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <FileText size={20} style={{ color: C.text3 }} />
            <p className="text-[11px]" style={{ color: C.text3 }}>No hay páginas guardadas</p>
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id}
              className="flex items-start gap-3 px-4 py-3 group transition-colors cursor-pointer"
              style={{ borderBottom: `1px solid ${C.border}20` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.panel)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onClick={() => onLoad(s)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: C.text1 }}>{s.summary}</p>
                <p className="text-[10px] mt-0.5" style={{ color: C.text3 }}>{formatDate(s.createdAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                style={{ color: C.text3 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.text3)}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
