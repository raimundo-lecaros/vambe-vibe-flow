import { client, extractText, parseFilesFromText } from './helpers';
import { buildCoordinatorSystem, buildEditSystem } from './edit-prompts';
import { buildSlugContext } from './slug-context';
import type { GeneratedFile, OrchestrateEditParams, OrchestratorEvent } from './types';

interface AgentEntry {
  name: string;
  files: { path: string; content: string }[];
}

async function runEditCoordinator(
  params: OrchestrateEditParams,
  slugContext: string
): Promise<{ components: string[]; updateData: boolean }> {
  const fileList = params.existingFiles.map((f) => `- ${f.path}`).join('\n');
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    temperature: 0,
    system: buildCoordinatorSystem(!!params.fixMode, slugContext),
    messages: [{
      role: 'user',
      content: `Pedido:\n${params.userPrompt}\n\nArchivos existentes:\n${fileList}\n\nRespondé ÚNICAMENTE con el JSON.`,
    }],
  });
  const text = extractText(resp);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { components: [], updateData: true };
  try {
    const r = JSON.parse(match[0]) as { components?: string[]; updateData?: boolean };
    return { components: r.components ?? [], updateData: r.updateData ?? false };
  } catch {
    return { components: [], updateData: true };
  }
}

function resolveComponentFiles(
  name: string,
  existingFiles: { path: string; content: string }[],
  slug: string
) {
  const base = `app/(generated)/${slug}/components/`;
  const flat = existingFiles.find((f) => f.path === `${base}${name}.tsx`);
  if (flat) return [flat];
  return existingFiles.filter((f) => f.path.startsWith(`${base}${name}/`));
}

async function runEditAgent(
  agentFiles: { path: string; content: string }[],
  params: OrchestrateEditParams,
  agentName: string,
  slugContext: string,
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const temperature = params.fixMode ? 0 : params.temperature;

  let issueText = params.userPrompt;
  if (params.fixMode && params.qaIssues && params.qaIssues.length > 0) {
    const name = agentName.toLowerCase();
    const relevant = params.qaIssues.filter((i) => i.component.toLowerCase() === name);
    const toUse = relevant.length > 0 ? relevant : params.qaIssues;
    issueText = 'Bugs a corregir:\n' + toUse.map((i) => `- [${i.component}]: ${i.description}\n  Fix: ${i.fixHint}`).join('\n');
  }

  const filesSection = agentFiles
    .map((f) => `===FILE: ${f.path}===\n${f.content}\n===ENDFILE===`)
    .join('\n\n');

  const userMsg = `${params.fixMode ? issueText : `Pedido: ${params.userPrompt}`}\n\nArchivos actuales (usá exactamente estas rutas en tu respuesta):\n\n${filesSection}\n\nAplicá los cambios. Devolvé SOLO los bloques ===FILE:===...===ENDFILE=== de los archivos que modificás, con las mismas rutas exactas de arriba.`;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    temperature,
    system: buildEditSystem(!!params.fixMode, slugContext, params.fixMode ? undefined : params.designBrief),
    messages: [{ role: 'user', content: userMsg }],
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

export async function orchestrateEdit(
  params: OrchestrateEditParams,
  onEvent: (event: OrchestratorEvent) => void
): Promise<void> {
  onEvent({ type: 'status', message: params.fixMode ? 'Identificando componentes afectados…' : 'Analizando cambios…' });
  onEvent({ type: 'agent_start', agent: 'Planner' });

  const slugContext = buildSlugContext(params.existingFiles, params.slug);
  const { components, updateData } = await runEditCoordinator(params, slugContext);

  onEvent({ type: 'agent_done', agent: 'Planner', files: [] });

  const dataFile = params.existingFiles.find((f) => f.path.endsWith('data/content.ts'));

  let agentEntries: AgentEntry[] = [
    ...components
      .map((c) => ({ name: c, files: resolveComponentFiles(c, params.existingFiles, params.slug) }))
      .filter((e) => e.files.length > 0),
    ...(updateData && dataFile ? [{ name: 'Datos', files: [dataFile] }] : []),
  ];

  if (agentEntries.length === 0) {
    const seen = new Set<string>();
    for (const f of params.existingFiles) {
      const match = f.path.match(/\/components\/([^/]+)/);
      if (match) seen.add(match[1].replace('.tsx', ''));
    }
    agentEntries = [...seen]
      .map((name) => ({ name, files: resolveComponentFiles(name, params.existingFiles, params.slug) }))
      .filter((e) => e.files.length > 0);
    if (dataFile) agentEntries.push({ name: 'Datos', files: [dataFile] });
  }

  if (params.fixMode && params.qaIssues && params.qaIssues.length > 0) {
    const issueNames = new Set(params.qaIssues.map((i) => i.component.toLowerCase()));
    agentEntries = agentEntries.filter((e) => e.name === 'Datos' || issueNames.has(e.name.toLowerCase()));
  }

  if (agentEntries.length === 0) throw new Error('No se encontraron archivos para modificar');

  onEvent({ type: 'status', message: `Corrigiendo: ${agentEntries.map((e) => e.name).join(' · ')}` });
  for (const { name } of agentEntries) onEvent({ type: 'agent_start', agent: name });

  const results = await Promise.allSettled(
    agentEntries.map(({ name, files }) =>
      runEditAgent(files, params, name, slugContext, (chunk) => onEvent({ type: 'agent_log', agent: name, chunk }))
    )
  );

  const files: GeneratedFile[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const { name } = agentEntries[i];
    if (result.status === 'fulfilled') {
      files.push(...result.value);
      onEvent({ type: 'agent_done', agent: name, files: result.value.map((f) => f.path) });
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      onEvent({ type: 'agent_error', agent: name, message: msg });
    }
  }

  if (files.length === 0) throw new Error('No se generaron archivos en la edición');

  onEvent({
    type: 'result',
    files,
    slug: params.slug,
    summary: `${params.fixMode ? 'Corregido' : 'Actualizado'}: ${agentEntries.map((e) => e.name).join(', ')}`,
    newDeps: [],
  });
}
