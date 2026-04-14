import fs from 'fs/promises';
import path from 'path';
import { typecheckSlug } from './typecheck';
import { checkRuntimeRules } from './runtime-rules';
import { autoFix } from './auto-fixer';

const MAX_RETRIES = 2;
const VERIFY_DISPLAY_MS = 2800;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function verifyAndFix(
  slug: string,
  projectRoot: string,
  rawSend: (data: unknown) => void
): Promise<void> {
  let closed = false;
  const send = (data: unknown) => { if (!closed) { try { rawSend(data); } catch { closed = true; } } };
  const slugDir = path.join(projectRoot, 'app/(generated)', slug);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    send({ type: 'agent_start', agent: 'Verificador' });
    const [errors,, violations] = await Promise.all([
      typecheckSlug(slugDir, projectRoot),
      sleep(VERIFY_DISPLAY_MS),
      checkRuntimeRules(slugDir),
    ]);

    if (errors.length === 0 && violations.length === 0) {
      send({ type: 'agent_done', agent: 'Verificador', agentFiles: [] });
      return;
    }

    const total = errors.length + violations.length;
    send({ type: 'agent_error', agent: 'Verificador', message: `${total} issue(s)` });
    send({ type: 'status', message: `AutoFix: corrigiendo ${total} issue(s)…` });
    send({ type: 'agent_start', agent: 'AutoFix' });

    const fixes = await autoFix(
      slugDir, slug, errors, violations,
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
  const [remaining,, finalViolations] = await Promise.all([
    typecheckSlug(slugDir, projectRoot),
    sleep(VERIFY_DISPLAY_MS),
    checkRuntimeRules(slugDir),
  ]);

  const allRemaining = [
    ...remaining,
    ...finalViolations.map((v) => ({ file: v.file, message: v.rule })),
  ];

  if (allRemaining.length === 0) {
    send({ type: 'agent_done', agent: 'Verificador', agentFiles: [] });
  } else {
    const msgs = allRemaining.slice(0, 3).map((e) => `${e.file}: ${e.message}`).join(' | ');
    send({ type: 'agent_error', agent: 'Verificador', message: msgs });
  }
}
