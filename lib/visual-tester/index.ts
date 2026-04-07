import { chromium } from 'playwright';
import { collectDomMetrics } from './dom-metrics';
import { analyzeWithConsultant } from './claude-analysis';
import type { Issue, DomMetrics, TestResult } from './types';

export { analyzeWithConsultant } from './claude-analysis';
export type { Issue, DomMetrics, TestResult } from './types';

const MAX_SCREENSHOT_HEIGHT = 7000;

async function captureScreenshot(page: import('playwright').Page, width: number): Promise<string> {
  const fullHeight = await page.evaluate(() => document.body.scrollHeight);
  const height = Math.min(fullHeight, MAX_SCREENSHOT_HEIGHT);
  const buffer = await page.screenshot({
    clip: { x: 0, y: 0, width, height },
    type: 'jpeg',
    quality: 80,
  });
  return buffer.toString('base64');
}

export async function testPage(
  slug: string,
  sourceFiles: { path: string; content: string }[] = []
): Promise<TestResult> {
  const browser = await chromium.launch();
  const consoleErrors: string[] = [];

  try {
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopCtx.newPage();
    desktopPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await desktopPage.goto(`http://localhost:3000/${slug}`, { waitUntil: 'networkidle', timeout: 20000 });

    const domMetrics = await collectDomMetrics(desktopPage, consoleErrors);
    const desktopScreenshot = await captureScreenshot(desktopPage, 1440);

    await desktopPage.waitForTimeout(2000);
    const desktopScreenshot2 = await captureScreenshot(desktopPage, 1440);
    await desktopCtx.close();

    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(`http://localhost:3000/${slug}`, { waitUntil: 'networkidle', timeout: 20000 });
    const mobileScreenshot = await captureScreenshot(mobilePage, 390);
    await mobileCtx.close();

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

    domMetrics.overlaps.forEach((o, i) => {
      domIssues.push({
        id: `dom-overlap-${ts}-${i}`,
        component: 'Layout',
        category: 'layout',
        severity: 'warning',
        description: `Superposición de ${o.overlapArea}px² entre "${o.elementA}" y "${o.elementB}". Playwright midió intersección real de píxeles.`,
        fixHint: `Encontrá el elemento "${o.elementA}" en el código (buscá por el texto o la clase). Agregá position:relative y ajustá z-index, margin o padding para que no se superpongan con "${o.elementB}". Si uno es absolute/fixed, verificar que no tape elementos interactivos.`,
      });
    });

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

    const claudeIssues = await analyzeWithConsultant(
      desktopScreenshot,
      mobileScreenshot,
      desktopScreenshot2,
      domMetrics,
      sourceFiles
    );

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
