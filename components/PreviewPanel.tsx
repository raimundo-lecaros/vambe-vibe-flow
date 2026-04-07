'use client';

import React, { useState } from 'react';
import { Monitor, Crosshair, X } from 'lucide-react';
import { sortAgents, C } from './preview/constants';
import { useSelectionMode } from './preview/hooks/use-selection-mode';
import { useQATest } from './preview/hooks/use-qa-test';
import AgentProgress from './preview/AgentProgress';
import Toolbar from './preview/Toolbar';
import FilesPanel from './preview/FilesPanel';
import QAPanel from './preview/QAPanel';
import type { PreviewPanelProps, GeneratedPage, SelectedElement } from './preview/types';

export type { GeneratedPage, SelectedElement };

export default function PreviewPanel({
  generatedPage,
  onUndo,
  onElementSelect,
  onApplyFixes,
  isGenerating = false,
  agentStatuses = {},
  agentFiles = {},
  agentLogs = {},
  genStatus = '',
}: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showFiles, setShowFiles] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const { selectionMode, setSelectionMode, iframeRef, injectSelectionMode } = useSelectionMode(onElementSelect);
  const { testResult, isTesting, screenshotMode, setScreenshotMode, selectedIssueIds, setSelectedIssueIds, handleAutoTest, toggleIssue, handleApplySelected } = useQATest(generatedPage, isGenerating, onApplyFixes);

  const agents = sortAgents(Object.keys(agentStatuses));
  const isOrchestratedGeneration = agents.length > 0;
  const isEditMode = isGenerating && isOrchestratedGeneration && generatedPage !== null;

  if (isGenerating && isOrchestratedGeneration && !generatedPage) {
    return (
      <AgentProgress
        agents={agents}
        agentStatuses={agentStatuses}
        agentFiles={agentFiles}
        agentLogs={agentLogs}
        genStatus={genStatus}
        expandedAgent={expandedAgent}
        setExpandedAgent={setExpandedAgent}
      />
    );
  }

  if (!generatedPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: C.bg, backgroundImage: 'radial-gradient(circle, #2a2a34 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: C.toolbar, border: `1px solid ${C.border}` }}>
            <Monitor size={22} style={{ color: C.text3 }} />
          </div>
          <p className="text-[15px] font-medium" style={{ color: C.text2 }}>Tu preview aparecerá aquí</p>
          <p className="text-[12px] mt-1" style={{ color: C.text3 }}>Describí tu landing en el panel izquierdo</p>
        </div>
      </div>
    );
  }

  const issueCount =
    (testResult?.issues?.length ?? 0) +
    (testResult?.domMetrics?.consoleErrors?.length ?? 0) +
    (testResult?.domMetrics?.stuckAnimations?.length ?? 0) +
    (testResult?.domMetrics?.brokenIcons?.length ?? 0) +
    (testResult?.domMetrics?.overlaps?.length ?? 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: C.bg }}>
      <Toolbar
        generatedPage={generatedPage}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        showFiles={showFiles}
        setShowFiles={setShowFiles}
        testResult={testResult}
        isTesting={isTesting}
        issueCount={issueCount}
        handleAutoTest={handleAutoTest}
        onUndo={onUndo}
      />

      {selectionMode && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ background: '#0d1b33', borderBottom: `1px solid ${C.accent}33` }}>
          <Crosshair size={11} style={{ color: C.accent }} className="shrink-0" />
          <span className="text-[11px] text-blue-300">Hacé click en cualquier elemento para referenciarlo en el chat</span>
          <button onClick={() => setSelectionMode(false)} className="ml-auto text-blue-700 hover:text-blue-400 transition-colors">
            <X size={11} />
          </button>
        </div>
      )}

      <QAPanel
        testResult={testResult}
        isTesting={isTesting}
        issueCount={issueCount}
        screenshotMode={screenshotMode}
        setScreenshotMode={setScreenshotMode}
        selectedIssueIds={selectedIssueIds}
        setSelectedIssueIds={setSelectedIssueIds}
        toggleIssue={toggleIssue}
        handleApplySelected={handleApplySelected}
        isGenerating={isGenerating}
        onApplyFixes={onApplyFixes}
      />

      {showFiles && (
        <div style={{ height: 260, flexShrink: 0, borderBottom: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <FilesPanel slug={generatedPage.slug} />
        </div>
      )}

      <div className="flex-1 relative overflow-auto flex items-start justify-center p-4" style={{ backgroundColor: C.bg, backgroundImage: `radial-gradient(circle, ${C.border} 1px, transparent 1px)`, backgroundSize: '28px 28px' }}>
        {viewMode === 'desktop' ? (
          <iframe ref={iframeRef} key={`${generatedPage.slug}-desktop`} src={generatedPage.previewUrl} className="w-full rounded-lg border border-zinc-700 bg-white" style={{ height: 'calc(100vh - 120px)', minHeight: '600px', opacity: isEditMode ? 0.5 : 1, transition: 'opacity 0.3s' }} title="Desktop preview" onLoad={() => { if (selectionMode) injectSelectionMode(); }} />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="border-[6px] border-zinc-600 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white" style={{ width: '390px', opacity: isEditMode ? 0.5 : 1, transition: 'opacity 0.3s' }}>
              <iframe ref={iframeRef} key={`${generatedPage.slug}-mobile`} src={generatedPage.previewUrl} style={{ width: '390px', height: '844px', display: 'block', border: 'none' }} title="Mobile preview" onLoad={() => { if (selectionMode) injectSelectionMode(); }} />
            </div>
            <p className="text-zinc-600 text-xs">390 × 844 px</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg) } }' }} />
    </div>
  );
}
