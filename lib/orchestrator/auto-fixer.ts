import fs from 'fs/promises';
import path from 'path';
import { client, parseFilesFromText } from './helpers';
import type { GeneratedFile } from './types';
import type { TsError } from './typecheck';
import type { RuntimeViolation } from './runtime-rules';

export async function autoFix(
  slugDir: string,
  slug: string,
  errors: TsError[],
  violations: RuntimeViolation[],
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const allFiles = await loadAllFiles(slugDir, slug);
  const errorList = errors.map((e) => `- ${e.file}${e.line ? `:${e.line}` : ''}: ${e.message}`).join('\n');
  const violationList = violations.map((v) => `- ${v.file}: ${v.rule}`).join('\n');

  const sections: string[] = [];
  if (errorList) sections.push(`TypeScript errors:\n${errorList}`);
  if (violationList) sections.push(`Runtime violations:\n${violationList}`);

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    temperature: 0,
    system: `Eres un experto en TypeScript/Next.js App Router. Corregís errores en componentes React generados.

ERRORES QUE DEBES MANEJAR:
- TypeScript: undefined access, tipo incorrecto, export no encontrado, módulo no encontrado
- Props pattern: si un componente recibe data como prop, conviértelo a import directo
  MAL:  export default function Hero({ data }: { data: HeroData }) { ... }
  BIEN: import { HERO_DATA } from '../data/content'
        export default function Hero() { const data = HERO_DATA; ... }
- 'use client' en sub-componente: moverlo solo a index.tsx del directorio padre, sacarlo del sub-componente
- iconKey sin ICON_MAP: crear ICON_MAP que mapee el string al componente Lucide real
- Export name mismatch: asegurate que el nombre importado coincide exactamente con el exportado en data/content

REGLAS:
- Modificá solo lo necesario para resolver cada error
- Devolvé SOLO los archivos que modificás, completos
- Formato de salida: ===FILE: ruta===...===ENDFILE===`,
    messages: [{
      role: 'user',
      content: `${sections.join('\n\n')}\n\nTodos los archivos del proyecto:\n${allFiles}`,
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

async function loadAllFiles(slugDir: string, slug: string): Promise<string> {
  const sections: string[] = [];
  try {
    const entries = await fs.readdir(slugDir, { recursive: true });
    for (const e of entries) {
      const s = e.toString();
      if (!s.endsWith('.ts') && !s.endsWith('.tsx')) continue;
      try {
        const content = await fs.readFile(path.join(slugDir, s), 'utf-8');
        sections.push(`===FILE: app/(generated)/${slug}/${s}===\n${content}\n===ENDFILE===`);
      } catch { /* skip */ }
    }
  } catch { /* dir not ready */ }
  return sections.join('\n\n');
}
