import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { testPage } from '@/lib/visual-tester';

export async function POST(request: NextRequest) {
  try {
    const { slug } = (await request.json()) as { slug: string };

    // Read source files to give the consultant full context
    const sourceFiles: { path: string; content: string }[] = [];
    const slugDir = path.join(process.cwd(), 'app/(generated)', slug);

    try {
      const entries = await fs.readdir(slugDir, { recursive: true });
      for (const entry of entries) {
        const entryStr = entry.toString();
        if (entryStr.endsWith('.tsx') || entryStr.endsWith('.ts')) {
          try {
            const content = await fs.readFile(path.join(slugDir, entryStr), 'utf-8');
            sourceFiles.push({ path: `app/(generated)/${slug}/${entryStr}`, content });
          } catch { /* skip */ }
        }
      }
    } catch { /* directory doesn't exist */ }

    const result = await testPage(slug, sourceFiles);
    return Response.json(result);
  } catch (error) {
    console.error('[test-page] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
