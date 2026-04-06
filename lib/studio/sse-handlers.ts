'use client';

import type { Message, PendingInstall, GeneratedPage } from './types';

type Setters = {
  setGenStatus: (s: string) => void;
  setGenChars: (n: number) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setPageHistory: React.Dispatch<React.SetStateAction<GeneratedPage[]>>;
  setGeneratedPage: (p: GeneratedPage) => void;
  setAgentStatuses: React.Dispatch<React.SetStateAction<Record<string, 'running' | 'done' | 'error'>>>;
  setAgentFiles: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setAgentLogs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPendingInstall: (p: PendingInstall) => void;
};

import React from 'react';

type SSEEvent = {
  type: string; message?: string; chars?: number; slug?: string; previewUrl?: string;
  files?: GeneratedPage['files']; summary?: string; deps?: string[];
  pendingFiles?: { path: string; content: string }[];
  agent?: string; agentFiles?: string[]; chunk?: string;
};

export function handleSSEEvent(event: SSEEvent, s: Setters): void {
  if (event.type === 'status' && event.message) {
    s.setGenStatus(event.message);
  } else if (event.type === 'progress' && event.chars !== undefined) {
    s.setGenChars(event.chars);
  } else if (event.type === 'done') {
    const page: GeneratedPage = { slug: event.slug!, previewUrl: event.previewUrl!, files: event.files!, summary: event.summary! };
    s.setMessages((m) => [...m, { role: 'assistant', content: page.summary }]);
    s.setPageHistory((h) => [...h, page]);
    s.setGeneratedPage(page);
    s.setAgentStatuses({});
    s.setAgentLogs({});
  } else if (event.type === 'error') {
    s.setMessages((m) => [...m, { role: 'assistant', content: `Error: ${event.message}` }]);
  } else if (event.type === 'agent_start' && event.agent) {
    s.setAgentStatuses((prev) => ({ ...prev, [event.agent!]: 'running' }));
  } else if (event.type === 'agent_done' && event.agent) {
    s.setAgentStatuses((prev) => ({ ...prev, [event.agent!]: 'done' }));
    if (event.agentFiles?.length) s.setAgentFiles((prev) => ({ ...prev, [event.agent!]: event.agentFiles as string[] }));
  } else if (event.type === 'agent_error' && event.agent) {
    s.setAgentStatuses((prev) => ({ ...prev, [event.agent!]: 'error' }));
  } else if (event.type === 'agent_log' && event.agent) {
    s.setAgentLogs((prev) => ({ ...prev, [event.agent!]: (prev[event.agent!] ?? '') + (event.chunk ?? '') }));
    if ((event.chunk ?? '').includes('===ENDFILE===')) {
      s.setAgentStatuses((prev) => {
        if (prev[event.agent!] === 'running') return { ...prev, [event.agent!]: 'done' };
        return prev;
      });
    }
  } else if (event.type === 'missing_deps') {
    s.setPendingInstall({ deps: event.deps as string[], slug: event.slug!, summary: event.summary!, pendingFiles: event.pendingFiles as { path: string; content: string }[] });
  }
}

export async function readSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>, s: Setters): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try { handleSSEEvent(JSON.parse(line.slice(6)) as SSEEvent, s); } catch { /* malformed */ }
    }
  }
}
