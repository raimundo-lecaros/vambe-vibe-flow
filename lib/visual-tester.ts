import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TestResult {
  desktopScreenshot: string;
  mobileScreenshot: string;
  consoleErrors: string[];
  hasHorizontalOverflow: boolean;
  issues: string[];
  passed: boolean;
}

export async function analyzeWithVision(
  desktopB64: string,
  mobileB64: string,
  errors: string[]
): Promise<string[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: desktopB64 },
          },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: mobileB64 },
          },
          {
            type: 'text',
            text: `QA engineer de Vambe. Analizá estos screenshots (desktop y mobile).
Listá SOLO problemas concretos:
overflow, contraste bajo, botones pequeños en mobile,
padding inconsistente, errores JS: ${JSON.stringify(errors)}
Responder con array JSON de strings. Ejemplo: ["problema 1", "problema 2"]`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  const text = textBlock && textBlock.type === 'text' ? textBlock.text : '[]';
  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return text ? [text] : [];
  }
}

export async function testPage(slug: string): Promise<TestResult> {
  const browser = await chromium.launch();
  const consoleErrors: string[] = [];

  try {
    // Desktop pass
    const desktopCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const desktopPage = await desktopCtx.newPage();

    desktopPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await desktopPage.goto(`http://localhost:3000/${slug}`, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    const desktopBuffer = await desktopPage.screenshot({ fullPage: true });
    const desktopScreenshot = desktopBuffer.toString('base64');

    const hasHorizontalOverflow = await desktopPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );

    await desktopCtx.close();

    // Mobile pass
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobilePage = await mobileCtx.newPage();

    await mobilePage.goto(`http://localhost:3000/${slug}`, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    const mobileBuffer = await mobilePage.screenshot({ fullPage: true });
    const mobileScreenshot = mobileBuffer.toString('base64');

    await mobileCtx.close();

    // Vision analysis only when needed
    let issues: string[] = [];
    if (hasHorizontalOverflow || consoleErrors.length > 0) {
      issues = await analyzeWithVision(desktopScreenshot, mobileScreenshot, consoleErrors);
    }

    const passed = !hasHorizontalOverflow && consoleErrors.length === 0 && issues.length === 0;

    return {
      desktopScreenshot,
      mobileScreenshot,
      consoleErrors,
      hasHorizontalOverflow,
      issues,
      passed,
    };
  } finally {
    await browser.close();
  }
}
