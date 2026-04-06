import type { DomMetrics } from './types';
import { KNOWN_ICON_NAMES } from './known-icons';

export async function collectDomMetrics(
  page: import('playwright').Page,
  consoleErrors: string[]
): Promise<DomMetrics> {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );

  const stuckAnimations = await page.evaluate((): string[] => {
    const stuck: string[] = [];
    document.querySelectorAll('[class*="animate-"]').forEach((el) => {
      const style = window.getComputedStyle(el);
      const animClass = Array.from(el.classList).find((c) => c.startsWith('animate-'));
      if (animClass && parseFloat(style.opacity) < 0.1 && style.animationPlayState !== 'running') {
        stuck.push(animClass);
      }
    });
    return [...new Set(stuck)];
  });

  const smallTapTargets = await page.evaluate((): number => {
    let count = 0;
    document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) count++;
    });
    return count;
  });

  const smallTextElements = await page.evaluate((): number => {
    let count = 0;
    document.querySelectorAll('p, span, li, h1, h2, h3, h4, label').forEach((el) => {
      const size = parseFloat(window.getComputedStyle(el).fontSize);
      if (size > 0 && size < 12) count++;
    });
    return count;
  });

  const brokenImages = await page.evaluate((): number => {
    let count = 0;
    document.querySelectorAll('img').forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) count++;
    });
    return count;
  });

  const knownIconNamesJSON = JSON.stringify([...KNOWN_ICON_NAMES]);
  const brokenIcons = await page.evaluate((knownIconNamesStr: string): string[] => {
    const knownIcons = new Set<string>(JSON.parse(knownIconNamesStr) as string[]);
    const kebabPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
    const found: string[] = [];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = (node.textContent ?? '').trim();
      if (!text || text.length < 3 || text.length > 32) continue;
      if (!kebabPattern.test(text)) continue;
      const parent = node.parentElement;
      if (!parent) continue;
      if (parent.closest('svg')) continue;
      if (parent.querySelector('svg')) continue;
      if (parent.closest('pre, code')) continue;
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (knownIcons.has(text)) found.push(text);
    }
    return [...new Set(found)].slice(0, 15);
  }, knownIconNamesJSON);

  const overlaps = await page.evaluate((): { elementA: string; elementB: string; overlapArea: number }[] => {
    const DECORATIVE_CLASSES = new Set(['absolute', 'fixed', 'relative', 'flex', 'grid', 'block', 'hidden', 'w-full', 'h-full', 'overflow-hidden', 'inset-0', 'pointer-events-none']);

    function elementLabel(el: Element): string {
      const tag = el.tagName.toLowerCase();
      const meaningfulClass = Array.from(el.classList).find((c) => !DECORATIVE_CLASSES.has(c)) ?? '';
      const text = (el.textContent ?? '').trim().slice(0, 18).replace(/\s+/g, ' ');
      return `${tag}${meaningfulClass ? `.${meaningfulClass}` : ''}${text ? `:"${text}"` : ''}`;
    }

    const SELECTORS = 'h1, h2, h3, h4, button, a[href], input, nav, [role="button"]';
    const elements = Array.from(document.querySelectorAll(SELECTORS))
      .map((el) => {
        const style = window.getComputedStyle(el);
        if (style.pointerEvents === 'none') return null;
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.1) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        if (rect.bottom < 0 || rect.top > window.innerHeight * 3) return null;
        return { el, rect, label: elementLabel(el) };
      })
      .filter(Boolean) as { el: Element; rect: DOMRect; label: string }[];

    const results: { elementA: string; elementB: string; overlapArea: number }[] = [];

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i];
        const b = elements[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

        const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        const area = xOverlap * yOverlap;
        if (area > 200) results.push({ elementA: a.label, elementB: b.label, overlapArea: Math.round(area) });
      }
    }

    return results.sort((a, b) => b.overlapArea - a.overlapArea).slice(0, 5);
  });

  return { hasHorizontalOverflow, consoleErrors, stuckAnimations, smallTapTargets, smallTextElements, brokenImages, brokenIcons, overlaps };
}
