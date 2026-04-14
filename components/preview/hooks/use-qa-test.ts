'use client';

import { useState } from 'react';
import type { TestResult, GeneratedPage } from '../types';
import type { Issue } from '@/lib/visual-tester';

export function useQATest(
  generatedPage: GeneratedPage | null,
  isGenerating: boolean,
  onApplyFixes?: (issues: Issue[]) => void
) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState<'desktop' | 'desktop2' | 'mobile' | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

  void isGenerating;

  const handleAutoTest = async () => {
    if (!generatedPage) return;
    setShowPanel(true);
    setIsTesting(true);
    setTestResult(null);
    setSelectedIssueIds(new Set());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);
      let res: Response;
      try {
        res = await fetch('/api/test-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: generatedPage.slug }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const json = (await res.json()) as TestResult & { error?: string };
      if (!res.ok || json.error) {
        setTestResult({
          desktopScreenshot: '', mobileScreenshot: '', desktopScreenshot2: '',
          issues: [{ id: `runner-error-${Date.now()}`, component: 'Test Runner', category: 'error', severity: 'critical',
            description: `Playwright falló: ${json.error ?? `HTTP ${res.status}`}`,
            fixHint: 'Ejecutar: npx playwright install --with-deps',
          }],
          domMetrics: { hasHorizontalOverflow: false, consoleErrors: [], stuckAnimations: [], smallTapTargets: 0, smallTextElements: 0, brokenImages: 0, brokenIcons: [], overlaps: [] },
          passed: false,
        });
        return;
      }
      setTestResult(json);
      setSelectedIssueIds(new Set(
        (json.issues ?? []).filter((i) => i.severity === 'critical' || i.severity === 'warning').map((i) => i.id)
      ));
    } catch (err) {
      const errMsg = err instanceof Error && err.name === 'AbortError' ? 'Timeout de 2 minutos' : String(err);
      setTestResult({
        desktopScreenshot: '', mobileScreenshot: '', desktopScreenshot2: '',
        issues: [{ id: `runner-error-${Date.now()}`, component: 'Test Runner', category: 'error', severity: 'critical',
          description: `Error: ${errMsg}`, fixHint: 'Verificar que el servidor esté corriendo en localhost:3000',
        }],
        domMetrics: { hasHorizontalOverflow: false, consoleErrors: [], stuckAnimations: [], smallTapTargets: 0, smallTextElements: 0, brokenImages: 0, brokenIcons: [], overlaps: [] },
        passed: false,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const toggleIssue = (id: string) => {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleApplySelected = () => {
    if (!testResult || selectedIssueIds.size === 0) return;
    onApplyFixes?.(testResult.issues.filter((i) => selectedIssueIds.has(i.id)));
  };

  return {
    testResult, isTesting, showPanel, setShowPanel,
    screenshotMode, setScreenshotMode,
    selectedIssueIds, setSelectedIssueIds,
    handleAutoTest, toggleIssue, handleApplySelected,
  };
}
