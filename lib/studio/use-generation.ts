'use client';

import { useState, useEffect } from 'react';
import { fileToBase64, resizeForAPI, getMediaType } from '@/lib/image-utils';
import type { Issue } from '@/lib/visual-tester';
import type { Message, PendingInstall, GeneratedPage, CreativityMode, PageType, Session } from './types';
import type { SelectedElement } from '@/components/preview/types';
import { readSSEStream } from './sse-handlers';
import { applyFixes } from './apply-fixes';

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export function useGeneration() {
  const [sessionId, setSessionId] = useState<string>(newId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [genChars, setGenChars] = useState(0);
  const [generatedPage, setGeneratedPage] = useState<GeneratedPage | null>(null);
  const [pageHistory, setPageHistory] = useState<GeneratedPage[]>([]);
  const [pendingInstall, setPendingInstall] = useState<PendingInstall | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'running' | 'done' | 'error'>>({});
  const [agentFiles, setAgentFiles] = useState<Record<string, string[]>>({});
  const [agentLogs, setAgentLogs] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [creativityMode, setCreativityMode] = useState<CreativityMode>('modern');
  const [pageType, setPageType] = useState<PageType>('saas');
  const [identityMode, setIdentityMode] = useState('vambe');
  const [aestheticMode, setAestheticMode] = useState('vambe');
  const [toneMode, setToneMode] = useState('directo');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vibe-studio');
      if (!raw) return;
      const saved = JSON.parse(raw) as { messages?: Message[]; generatedPage?: GeneratedPage | null; pageHistory?: GeneratedPage[]; sessionId?: string };
      if (saved.sessionId) setSessionId(saved.sessionId);
      if (saved.messages) setMessages(saved.messages);
      if (saved.generatedPage) setGeneratedPage(saved.generatedPage);
      if (saved.pageHistory) setPageHistory(saved.pageHistory);
    } catch { /* corrupted */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('vibe-studio', JSON.stringify({ sessionId, messages, generatedPage, pageHistory })); } catch { /* quota */ }
  }, [sessionId, messages, generatedPage, pageHistory]);

  const handleUndo = () => {
    if (pageHistory.length <= 1) { setPageHistory([]); setGeneratedPage(null); }
    else { const prev = pageHistory[pageHistory.length - 2]; setPageHistory((h) => h.slice(0, -1)); setGeneratedPage(prev); }
  };

  const resetAgents = () => { setAgentStatuses({}); setAgentFiles({}); setAgentLogs({}); };

  const setters = { setGenStatus, setGenChars, setMessages, setPageHistory, setGeneratedPage: (p: GeneratedPage) => setGeneratedPage(p), setAgentStatuses, setAgentFiles, setAgentLogs, setPendingInstall: (p: PendingInstall) => setPendingInstall(p) };

  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isGenerating) return;
    const userMessage: Message = { role: 'user', content: text };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsGenerating(true);
    setGenStatus('Preparando…');
    setGenChars(0);
    try {
      let imageBase64: string | undefined;
      let mediaType: string | undefined;
      if (imageFile) {
        const raw = await fileToBase64(imageFile);
        imageBase64 = await resizeForAPI(raw);
        mediaType = getMediaType(imageFile);
        setImageFile(null);
      }
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, currentSlug: generatedPage?.slug, creativityMode, identityMode, aestheticMode, toneMode, pageType, imageBase64, mediaType, selectedElement }),
      });
      setSelectedElement(null);
      await readSSEStream(res.body!.getReader(), setters);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error inesperado: ${String(err)}` }]);
    } finally {
      setIsGenerating(false);
      setGenStatus('');
      setGenChars(0);
      resetAgents();
    }
  };

  const handleApplyFixes = async (issues: Issue[]) => {
    if (!generatedPage || isGenerating) return;
    await applyFixes(issues, { generatedPage, messages, creativityMode, pageType, setters, setMessages, setIsGenerating, setGenStatus, setGenChars, resetAgents });
  };

  const handleInstallDeps = async () => {
    if (!pendingInstall) return;
    setIsGenerating(true);
    setGenStatus(`Instalando ${pendingInstall.deps.join(', ')}…`);
    try {
      const res = await fetch('/api/install-deps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingInstall) });
      const result = (await res.json()) as { slug?: string; previewUrl?: string; files?: GeneratedPage['files']; error?: string };
      if (result.error) {
        setMessages((m) => [...m, { role: 'assistant', content: `Error instalando deps: ${result.error}` }]);
      } else {
        const page: GeneratedPage = { slug: result.slug!, previewUrl: result.previewUrl!, files: result.files!, summary: pendingInstall.summary };
        setMessages((m) => [...m, { role: 'assistant', content: `${pendingInstall.summary} (instalé: ${pendingInstall.deps.join(', ')})` }]);
        setPageHistory((h) => [...h, page]);
        setGeneratedPage(page);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error inesperado: ${String(err)}` }]);
    } finally { setPendingInstall(null); setIsGenerating(false); setGenStatus(''); }
  };

  const loadSession = (session: Session) => {
    setSessionId(session.id);
    setMessages(session.messages);
    setGeneratedPage(session.generatedPage);
    setPageHistory(session.pageHistory);
  };

  const resetSession = () => {
    setSessionId(newId());
    setMessages([]);
    setInput('');
    setGeneratedPage(null);
    setPageHistory([]);
  };

  return {
    messages, setMessages, input, setInput, isGenerating, genStatus,
    generatedPage, pageHistory, pendingInstall, setPendingInstall,
    agentStatuses, agentFiles, agentLogs,
    imageFile, setImageFile, selectedElement, setSelectedElement,
    creativityMode, setCreativityMode, pageType, setPageType,
    identityMode, setIdentityMode, aestheticMode, setAestheticMode, toneMode, setToneMode,
    handleSend, handleUndo, handleApplyFixes, handleInstallDeps,
    loadSession, resetSession, sessionId,
  };
}
