import { chromium } from 'playwright';
import { collectDomMetrics } from './dom-metrics';
import { analyzeWithConsultant } from './claude-analysis';
import type { Issue, DomMetrics, TestResult } from './types';

export { analyzeWithConsultant } from './claude-analysis';
export type { Issue, DomMetrics, TestResult } from './types';

export async function testPage(
  slug: string,
  sourceFiles: { path: string; content: string }[] = []
): Promise<TestResult> {
  const browser = await chromium.launch();
  const consoleErrors: string[] = [];

  try {
    // ── Desktop pass 1 ────────────────────────────────────────────────────
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopCtx.newPage();
    desktopPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await desktopPage.goto(`http://localhost:3000/${slug}`, { waitUntil: 'networkidle', timeout: 20000 });

    const domMetrics = await collectDomMetrics(desktopPage, consoleErrors);

    const desktopBuffer = await desktopPage.screenshot({ fullPage: true, type: 'jpeg', quality: 85 });
    const desktopScreenshot = desktopBuffer.toString('base64');

    // ── Desktop pass 2 (after 2s for animations) ──────────────────────────
    await desktopPage.waitForTimeout(2000);
    const desktop2Buffer = await desktopPage.screenshot({ fullPage: true, type: 'jpeg', quality: 85 });
    const desktopScreenshot2 = desktop2Buffer.toString('base64');
    await desktopCtx.close();

    // ── Mobile pass ───────────────────────────────────────────────────────
    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(`http://localhost:3000/${slug}`, { waitUntil: 'networkidle', timeout: 20000 });
    const mobileBuffer = await mobilePage.screenshot({ fullPage: true, type: 'jpeg', quality: 85 });
    const mobileScreenshot = mobileBuffer.toString('base64');
    await mobileCtx.close();

    // ── Auto-inject deterministic DOM issues ──────────────────────────────
    const domIssues: Issue[] = [];
    const ts = Date.now();

    if (domMetrics.brokenIcons.length > 0) {
      domIssues.push({
        id: `dom-icons-${ts}`,
        component: 'Iconos',
        category: 'error',
        severity: 'critical',
        description: `${domMetrics.brokenIcons.length} íconos renderizan como texto plano: ${domMetrics.brokenIcons.join(', ')}. El código guarda el nombre del ícono como string en data/content.ts y el componente lo renderiza directamente.`,
        fixHint: 'En el componente .tsx, crear un ICON_MAP: Record<string, React.ReactNode> con named imports de lucide-react. Nunca guardar el nombre del ícono como string en data/content.ts — usar iconKey: string y mapear en el componente.',
      });
    }

    for (const o of domMetrics.overlaps) {
      domIssues.push({
        id: `dom-overlap-${ts}-${o.elementA}`,
        component: 'Layout',
        category: 'layout',
        severity: 'warning',
        description: `Superposición de ${o.overlapArea}px² entre "${o.elementA}" y "${o.elementB}". Playwright detectó intersección real de píxeles entre estos elementos.`,
        fixHint: 'Revisar z-index, position (relative/absolute/fixed) y padding de los elementos superpuestos. Si uno es sticky o fixed, verificar que no tape contenido scrollable.',
      });
    }

    if (domMetrics.hasHorizontalOverflow) {
      domIssues.push({
        id: `dom-overflow-${ts}`,
        component: 'Layout',
        category: 'layout',
        severity: 'critical',
        description: 'Overflow horizontal: la página tiene scroll lateral (scrollWidth > window.innerWidth). Algún elemento sale del viewport.',
        fixHint: 'Agregar overflow-x: hidden al body o al contenedor principal. Buscar elementos con width fijo mayor al viewport o con margin/padding negativo.',
      });
    }

    // ── Consultant analysis ───────────────────────────────────────────────
    const claudeIssues = await analyzeWithConsultant(
      desktopScreenshot,
      mobileScreenshot,
      desktopScreenshot2,
      domMetrics,
      sourceFiles
    );

    // Merge: DOM issues first (facts), then Claude issues
    const issues = [
      ...domIssues,
      ...claudeIssues.filter(ci => {
        if (domMetrics.brokenIcons.length > 0 && ci.category === 'error' && /icon/i.test(ci.description)) return false;
        return true;
      }),
    ].slice(0, 8);

    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const hasErrors =
      domMetrics.hasHorizontalOverflow ||
      domMetrics.consoleErrors.length > 0 ||
      domMetrics.stuckAnimations.length > 0 ||
      domMetrics.brokenIcons.length > 0 ||
      domMetrics.overlaps.length > 0 ||
      criticalCount > 0;

    return {
      desktopScreenshot,
      mobileScreenshot,
      desktopScreenshot2,
      issues,
      domMetrics,
      passed: !hasErrors,
    };
  } finally {
    await browser.close();
  }
}
