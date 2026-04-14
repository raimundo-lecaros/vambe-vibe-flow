'use client';

import type { Message, GeneratedPage, CreativityMode, PageType } from './types';
import type { Issue } from '@/lib/visual-tester';
import type { Setters } from './sse-handlers';
import { readSSEStream } from './sse-handlers';

interface ApplyFixesCtx {
  generatedPage: GeneratedPage;
  messages: Message[];
  creativityMode: CreativityMode;
  pageType: PageType;
  setters: Setters;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsGenerating: (v: boolean) => void;
  setGenStatus: (v: string) => void;
  setGenChars: (v: number) => void;
  resetAgents: () => void;
}

import React from 'react';

export async function applyFixes(issues: Issue[], ctx: ApplyFixesCtx): Promise<void> {
  const { generatedPage, messages, creativityMode, pageType, setters, setMessages, setIsGenerating, setGenStatus, setGenChars, resetAgents } = ctx;
  const detail = [
    'Corregí los siguientes issues detectados por el consultor visual:',
    ...issues.map((i) => `- [${i.severity.toUpperCase()}] ${i.component} (${i.category}): ${i.description}\n  Fix: ${i.fixHint}`),
  ].join('\n');
  const label = `Aplicar ${issues.length} corrección${issues.length !== 1 ? 'es' : ''} del QA`;
  setMessages((m) => [...m, { role: 'user', content: label }]);
  setIsGenerating(true);
  setGenStatus('Analizando correcciones…');
  setGenChars(0);
  resetAgents();
  try {
    const apiMessages = [...messages, { role: 'user' as const, content: detail }];
    const qaIssues = issues.map((i) => ({ component: i.component, description: i.description, fixHint: i.fixHint }));
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, currentSlug: generatedPage.slug, creativityMode, pageType, fixMode: true, qaIssues }),
    });
    await readSSEStream(res.body!.getReader(), setters);
  } catch (err) {
    setMessages((m) => [...m, { role: 'assistant', content: `Error inesperado: ${String(err)}` }]);
  } finally {
    setIsGenerating(false);
    setGenStatus('');
    setGenChars(0);
    resetAgents();
  }
}
