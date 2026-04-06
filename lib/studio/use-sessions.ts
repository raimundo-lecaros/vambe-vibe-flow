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

  function persist(next: Session[]) {
    setSessions(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  }

  function saveSession(session: Session) {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== session.id);
      const next = [session, ...filtered].slice(0, 30);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }

  function deleteSession(id: string) {
    persist(sessions.filter((s) => s.id !== id));
  }

  return { sessions, saveSession, deleteSession };
}
