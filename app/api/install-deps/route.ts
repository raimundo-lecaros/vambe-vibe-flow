import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PendingFile {
  path: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { deps, pendingFiles, slug, summary } = (await request.json()) as {
      deps: string[];
      pendingFiles: PendingFile[];
      slug: string;
      summary: string;
    };

    if (deps.length > 0) {
      await execAsync(`npm install ${deps.map((d) => JSON.stringify(d)).join(' ')}`, {
        cwd: process.cwd(),
        timeout: 120000,
      });
    }

    const writtenFiles: { path: string; lines: number }[] = [];
    for (const file of pendingFiles) {
      const absolutePath = path.join(process.cwd(), file.path);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, file.content, 'utf-8');
      writtenFiles.push({ path: file.path, lines: file.content.split('\n').length });
    }

    return Response.json({
      slug,
      previewUrl: `/${slug}`,
      files: writtenFiles,
      summary,
      installedDeps: deps,
    });
  } catch (error) {
    console.error('[install-deps] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
