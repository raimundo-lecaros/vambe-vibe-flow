'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import PreviewPanel from '@/components/PreviewPanel';
import Header from '@/components/studio/Header';
import Controls from '@/components/studio/Controls';
import MessageList from '@/components/studio/MessageList';
import InputBar from '@/components/studio/InputBar';
import DepsModal from '@/components/studio/DepsModal';
import SessionsPanel from '@/components/studio/SessionsPanel';
import BrandModal from '@/components/studio/BrandModal';
import { useGeneration } from '@/lib/studio/use-generation';
import { useSessions } from '@/lib/studio/use-sessions';
import { C } from '@/lib/studio/constants';
import type { Session } from '@/lib/studio/types';
import type { SelectorType } from '@/lib/brands';

export default function StudioPage() {
  const gen = useGeneration();
  const { sessions, saveSession, deleteSession, renameSession } = useSessions();
  const [showSessions, setShowSessions] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [importingFor, setImportingFor] = useState<SelectorType | null>(null);
  const [brandRefreshTrigger, setBrandRefreshTrigger] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: sidebarWidth };
    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const delta = ev.clientX - dragState.current.startX;
      setSidebarWidth(Math.min(640, Math.max(260, dragState.current.startWidth + delta)));
    };
    const handleMouseUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  const buildSession = (): Session => ({
    id: gen.sessionId,
    summary: (gen.messages.find((m) => m.role === 'user')?.content ?? 'Sin título').slice(0, 120),
    createdAt: Date.now(),
    generatedPage: gen.generatedPage,
    messages: gen.messages,
  });

  useEffect(() => {
    if (!gen.generatedPage || gen.isGenerating) return;
    saveSession(buildSession());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.generatedPage, gen.sessionId]);

  const handleNewSession = () => {
    if (gen.generatedPage) saveSession(buildSession());
    gen.resetSession();
    setShowSessions(false);
  };

  const handleLoadSession = (session: Session) => {
    if (gen.generatedPage) saveSession(buildSession());
    gen.loadSession(session);
    setShowSessions(false);
  };

  return (
    <div className="flex h-screen text-white overflow-hidden" style={{ background: '#14141a', fontFamily: 'system-ui, sans-serif' }}>
      <div className="relative shrink-0 flex flex-col" style={{ width: sidebarWidth, minWidth: 260, maxWidth: 640, background: C.sidebar, borderRight: `1px solid ${C.border}` }}>
        <Header
          onNewSession={handleNewSession}
          onToggleSessions={() => setShowSessions((v) => !v)}
          showSessions={showSessions}
          sessionCount={sessions.length}
        />

        {showSessions && (
          <SessionsPanel
            sessions={sessions}
            onLoad={handleLoadSession}
            onDelete={deleteSession}
            onRename={renameSession}
            onClose={() => setShowSessions(false)}
          />
        )}

        <Controls creativityMode={gen.creativityMode} setCreativityMode={gen.setCreativityMode} pageType={gen.pageType} setPageType={gen.setPageType} identityMode={gen.identityMode} setIdentityMode={gen.setIdentityMode} aestheticMode={gen.aestheticMode} setAestheticMode={gen.setAestheticMode} toneMode={gen.toneMode} setToneMode={gen.setToneMode} onImportBrand={(type) => { setImportingFor(type); setShowBrandModal(true); }} brandRefreshTrigger={brandRefreshTrigger} />

        <MessageList messages={gen.messages} isGenerating={gen.isGenerating} genStatus={gen.genStatus} agentStatuses={gen.agentStatuses} onExampleClick={(p) => void gen.handleSend(p)} />

        {gen.pendingInstall && (
          <DepsModal
            pendingInstall={gen.pendingInstall}
            isGenerating={gen.isGenerating}
            onInstall={() => void gen.handleInstallDeps()}
            onCancel={() => { gen.setPendingInstall(null); gen.setMessages((m) => [...m, { role: 'assistant', content: 'Instalación cancelada.' }]); }}
          />
        )}

        <InputBar input={gen.input} setInput={gen.setInput} isGenerating={gen.isGenerating} selectedElement={gen.selectedElement} setSelectedElement={gen.setSelectedElement} imageFile={gen.imageFile} setImageFile={gen.setImageFile} onSend={() => void gen.handleSend()} />
      </div>

      {showBrandModal && (
        <BrandModal
          onSave={(id) => {
            if (importingFor === 'identity') gen.setIdentityMode(id);
            else if (importingFor === 'aesthetic') gen.setAestheticMode(id);
            else if (importingFor === 'tone') gen.setToneMode(id);
            setBrandRefreshTrigger((n) => n + 1);
            setShowBrandModal(false);
          }}
          onClose={() => setShowBrandModal(false)}
        />
      )}

      <div onMouseDown={handleDividerMouseDown} className="w-1 shrink-0 cursor-col-resize transition-colors hover:bg-blue-500" style={{ background: '#2a2a34' }} />

      <PreviewPanel
        generatedPage={gen.generatedPage}
        onUndo={gen.pageHistory.length > 0 ? gen.handleUndo : undefined}
        onElementSelect={gen.setSelectedElement}
        onApplyFixes={gen.handleApplyFixes}
        isGenerating={gen.isGenerating}
        agentStatuses={gen.agentStatuses}
        agentFiles={gen.agentFiles}
        agentLogs={gen.agentLogs}
        genStatus={gen.genStatus}
      />
    </div>
  );
}
