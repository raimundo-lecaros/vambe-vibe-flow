import fs from 'fs/promises';
import path from 'path';
import { typecheckSlug } from './typecheck';
import { autoFix } from './auto-fixer';

const MAX_RETRIES = 2;

export async function verifyAndFix(
  slug: string,
  projectRoot: string,
  send: (data: unknown) => void
): Promise<void> {
  const slugDir = path.join(projectRoot, 'app/(generated)', slug);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    send({ type: 'agent_start', agent: 'Verificador' });
    const errors = await typecheckSlug(slugDir);

    if (errors.length === 0) {
      send({ type: 'agent_done', agent: 'Verificador', agentFiles: [] });
      return;
    }

    send({ type: 'agent_error', agent: 'Verificador', message: `${errors.length} error(s)` });
    send({ type: 'status', message: `AutoFix: corrigiendo ${errors.length} error(s)…` });
    send({ type: 'agent_start', agent: 'AutoFix' });

    const fixes = await autoFix(
      slugDir, slug, errors,
      (chunk) => send({ type: 'agent_log', agent: 'AutoFix', chunk })
    );

    const written: string[] = [];
    for (const file of fixes) {
      const abs = path.join(projectRoot, file.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, file.content, 'utf-8');
      written.push(file.path);
    }
    send({ type: 'agent_done', agent: 'AutoFix', agentFiles: written });
  }

  send({ type: 'agent_start', agent: 'Verificador' });
  const remaining = await typecheckSlug(slugDir);
  if (remaining.length === 0) {
    send({ type: 'agent_done', agent: 'Verificador', agentFiles: [] });
  } else {
    const msgs = remaining.slice(0, 3).map((e) => `${e.file}: ${e.message}`).join(' | ');
    send({ type: 'agent_error', agent: 'Verificador', message: msgs });
  }
}
