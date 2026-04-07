'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, FileText, Pencil, Check } from 'lucide-react';
import { C } from '@/lib/studio/constants';
import type { Session } from '@/lib/studio/types';

interface Props {
  sessions: Session[];
  onLoad: (s: Session) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function SessionRow({ session, onLoad, onDelete, onRename }: {
  session: Session;
  onLoad: (s: Session) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.summary);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function commit() {
    const name = draft.trim();
    if (name && name !== session.summary) onRename(session.id, name);
    setEditing(false);
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 group transition-colors"
      style={{ borderBottom: `1px solid ${C.border}20` }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.panel)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !editing && onLoad(session)}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(session.summary); setEditing(false); } }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[11px] font-medium rounded px-1 outline-none"
            style={{ background: C.input, color: C.text1, border: `1px solid ${C.borderHi}` }}
          />
        ) : (
          <p className="text-[11px] font-medium truncate" style={{ color: C.text1 }}>{session.summary}</p>
        )}
        <p className="text-[10px] mt-0.5" style={{ color: C.text3 }}>{formatDate(session.createdAt)}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        {editing ? (
          <button onClick={(e) => { e.stopPropagation(); commit(); }} style={{ color: '#4ade80' }}>
            <Check size={11} />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setDraft(session.summary); setEditing(true); }}
            style={{ color: C.text3 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.text1)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.text3)}
          >
            <Pencil size={11} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
          style={{ color: C.text3 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.text3)}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export default function SessionsPanel({ sessions, onLoad, onDelete, onRename, onClose }: Props) {
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
            <SessionRow key={s.id} session={s} onLoad={onLoad} onDelete={onDelete} onRename={onRename} />
          ))
        )}
      </div>
    </div>
  );
}
