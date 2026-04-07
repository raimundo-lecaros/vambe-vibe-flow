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
      const merged = existing ? { ...session, createdAt: existing.createdAt } : session;
      const filtered = prev.filter((s) => s.id !== session.id);
      const next = [merged, ...filtered].slice(0, 30);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
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
