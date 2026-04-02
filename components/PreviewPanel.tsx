'use client';

import { useState } from 'react';

export interface GeneratedPage {
  slug: string;
  previewUrl: string;
  files: { path: string; lines: number }[];
  summary: string;
}

interface TestResult {
  desktopScreenshot: string;
  mobileScreenshot: string;
  consoleErrors: string[];
  hasHorizontalOverflow: boolean;
  issues: string[];
  passed: boolean;
  fixed?: boolean;
}

interface PreviewPanelProps {
  generatedPage: GeneratedPage | null;
  onUndo?: () => void;
}

export default function PreviewPanel({ generatedPage, onUndo }: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showFiles, setShowFiles] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showScreenshots, setShowScreenshots] = useState(false);

  const handleAutoTest = async () => {
    if (!generatedPage) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: generatedPage.slug }),
      });
      const result: TestResult = await res.json();
      setTestResult(result);
    } catch (err) {
      console.error('Auto-test failed:', err);
    } finally {
      setIsTesting(false);
    }
  };

  if (!generatedPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900">
        <p className="text-zinc-500 text-lg select-none">
          Describí la landing que querés crear →
        </p>
        <p className="text-zinc-700 text-sm mt-2">Tu preview aparecerá aquí</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden min-w-0">
      {/* Sticky toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700 shrink-0 flex-wrap">
        <span className="text-zinc-400 text-xs font-mono truncate max-w-[160px]">
          /{generatedPage.slug}
        </span>

        <div className="flex-1" />

        {/* Desktop / Mobile toggle */}
        <div className="flex rounded-md overflow-hidden border border-zinc-600">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-2.5 py-1 text-xs transition-colors ${
              viewMode === 'desktop'
                ? 'bg-zinc-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🖥 Desktop
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`px-2.5 py-1 text-xs transition-colors ${
              viewMode === 'mobile'
                ? 'bg-zinc-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            📱 Mobile
          </button>
        </div>

        <button
          onClick={handleAutoTest}
          disabled={isTesting}
          className="px-2.5 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-md disabled:opacity-50 transition-colors"
        >
          {isTesting ? '⏳ Testing…' : '🔍 Auto-test'}
        </button>

        <button
          onClick={() => setShowFiles((v) => !v)}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            showFiles ? 'bg-zinc-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-white'
          }`}
        >
          📁 Archivos
        </button>

        {onUndo && (
          <button
            onClick={onUndo}
            className="px-2.5 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
          >
            ↩ Deshacer
          </button>
        )}

        <a
          href={generatedPage.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
        >
          ↗ Abrir
        </a>
      </div>

      {/* Files panel */}
      {showFiles && (
        <div className="bg-zinc-800/80 border-b border-zinc-700 px-4 py-3 shrink-0">
          <p className="text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wider">
            Archivos generados
          </p>
          <div className="space-y-1.5">
            {generatedPage.files.map((f) => (
              <div key={f.path} className="flex items-center justify-between gap-4">
                <span className="text-zinc-300 text-xs font-mono truncate">{f.path}</span>
                <span className="text-zinc-600 text-xs shrink-0">{f.lines} líneas</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test result banner */}
      {testResult && (
        <div
          className={`shrink-0 border-b px-4 py-3 text-xs ${
            testResult.passed
              ? 'bg-emerald-950/60 border-emerald-800'
              : 'bg-red-950/60 border-red-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>{testResult.passed ? '✅' : '❌'}</span>
            <span className="font-semibold text-white">
              {testResult.passed ? 'Tests pasados' : 'Issues encontrados'}
              {testResult.fixed && ' (auto-corregido)'}
            </span>
            {testResult.desktopScreenshot && (
              <button
                onClick={() => setShowScreenshots((v) => !v)}
                className="ml-auto text-zinc-400 hover:text-white"
              >
                {showScreenshots ? 'Ocultar screenshots' : 'Ver screenshots'}
              </button>
            )}
          </div>

          {testResult.issues.length > 0 && (
            <ul className="space-y-0.5 text-zinc-300 mt-1">
              {testResult.issues.map((issue, i) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          )}

          {testResult.consoleErrors.length > 0 && (
            <p className="text-red-400 mt-1">
              Errores JS: {testResult.consoleErrors.join(' | ')}
            </p>
          )}

          {showScreenshots && testResult.desktopScreenshot && (
            <div className="flex gap-3 mt-3 overflow-x-auto">
              <div>
                <p className="text-zinc-500 mb-1">Desktop</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${testResult.desktopScreenshot}`}
                  alt="Desktop screenshot"
                  className="h-48 rounded border border-zinc-700"
                />
              </div>
              <div>
                <p className="text-zinc-500 mb-1">Mobile</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${testResult.mobileScreenshot}`}
                  alt="Mobile screenshot"
                  className="h-48 rounded border border-zinc-700"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-zinc-900">
        {viewMode === 'desktop' ? (
          <iframe
            key={`${generatedPage.slug}-desktop`}
            src={generatedPage.previewUrl}
            className="w-full rounded-lg border border-zinc-700 bg-white"
            style={{ height: 'calc(100vh - 120px)', minHeight: '600px' }}
            title="Desktop preview"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="border-[6px] border-zinc-600 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white"
              style={{ width: '390px' }}
            >
              <iframe
                key={`${generatedPage.slug}-mobile`}
                src={generatedPage.previewUrl}
                style={{ width: '390px', height: '844px', display: 'block', border: 'none' }}
                title="Mobile preview"
              />
            </div>
            <p className="text-zinc-600 text-xs">390 × 844 px</p>
          </div>
        )}
      </div>
    </div>
  );
}
