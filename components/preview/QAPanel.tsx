'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, Smartphone, Monitor, Wrench } from 'lucide-react';
import { C, SEVERITY_COLOR, CATEGORY_ICONS } from './constants';
import type { TestResult } from './types';
import type { Issue } from '@/lib/visual-tester';

interface QAPanelProps {
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
  onApplyFixes?: (issues: Issue[]) => void;
}

export default function QAPanel({
  testResult,
  isTesting,
  issueCount,
  screenshotMode,
  setScreenshotMode,
  selectedIssueIds,
  setSelectedIssueIds,
  toggleIssue,
  handleApplySelected,
  isGenerating,
  onApplyFixes,
}: QAPanelProps) {
  if (!testResult && !isTesting) return null;

  return (
    <div className="shrink-0 flex flex-col" style={{ borderBottom: `1px solid ${C.border}`, maxHeight: '55vh', overflowY: 'auto', background: C.panel }}>
      {isTesting ? (
        <div className="flex items-center gap-2.5 px-4 py-3 text-[12px]" style={{ color: C.text3 }}>
          <span className="w-3 h-3 rounded-full border border-t-transparent inline-block shrink-0" style={{ animation: 'spin 0.8s linear infinite', borderColor: C.text3 }} />
          Analizando con Playwright + Claude Vision…
        </div>
      ) : testResult ? (
        <>
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            {testResult.passed
              ? <CheckCircle size={13} className="text-emerald-400 shrink-0" />
              : <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            }
            <span className="text-[12px] font-medium" style={{ color: C.text1 }}>
              {testResult.passed ? 'Sin issues' : `${issueCount} observaciones`}
            </span>

            {(testResult.issues?.length ?? 0) > 0 && (
              <div className="flex gap-2 ml-2">
                <button onClick={() => setSelectedIssueIds(new Set((testResult.issues ?? []).map((i) => i.id)))} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">Todos</button>
                <span className="text-zinc-700">·</span>
                <button onClick={() => setSelectedIssueIds(new Set())} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">Ninguno</button>
              </div>
            )}

            {/* Screenshots */}
            <div className="flex gap-1 ml-auto">
              {(['desktop', 'mobile', 'desktop2'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScreenshotMode(screenshotMode === mode ? null : mode)}
                  className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded transition-all"
                  style={screenshotMode === mode ? { background: '#006AFF', color: 'white' } : { background: '#1a1a1c', color: '#52525b', border: '1px solid #27272a' }}
                >
                  {mode === 'mobile' ? <Smartphone size={9} /> : <Monitor size={9} />}
                  {mode === 'desktop2' ? '+2s' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Screenshot preview */}
          {screenshotMode && (() => {
            const data = screenshotMode === 'desktop' ? testResult.desktopScreenshot : screenshotMode === 'desktop2' ? testResult.desktopScreenshot2 : testResult.mobileScreenshot;
            if (!data) return (
              <div className="px-4 py-3 text-[11px] text-zinc-600 shrink-0" style={{ background: '#080808', borderBottom: '1px solid #1f1f23' }}>Screenshot no disponible</div>
            );
            return (
              <div className="px-4 py-3 shrink-0" style={{ background: '#080808', borderBottom: '1px solid #1f1f23' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/jpeg;base64,${data}`} alt={screenshotMode} className="w-full rounded-lg border" style={{ maxHeight: '200px', objectFit: 'cover', objectPosition: 'top', borderColor: '#27272a' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
            );
          })()}

          {/* DOM metrics summary */}
          {(testResult.domMetrics?.hasHorizontalOverflow || (testResult.domMetrics?.consoleErrors?.length ?? 0) > 0 || (testResult.domMetrics?.brokenIcons?.length ?? 0) > 0 || (testResult.domMetrics?.overlaps?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-2 px-4 py-2 shrink-0" style={{ background: '#0d0d0f', borderBottom: '1px solid #1f1f23' }}>
              {testResult.domMetrics.hasHorizontalOverflow && <span className="text-[10px] text-red-400 bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded-full">Overflow horizontal</span>}
              {(testResult.domMetrics.brokenIcons ?? []).map((icon, i) => <span key={i} className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-900/50 px-2 py-0.5 rounded-full font-mono">icono roto: {icon}</span>)}
              {(testResult.domMetrics.overlaps ?? []).map((o, i) => <span key={i} className="text-[10px] text-orange-400 bg-orange-950/50 border border-orange-900/50 px-2 py-0.5 rounded-full font-mono">overlap: {o.elementA} ∩ {o.elementB}</span>)}
              {(testResult.domMetrics.consoleErrors ?? []).map((e, i) => <span key={i} className="text-[10px] text-red-400 bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded-full font-mono truncate max-w-[200px]">{e}</span>)}
            </div>
          )}

          {/* Issues checklist */}
          {(testResult.issues?.length ?? 0) > 0 && (
            <div className="divide-y divide-zinc-900">
              {['critical', 'warning', 'suggestion'].map((sev) => {
                const sevIssues = (testResult.issues ?? []).filter((i) => i.severity === sev);
                if (sevIssues.length === 0) return null;
                const colors = SEVERITY_COLOR[sev as keyof typeof SEVERITY_COLOR];
                return sevIssues.map((issue) => (
                  <label key={issue.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors" style={{ background: selectedIssueIds.has(issue.id) ? colors.bg : '#0a0a0b' }} onMouseEnter={(e) => { if (!selectedIssueIds.has(issue.id)) (e.currentTarget as HTMLElement).style.background = '#0d0d0f'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selectedIssueIds.has(issue.id) ? colors.bg : '#0a0a0b'; }}>
                    <div className="relative shrink-0 mt-0.5">
                      <input type="checkbox" checked={selectedIssueIds.has(issue.id)} onChange={() => toggleIssue(issue.id)} className="sr-only" />
                      <div className="w-4 h-4 rounded flex items-center justify-center transition-all" style={{ background: selectedIssueIds.has(issue.id) ? colors.dot : 'transparent', border: `1.5px solid ${selectedIssueIds.has(issue.id) ? colors.dot : '#3f3f46'}` }}>
                        {selectedIssueIds.has(issue.id) && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors.dot }} />
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{issue.component}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                          {CATEGORY_ICONS[issue.category]}
                          {issue.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-200 leading-relaxed">{issue.description}</p>
                      {selectedIssueIds.has(issue.id) && <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed"><span className="text-zinc-600">Fix: </span>{issue.fixHint}</p>}
                    </div>
                  </label>
                ));
              })}
            </div>
          )}

          {/* Apply button */}
          {selectedIssueIds.size > 0 && onApplyFixes && (
            <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={handleApplySelected} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: C.accent }}>
                <Wrench size={14} />
                Aplicar {selectedIssueIds.size} cambio{selectedIssueIds.size > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
