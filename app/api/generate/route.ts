import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { orchestrate, orchestrateEdit, type OrchestratorEvent } from '@/lib/orchestrator';
import { writeAndFinish, type ParsedResponse } from './write-files';

const CREATIVITY_PREFIXES: Record<string, string> = {
  disruptive: 'Sé audaz. Layout no convencional. Al menos 1 componente tiene que ser algo inesperado en una landing típica.',
  corporate: 'Diseño limpio y conservador. Sin overlaps ni riesgos.',
  modern: 'Contemporáneo con personalidad. Mezcla fondos y formas.',
};

interface SelectedElement {
  tag: string;
  text: string;
  classes: string[];
  outerHTMLSnippet: string;
}

type MessageContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | MessageContentBlock[];
}

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function makeOnEvent(resultRef: { value: ParsedResponse | null }, send: (data: unknown) => void) {
  return (event: OrchestratorEvent) => {
    if (event.type === 'status') send({ type: 'status', message: event.message });
    else if (event.type === 'agent_start') send({ type: 'agent_start', agent: event.agent });
    else if (event.type === 'agent_done') send({ type: 'agent_done', agent: event.agent, agentFiles: event.files });
    else if (event.type === 'agent_error') send({ type: 'agent_error', agent: event.agent, message: event.message });
    else if (event.type === 'agent_log') send({ type: 'agent_log', agent: event.agent, chunk: event.chunk });
    else if (event.type === 'result') {
      resultRef.value = { files: event.files, slug: event.slug, summary: event.summary, deps: event.newDeps };
    }
  };
}

async function readExistingFiles(slugDir: string, slug: string): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  try {
    const entries = await fs.readdir(slugDir, { recursive: true });
    for (const entry of entries) {
      const entryStr = entry.toString();
      if (entryStr.endsWith('.tsx') || entryStr.endsWith('.ts')) {
        try {
          const content = await fs.readFile(path.join(slugDir, entryStr), 'utf-8');
          files.push({ path: `app/(generated)/${slug}/${entryStr}`, content });
        } catch { /* skip */ }
      }
    }
  } catch { /* directory doesn't exist yet */ }
  return files;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(sse(data)));

      try {
        const body = (await request.json()) as {
          messages: ApiMessage[];
          slug?: string;
          currentSlug?: string;
          creativityMode?: string;
          pageType?: string;
          imageBase64?: string;
          mediaType?: string;
          selectedElement?: SelectedElement;
        };

        const { messages, slug: requestedSlug, currentSlug, creativityMode = 'modern', pageType, imageBase64, mediaType, selectedElement } = body;
        const projectRoot = process.cwd();
        const prefix = CREATIVITY_PREFIXES[creativityMode] ?? '';
        const temperature = creativityMode === 'disruptive' ? 0.8 : 0.3;

        let installedDeps: string[] = [];
        try {
          const pkgRaw = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8');
          const pkg = JSON.parse(pkgRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
          installedDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
        } catch { /* ignore */ }

        const elementCtx = selectedElement
          ? `Elemento específico a modificar:\n- Tipo: <${selectedElement.tag}>\n- Texto: "${selectedElement.text}"\n- Clases CSS: ${selectedElement.classes.join(' ')}\n- HTML: ${selectedElement.outerHTMLSnippet}`
          : '';

        const lastMsg = messages[messages.length - 1];
        const userPromptText = typeof lastMsg?.content === 'string'
          ? lastMsg.content
          : (lastMsg?.content as MessageContentBlock[] | undefined)?.find((c) => c.type === 'text')?.text ?? '';

        const fullPrompt = [elementCtx, pageType ? `Tipo de página: ${pageType}` : '', prefix, userPromptText].filter(Boolean).join('\n\n');
        const resultRef: { value: ParsedResponse | null } = { value: null };
        const onEvent = makeOnEvent(resultRef, send);

        if (currentSlug) {
          const slugDir = path.join(projectRoot, 'app/(generated)', currentSlug);
          const existingFiles = await readExistingFiles(slugDir, currentSlug);
          await orchestrateEdit({ userPrompt: fullPrompt, installedDeps, creativityPrefix: prefix, temperature, imageBase64, mediaType, existingFiles, slug: currentSlug }, onEvent);
          if (resultRef.value) await writeAndFinish(send, resultRef.value, installedDeps, requestedSlug ?? currentSlug, projectRoot);
        } else {
          await orchestrate({ userPrompt: fullPrompt, installedDeps, creativityPrefix: prefix, temperature, imageBase64, mediaType }, onEvent);
          if (resultRef.value) await writeAndFinish(send, resultRef.value, installedDeps, requestedSlug, projectRoot);
        }
      } catch (error) {
        console.error('[generate] error:', error);
        send({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
