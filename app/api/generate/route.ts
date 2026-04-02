import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { CODEGEN_SYSTEM_PROMPT } from '@/lib/codegen-prompt';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CREATIVITY_PREFIXES: Record<string, string> = {
  disruptive:
    'Sé audaz. Layout no convencional. Al menos 1 componente tiene que ser algo inesperado en una landing típica.',
  corporate: 'Diseño limpio y conservador. Sin overlaps ni riesgos.',
  modern: 'Contemporáneo con personalidad. Mezcla fondos y formas.',
};

interface GeneratedFile {
  path: string;
  content: string;
}

interface ParsedResponse {
  files: GeneratedFile[];
  slug: string;
  summary: string;
}

type MessageContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | MessageContentBlock[];
}

function parseResponse(text: string): ParsedResponse {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  return JSON.parse(jsonMatch[0]) as ParsedResponse;
}

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function streamClaude(
  messages: ApiMessage[],
  temperature: number,
  onChunk: (text: string) => void
): Promise<string> {
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    temperature,
    system: CODEGEN_SYSTEM_PROMPT,
    messages: messages as Anthropic.MessageParam[],
  });

  let full = '';
  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      full += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }
  return full;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(sse(data)));

      try {
        const body = (await request.json()) as {
          messages: ApiMessage[];
          slug?: string;
          creativityMode?: string;
          pageType?: string;
          imageBase64?: string;
          mediaType?: string;
        };

        const {
          messages,
          slug: requestedSlug,
          creativityMode = 'modern',
          pageType,
          imageBase64,
          mediaType,
        } = body;

        const prefix = CREATIVITY_PREFIXES[creativityMode] ?? '';
        const temperature = creativityMode === 'disruptive' ? 0.8 : 0.3;

        const anthropicMessages: ApiMessage[] = messages.map((m) => ({ ...m }));
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];

        if (lastMsg && lastMsg.role === 'user') {
          const originalText =
            typeof lastMsg.content === 'string'
              ? lastMsg.content
              : (
                  lastMsg.content.find(
                    (c) => c.type === 'text'
                  ) as { type: 'text'; text: string } | undefined
                )?.text ?? '';

          const prefixed = [
            pageType ? `Tipo de página: ${pageType}` : '',
            prefix,
            originalText,
          ]
            .filter(Boolean)
            .join('\n\n');

          if (imageBase64) {
            lastMsg.content = [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType ?? 'image/jpeg',
                  data: imageBase64,
                },
              },
              { type: 'text', text: prefixed },
            ];
          } else {
            lastMsg.content = prefixed;
          }
        }

        send({ type: 'status', message: 'Conectando con Claude…' });

        let charCount = 0;
        let responseText = '';

        try {
          responseText = await streamClaude(
            anthropicMessages,
            temperature,
            (chunk) => {
              charCount += chunk.length;
              send({ type: 'progress', chars: charCount });
            }
          );
        } catch (streamErr) {
          send({ type: 'status', message: `Error en stream, reintentando… (${String(streamErr)})` });
          // fallback: non-streaming retry
          const resp = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 16000,
            temperature,
            system: CODEGEN_SYSTEM_PROMPT,
            messages: anthropicMessages as Anthropic.MessageParam[],
          });
          const tb = resp.content.find((c) => c.type === 'text');
          responseText = tb && tb.type === 'text' ? tb.text : '';
        }

        send({ type: 'status', message: 'Parseando archivos…' });

        let parsed: ParsedResponse;
        try {
          parsed = parseResponse(responseText);
        } catch (parseErr) {
          // Retry with error context
          send({ type: 'status', message: 'Reintentando parseo…' });
          anthropicMessages.push({ role: 'assistant', content: responseText });
          anthropicMessages.push({
            role: 'user',
            content: `Error al parsear: ${String(parseErr)}. Respondé SOLO con el JSON válido, sin texto adicional.`,
          });
          charCount = 0;
          responseText = await streamClaude(anthropicMessages, temperature, (chunk) => {
            charCount += chunk.length;
            send({ type: 'progress', chars: charCount });
          });
          parsed = parseResponse(responseText);
        }

        const slug = parsed.slug || requestedSlug || 'generated-page';
        const projectRoot = process.cwd();

        send({ type: 'status', message: `Escribiendo ${parsed.files.length} archivo(s)…` });

        const writtenFiles: { path: string; lines: number }[] = [];
        for (const file of parsed.files) {
          const absolutePath = path.join(projectRoot, file.path);
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
      } catch (error) {
        console.error('[generate] error:', error);
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
