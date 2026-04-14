import { chromium } from 'playwright';

const VIEWPORT = { width: 1440, height: 900 };
const SCROLL_RATIOS = [0, 0.35, 0.65];

export async function capturePageScreenshots(url: string): Promise<string[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize(VIEWPORT);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    const pageHeight = await page.evaluate(() => Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    ));

    const screenshots: string[] = [];
    for (const ratio of SCROLL_RATIOS) {
      const scrollY = Math.floor((pageHeight - VIEWPORT.height) * ratio);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
      await page.waitForTimeout(400);
      const buffer = await page.screenshot({ type: 'jpeg', quality: 82 });
      screenshots.push(buffer.toString('base64'));
    }

    return screenshots;
  } finally {
    await browser.close();
  }
}
