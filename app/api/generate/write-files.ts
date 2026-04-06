import fs from 'fs/promises';
import path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ParsedResponse {
  files: GeneratedFile[];
  slug: string;
  summary: string;
  deps: string[];
}

export async function writeAndFinish(
  send: (data: unknown) => void,
  parsed: ParsedResponse,
  installedDeps: string[],
  requestedSlug: string | undefined,
  projectRoot: string
): Promise<void> {
  const slug = parsed.slug || requestedSlug || 'generated-page';
  const newDeps = parsed.deps.filter((d) => !installedDeps.includes(d));

  if (newDeps.length > 0) {
    send({
      type: 'missing_deps',
      deps: newDeps,
      slug,
      summary: parsed.summary,
      pendingFiles: parsed.files,
    });
    return;
  }

  send({ type: 'status', message: `Escribiendo ${parsed.files.length} archivo(s)…` });

  const writtenFiles: { path: string; lines: number }[] = [];
  for (const file of parsed.files) {
    const absolutePath = path.join(projectRoot, file.path);
    try {
      const existing = await fs.readFile(absolutePath, 'utf-8');
      if (existing === file.content) continue;
    } catch { /* new file */ }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.content, 'utf-8');
    writtenFiles.push({ path: file.path, lines: file.content.split('\n').length });
    send({ type: 'status', message: `Escribió ${file.path}` });
  }

  send({
    type: 'done',
    slug,
    previewUrl: `/${slug}`,
    files: writtenFiles,
    summary: parsed.summary,
  });
}
