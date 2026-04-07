import fs from 'fs/promises';
import path from 'path';
import { client, parseFilesFromText } from './helpers';
import type { GeneratedFile } from './types';
import type { TsError } from './typecheck';

export async function autoFix(
  slugDir: string,
  slug: string,
  errors: TsError[],
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const byFile = new Map<string, string[]>();
  for (const err of errors) {
    const list = byFile.get(err.file) ?? [];
    list.push(err.message);
    byFile.set(err.file, list);
  }

  const fileSections: string[] = [];
  for (const [relPath] of byFile) {
    try {
      const content = await fs.readFile(path.join(slugDir, relPath), 'utf-8');
      fileSections.push(`===FILE: app/(generated)/${slug}/${relPath}===\n${content}\n===ENDFILE===`);
    } catch { /* skip */ }
  }

  try {
    const ref = await fs.readFile(path.join(slugDir, 'data/content.ts'), 'utf-8');
    fileSections.push(`===REFERENCE: data/content.ts (solo lectura, no modificar)===\n${ref}\n===ENDREFERENCE===`);
  } catch { /* skip */ }

  const errorList = errors.map((e) => `- ${e.file}: ${e.message}`).join('\n');

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    temperature: 0,
    system: `Eres un experto en TypeScript/Next.js. Corregís errores de imports y exports.
REGLAS:
- Modificá SOLO lo mínimo para resolver cada error
- Devolvé SOLO los archivos que modificás, completos
- Para "has no export 'X'": usá el nombre correcto de la lista "Available:"
- Para "Cannot find module": corregí la ruta relativa
- Formato de salida: ===FILE: ruta===...===ENDFILE===`,
    messages: [{
      role: 'user',
      content: `Errores a corregir:\n${errorList}\n\nArchivos:\n${fileSections.join('\n\n')}`,
    }],
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }
  return parseFilesFromText(fullText);
}
