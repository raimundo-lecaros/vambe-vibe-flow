'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Smartphone, Monitor, Wrench, ChevronDown, ChevronUp, ChevronRight, X, FlaskConical } from 'lucide-react';
import { C, SEVERITY_COLOR, CATEGORY_ICONS } from './constants';
import type { TestResult } from './types';

interface Props {
  show: boolean;
  onClose: () => void;
  onRunTest: () => void;
  testResult: TestResult | null;
  isTesting: boolean;
  issueCount: number;
  screenshotMode: 'desktop' | 'desktop2' | 'mobile' | null;
  setScreenshotMode: (m: 'desktop' | 'desktop2' | 'mobile' | null) => void;
  selectedIssueIds: Set<string>;
  setSelectedIssueIds: (ids: Set<string>) => void;
  toggleIssue: (id: string) => void;
  handleApplySelected: () => void;
  isGenerating: boolean;
}

export default function QAPanel({ show, onClose, onRunTest, testResult, isTesting, issueCount, screenshotMode, setScreenshotMode, selectedIssueIds, setSelectedIssueIds, toggleIssue, handleApplySelected, isGenerating }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!show) return null;

  const issues = testResult?.issues ?? [];

  return (
    <div style={{ position: 'absolute', top: 8, right: 8, width: 340, maxHeight: 'calc(100% - 16px)', zIndex: 50, display: 'flex', flexDirection: 'column', borderRadius: 10, border: `1px solid ${C.border}`, background: C.panel, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: collapsed ? 'none' : `1px solid ${C.border}` }}>
        {isTesting
          ? <span className="w-3 h-3 rounded-full border border-t-transparent shrink-0" style={{ animation: 'spin 0.8s linear infinite', borderColor: C.text3 }} />
          : testResult?.passed ? <CheckCircle size={12} className="text-emerald-400 shrink-0" />
          : testResult ? <AlertTriangle size={12} className="text-amber-400 shrink-0" />
          : <FlaskConical size={12} className="shrink-0" style={{ color: C.text3 }} />
        }
        <span className="text-[12px] font-medium flex-1" style={{ color: C.text1 }}>
          {isTesting ? 'Analizando…' : testResult?.passed ? 'Sin issues' : testResult ? `${issueCount} observaciones` : 'QA Test'}
        </span>
        <button onClick={onRunTest} disabled={isTesting} className="text-[10px] px-2 py-1 rounded-md disabled:opacity-40 transition-all" style={{ background: C.accent + '22', color: C.accent, border: `1px solid ${C.accent}44` }}>
          {isTesting ? '…' : 'Ejecutar'}
        </button>
        <button onClick={() => setCollapsed((c) => !c)} className="p-0.5 transition-colors" style={{ color: C.text3 }}>
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
        <button onClick={onClose} className="p-0.5 transition-colors" style={{ color: C.text3 }}>
          <X size={12} />
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col overflow-y-auto flex-1">
          {!isTesting && issues.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => setSelectedIssueIds(new Set(issues.map((i) => i.id)))} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">Todos</button>
              <span style={{ color: C.text3 }}>·</span>
              <button onClick={() => setSelectedIssueIds(new Set())} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">Ninguno</button>
              <div className="flex gap-1 ml-auto">
                {(['desktop', 'mobile', 'desktop2'] as const).map((mode) => (
                  <button key={mode} onClick={() => setScreenshotMode(screenshotMode === mode ? null : mode)}
                    className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded"
                    style={screenshotMode === mode ? { background: '#006AFF', color: 'white' } : { background: '#1a1a1c', color: '#52525b', border: '1px solid #27272a' }}>
                    {mode === 'mobile' ? <Smartphone size={9} /> : <Monitor size={9} />}
                    {mode === 'desktop2' ? '+2s' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {screenshotMode && (() => {
            const data = screenshotMode === 'desktop' ? testResult?.desktopScreenshot : screenshotMode === 'desktop2' ? testResult?.desktopScreenshot2 : testResult?.mobileScreenshot;
            if (!data) return null;
            return (
              <div className="px-3 py-2.5 shrink-0" style={{ background: '#080808', borderBottom: `1px solid ${C.border}` }}>
                <img src={`data:image/jpeg;base64,${data}`} alt={screenshotMode} className="w-full rounded-lg border" style={{ maxHeight: 160, objectFit: 'cover', objectPosition: 'top', borderColor: '#27272a' }} />
              </div>
            );
          })()}

          {issues.length > 0 && (
            <div className="divide-y divide-zinc-900 flex-1">
              {issues.map((issue) => {
                const colors = SEVERITY_COLOR[issue.severity as keyof typeof SEVERITY_COLOR];
                const isExpanded = expandedId === issue.id;
                return (
                  <div key={issue.id} style={{ background: selectedIssueIds.has(issue.id) ? colors.bg : 'transparent' }}>
                    <div className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none" onClick={() => setExpandedId(isExpanded ? null : issue.id)}>
                      <div className="shrink-0" onClick={(e) => { e.stopPropagation(); toggleIssue(issue.id); }}>
                        <div className="w-3.5 h-3.5 rounded flex items-center justify-center" style={{ background: selectedIssueIds.has(issue.id) ? colors.dot : 'transparent', border: `1.5px solid ${selectedIssueIds.has(issue.id) ? colors.dot : '#3f3f46'}` }}>
                          {selectedIssueIds.has(issue.id) && <svg width="7" height="5" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.dot }} />
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide truncate flex-1">{issue.component}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                        {CATEGORY_ICONS[issue.category]}{issue.category}
                      </span>
                      <span style={{ color: C.text3 }}>{isExpanded ? <ChevronUp size={10} /> : <ChevronRight size={10} />}</span>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
                        <p className="text-[11px] text-zinc-300 leading-relaxed mt-2 mb-1">{issue.description}</p>
                        <p className="text-[10px] leading-relaxed" style={{ color: C.text3 }}><span className="text-zinc-600">Fix: </span>{issue.fixHint}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedIssueIds.size > 0 && (
            <div className="px-3 py-2.5 shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={handleApplySelected} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40" style={{ background: C.accent }}>
                <Wrench size={13} />
                Aplicar {selectedIssueIds.size} cambio{selectedIssueIds.size > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
