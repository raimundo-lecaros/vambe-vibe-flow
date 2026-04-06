'use client';

import { useState, useEffect, useRef } from 'react';
import type { TestResult, GeneratedPage } from '../types';
import type { Issue } from '@/lib/visual-tester';

export function useQATest(
  generatedPage: GeneratedPage | null,
  isGenerating: boolean,
  onApplyFixes?: (issues: Issue[]) => void
) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState<'desktop' | 'desktop2' | 'mobile' | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const prevSlugRef = useRef<string | null>(null);

  const handleAutoTest = async () => {
    if (!generatedPage) return;
    setIsTesting(true);
    setTestResult(null);
    setSelectedIssueIds(new Set());
    try {
      const res = await fetch('/api/test-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: generatedPage.slug }),
      });
      const json = (await res.json()) as TestResult & { error?: string };

      if (!res.ok || json.error) {
        setTestResult({
          desktopScreenshot: '',
          mobileScreenshot: '',
          desktopScreenshot2: '',
          issues: [{
            id: `runner-error-${Date.now()}`,
            component: 'Test Runner',
            category: 'error',
            severity: 'critical',
            description: `Playwright falló: ${json.error ?? `HTTP ${res.status}`}. Verificá que Playwright esté instalado y que el servidor esté corriendo.`,
            fixHint: 'Ejecutar: npx playwright install --with-deps. Si el error persiste, revisar los logs del servidor.',
          }],
          domMetrics: { hasHorizontalOverflow: false, consoleErrors: [], stuckAnimations: [], smallTapTargets: 0, smallTextElements: 0, brokenImages: 0, brokenIcons: [], overlaps: [] },
          passed: false,
        });
        return;
      }

      setTestResult(json);
      const autoSelected = new Set(
        (json.issues ?? [])
          .filter((i) => i.severity === 'critical' || i.severity === 'warning')
          .map((i) => i.id)
      );
      setSelectedIssueIds(autoSelected);
    } catch (err) {
      console.error('Auto-test failed:', err);
      setTestResult({
        desktopScreenshot: '',
        mobileScreenshot: '',
        desktopScreenshot2: '',
        issues: [{
          id: `runner-error-${Date.now()}`,
          component: 'Test Runner',
          category: 'error',
          severity: 'critical',
          description: `Error de red al llamar al test runner: ${String(err)}`,
          fixHint: 'Verificar que el servidor Next.js esté corriendo en localhost:3000',
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplySelected = () => {
    if (!testResult || selectedIssueIds.size === 0) return;
    const selected = testResult.issues.filter((i) => selectedIssueIds.has(i.id));
    onApplyFixes?.(selected);
  };

  // Auto-run QA when a new page is generated (3s delay for Next.js compilation)
  useEffect(() => {
    if (!generatedPage || generatedPage.slug === prevSlugRef.current) return;
    prevSlugRef.current = generatedPage.slug;
    setTestResult(null);
    const timer = setTimeout(() => void handleAutoTest(), 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedPage?.slug]);

  // Suppress unused warning — isGenerating used by callers to disable apply button
  void isGenerating;

  return {
    testResult,
    isTesting,
    screenshotMode,
    setScreenshotMode,
    selectedIssueIds,
    setSelectedIssueIds,
    handleAutoTest,
    toggleIssue,
    handleApplySelected,
  };
}
