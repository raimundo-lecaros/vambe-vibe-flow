'use client';

import React from 'react';
import { Monitor, Smartphone, Crosshair, Folder, Undo2, ExternalLink, FlaskConical, CheckCircle, AlertTriangle } from 'lucide-react';
import { C } from './constants';
import type { GeneratedPage, TestResult } from './types';

interface ToolbarProps {
  generatedPage: GeneratedPage;
  viewMode: 'desktop' | 'mobile';
  setViewMode: (m: 'desktop' | 'mobile') => void;
  selectionMode: boolean;
  setSelectionMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  showFiles: boolean;
  setShowFiles: (v: boolean | ((prev: boolean) => boolean)) => void;
  testResult: TestResult | null;
  isTesting: boolean;
  issueCount: number;
  handleAutoTest: () => void;
  onUndo?: () => void;
}

export default function Toolbar({
  generatedPage,
  viewMode,
  setViewMode,
  selectionMode,
  setSelectionMode,
  showFiles,
  setShowFiles,
  testResult,
  isTesting,
  issueCount,
  handleAutoTest,
  onUndo,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 shrink-0" style={{ background: C.toolbar, borderBottom: `1px solid ${C.border}` }}>
      {/* Slug pill */}
      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg truncate max-w-[180px]" style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text2 }}>
        /{generatedPage.slug}
      </span>

      <div className="flex-1" />

      {/* Desktop / Mobile toggle */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.input }}>
        {(['desktop', 'mobile'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors"
            style={viewMode === m ? { background: C.border, color: C.text1 } : { color: C.text3 }}
          >
            {m === 'desktop' ? <Monitor size={12} /> : <Smartphone size={12} />}
            <span className="hidden md:inline capitalize">{m}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-4 mx-0.5" style={{ background: C.border }} />

      {/* Selection mode */}
      <button
        onClick={() => setSelectionMode((v) => !v)}
        title="Seleccionar elemento"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg transition-all"
        style={selectionMode ? { background: C.accent, color: '#fff' } : { background: C.input, color: C.text2, border: `1px solid ${C.border}` }}
      >
        <Crosshair size={12} />
        <span className="hidden md:inline">Seleccionar</span>
      </button>

      <div className="w-px h-4 mx-0.5" style={{ background: C.border }} />

      {/* QA button */}
      <button
        onClick={handleAutoTest}
        disabled={isTesting}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg disabled:opacity-50 transition-all"
        style={
          testResult?.passed
            ? { background: '#0d2b14', color: '#4ade80', border: '1px solid #16a34a55' }
            : testResult && issueCount > 0
            ? { background: '#2b0d0d', color: '#f87171', border: '1px solid #dc262655' }
            : { background: C.input, color: C.text2, border: `1px solid ${C.border}` }
        }
      >
        {isTesting
          ? <span className="w-3 h-3 rounded-full border border-current border-t-transparent inline-block" style={{ animation: 'spin 0.8s linear infinite' }} />
          : testResult?.passed ? <CheckCircle size={12} />
          : testResult && issueCount > 0 ? <AlertTriangle size={12} />
          : <FlaskConical size={12} />
        }
        {isTesting ? 'Analizando…' : testResult?.passed ? 'Sin issues' : testResult && issueCount > 0 ? `${issueCount} issue${issueCount > 1 ? 's' : ''}` : 'Test UI'}
      </button>

      {/* Files */}
      <button
        onClick={() => setShowFiles((v) => !v)}
        title="Archivos generados"
        className="p-1.5 rounded-lg transition-all"
        style={showFiles ? { background: C.border, color: C.text1, border: `1px solid ${C.borderHi}` } : { background: C.input, color: C.text3, border: `1px solid ${C.border}` }}
      >
        <Folder size={13} />
      </button>

      {onUndo && (
        <button onClick={onUndo} title="Deshacer" className="p-1.5 rounded-lg" style={{ background: C.input, color: C.text3, border: `1px solid ${C.border}` }}>
          <Undo2 size={13} />
        </button>
      )}

      <a
        href={generatedPage.previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir en nueva pestaña"
        className="p-1.5 rounded-lg"
        style={{ background: C.input, color: C.text3, border: `1px solid ${C.border}` }}
      >
        <ExternalLink size={13} />
      </a>
    </div>
  );
}
