import fs from 'fs/promises';
import path from 'path';

export interface RuntimeViolation {
  file: string;
  rule: string;
}

export async function checkRuntimeRules(slugDir: string): Promise<RuntimeViolation[]> {
  const violations: RuntimeViolation[] = [];
  const files = await getAllTsxFiles(slugDir);

  for (const file of files) {
    let content: string;
    try { content = await fs.readFile(file, 'utf-8'); } catch { continue; }

    const rel = path.relative(slugDir, file).replace(/\\/g, '/');
    const parts = rel.split('/');

    if (isComponentFile(rel)) {
      if (/export\s+default\s+function\s+\w+\s*\(\s*\{\s*\bdata\b/.test(content)) {
        violations.push({ file: rel, rule: "Component receives 'data' as prop — must import directly from data/content" });
      }

      if (/\{[^{}]*\.iconKey[^{}]*\}/.test(content) && !content.includes('ICON_MAP')) {
        violations.push({ file: rel, rule: "iconKey rendered directly as string — create ICON_MAP to render Lucide components" });
      }
    }

    const isSubComponent = parts.length >= 3 && parts[0] === 'components' && path.basename(rel) !== 'index.tsx';
    if (isSubComponent && /^['"]use client['"]/.test(content.trimStart())) {
      violations.push({ file: rel, rule: "'use client' in sub-component — move to index.tsx of the same folder only" });
    }
  }

  return violations;
}

function isComponentFile(rel: string): boolean {
  return rel.startsWith('components/') && !rel.includes('data/');
}

async function getAllTsxFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(dir, { recursive: true });
    for (const e of entries) {
      const s = e.toString();
      if (s.endsWith('.ts') || s.endsWith('.tsx')) files.push(path.join(dir, s));
    }
  } catch { /* dir not ready */ }
  return files;
}
