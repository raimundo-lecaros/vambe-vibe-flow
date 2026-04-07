import fs from 'fs/promises';
import path from 'path';

export interface TsError {
  file: string;
  message: string;
}

async function getAllTsFiles(dir: string): Promise<string[]> {
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

function parseImports(content: string): { names: string[]; source: string; isDefault: boolean }[] {
  const results: { names: string[]; source: string; isDefault: boolean }[] = [];
  for (const m of content.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)) {
    const names = m[1].split(',').map((n) => n.replace(/type\s+/, '').trim()).filter(Boolean);
    results.push({ names, source: m[2], isDefault: false });
  }
  for (const m of content.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)) {
    results.push({ names: [m[1]], source: m[2], isDefault: true });
  }
  return results;
}

function getExports(content: string): Set<string> {
  const exports = new Set<string>(['default']);
  for (const m of content.matchAll(/export\s+(?:const|interface|type|function|class|enum)\s+(\w+)/g)) exports.add(m[1]);
  for (const m of content.matchAll(/export\s+\{([^}]+)\}/g)) {
    for (const name of m[1].split(',')) exports.add(name.trim().split(/\s+as\s+/).pop()!.trim());
  }
  return exports;
}

async function resolveImport(fromFile: string, source: string): Promise<string | null> {
  if (!source.startsWith('.')) return null;
  const dir = path.dirname(fromFile);
  const base = path.join(dir, source);
  for (const candidate of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    try { await fs.access(candidate); return candidate; } catch { /* try next */ }
  }
  return null;
}

export async function typecheckSlug(slugDir: string): Promise<TsError[]> {
  const errors: TsError[] = [];
  const files = await getAllTsFiles(slugDir);

  for (const file of files) {
    let content: string;
    try { content = await fs.readFile(file, 'utf-8'); } catch { continue; }

    const relFile = path.relative(slugDir, file);
    for (const imp of parseImports(content)) {
      if (!imp.source.startsWith('.')) continue;

      const resolved = await resolveImport(file, imp.source);
      if (!resolved) {
        errors.push({ file: relFile, message: `Cannot find module '${imp.source}'` });
        continue;
      }

      if (!imp.isDefault) {
        let targetContent: string;
        try { targetContent = await fs.readFile(resolved, 'utf-8'); } catch { continue; }
        const exports = getExports(targetContent);
        for (const name of imp.names) {
          if (name && !exports.has(name)) {
            const available = [...exports].filter((e) => e !== 'default').slice(0, 8).join(', ');
            errors.push({ file: relFile, message: `'${imp.source}' has no export '${name}'. Available: ${available}` });
          }
        }
      }
    }
  }
  return errors;
}
