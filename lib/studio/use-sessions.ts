'use client';

import { useState, useEffect } from 'react';
import type { Session } from './types';

const KEY = 'vibe-sessions';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSessions(JSON.parse(raw) as Session[]);
    } catch { /* corrupted */ }
  }, []);

  function saveSession(session: Session) {
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === session.id);
      if (existing) {
        const merged = { ...session, createdAt: existing.createdAt, summary: existing.summary };
        const next = [merged, ...prev.filter((s) => s.id !== session.id)].slice(0, 30);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
        return next;
      }
      const base = session.summary;
      const taken = prev.filter((s) => s.summary === base || s.summary.startsWith(`${base} (`));
      const summary = taken.length === 0 ? base : `${base} (${taken.length + 1})`;
      const next = [{ ...session, summary }, ...prev].slice(0, 30);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const session = prev.find((s) => s.id === id);
      if (session?.generatedPage) {
        fetch('/api/pages', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slugs: [session.generatedPage.slug] }),
        }).catch(() => {});
      }
      const next = prev.filter((s) => s.id !== id);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }

  function renameSession(id: string, name: string) {
    setSessions((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, summary: name } : s);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }

  return { sessions, saveSession, deleteSession, renameSession };
}
