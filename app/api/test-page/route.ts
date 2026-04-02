import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { testPage } from '@/lib/visual-tester';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { slug } = (await request.json()) as { slug: string };
    const result = await testPage(slug);

    if (!result.passed && result.issues.length > 0) {
      const slugDir = path.join(process.cwd(), 'app/(generated)', slug);

      try {
        const entries = await fs.readdir(slugDir, { recursive: true });
        const codeFiles: string[] = [];

        for (const entry of entries) {
          const entryStr = entry.toString();
          if (entryStr.endsWith('.tsx') || entryStr.endsWith('.ts')) {
            const filePath = path.join(slugDir, entryStr);
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              codeFiles.push(`// ${entryStr}\n${content}`);
            } catch {
              // skip unreadable files
            }
          }
        }

        const fixResponse = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: `Hay issues en la landing generada para el slug "${slug}".

Issues encontrados: ${JSON.stringify(result.issues)}
Errores de consola: ${JSON.stringify(result.consoleErrors)}
Overflow horizontal: ${result.hasHorizontalOverflow}

Código actual:
${codeFiles.join('\n\n---\n\n')}

Corregí los issues y respondé con el mismo formato JSON:
{"files":[{"path":"...","content":"..."}],"slug":"${slug}","summary":"fixes aplicados"}`,
            },
          ],
        });

        const textBlock = fixResponse.content.find((c) => c.type === 'text');
        if (textBlock && textBlock.type === 'text') {
          const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as {
              files: { path: string; content: string }[];
            };
            for (const file of parsed.files) {
              const absolutePath = path.join(process.cwd(), file.path);
              await fs.mkdir(path.dirname(absolutePath), { recursive: true });
              await fs.writeFile(absolutePath, file.content, 'utf-8');
            }
            return Response.json({ ...result, fixed: true });
          }
        }
      } catch (readErr) {
        console.error('[test-page] could not read/fix files:', readErr);
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('[test-page] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
