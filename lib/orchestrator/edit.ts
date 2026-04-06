import { client, extractText, parseFilesFromText } from './helpers';
import { DESIGN_SYSTEM } from './design-system';
import type { GeneratedFile, OrchestrateEditParams, OrchestratorEvent } from './types';

async function runEditCoordinator(
  params: OrchestrateEditParams
): Promise<{ components: string[]; updateData: boolean }> {
  const fileList = params.existingFiles.map((f) => `- ${f.path}`).join('\n');

  const system = `Eres un arquitecto frontend. Analizás un pedido de cambio y determinás exactamente qué archivos de una landing page necesitan modificarse.
Respondé SOLO con JSON válido sin markdown: { "components": ["Hero"], "updateData": false }
- components: nombres PascalCase de los componentes (solo los de la carpeta components/) que necesitan cambios
- updateData: true si hay cambios en textos, labels, datos o contenido en data/content.ts`;

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    temperature: 0,
    system,
    messages: [{
      role: 'user',
      content: `Pedido de cambio:\n${params.userPrompt}\n\nArchivos existentes:\n${fileList}\n\nRespondé ÚNICAMENTE con el JSON.`,
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

async function runEditAgent(
  filePath: string,
  existingContent: string,
  params: OrchestrateEditParams,
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const isTs = filePath.endsWith('.ts');
  const system = `Eres un senior frontend engineer de Vambe AI.
Modificás un archivo existente según el pedido del usuario. Devolvés el archivo COMPLETO.

${DESIGN_SYSTEM}

IMPORTANTE:
- Devolvé el archivo entero con los cambios aplicados, sin truncar
- No cambiés lo que no necesita cambiar
- Mantené imports, interfaces y estructura existente

FORMATO:
===FILE: ${filePath}===
...código completo...
===ENDFILE===`;
  const userMsg = `Pedido: ${params.userPrompt}\n\nArchivo actual:\n\`\`\`${isTs ? 'ts' : 'tsx'}\n${existingContent}\n\`\`\`\n\nAplicá los cambios. Solo el bloque ===FILE:===...===ENDFILE===.`;
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    temperature: params.temperature,
    system,
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
  onEvent({ type: 'status', message: 'Analizando cambios…' });
  onEvent({ type: 'agent_start', agent: 'Planner' });

  const { components, updateData } = await runEditCoordinator(params);

  onEvent({ type: 'agent_done', agent: 'Planner', files: [] });

  let agentEntries: { name: string; path: string }[] = [
    ...components.map((c) => ({
      name: c,
      path: `app/(generated)/${params.slug}/components/${c}.tsx`,
    })),
    ...(updateData
      ? [{ name: 'Datos', path: `app/(generated)/${params.slug}/data/content.ts` }]
      : []),
  ];

  if (agentEntries.length === 0) {
    agentEntries = params.existingFiles
      .filter((f) => f.path.includes('/components/') && f.path.endsWith('.tsx'))
      .map((f) => ({
        name: f.path.split('/').pop()!.replace('.tsx', ''),
        path: f.path,
      }));
    const dataFile = params.existingFiles.find((f) => f.path.endsWith('data/content.ts'));
    if (dataFile) agentEntries.push({ name: 'Datos', path: dataFile.path });
  }

  if (agentEntries.length === 0) {
    throw new Error('No se encontraron archivos para modificar');
  }

  onEvent({ type: 'status', message: `Actualizando: ${agentEntries.map((e) => e.name).join(' · ')}` });
  for (const { name } of agentEntries) {
    onEvent({ type: 'agent_start', agent: name });
  }

  const results = await Promise.allSettled(
    agentEntries.map(({ name, path }) => {
      const existing = params.existingFiles.find((f) => f.path === path);
      return runEditAgent(path, existing?.content ?? '', params, (chunk) =>
        onEvent({ type: 'agent_log', agent: name, chunk })
      );
    })
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
    summary: `Actualizado: ${agentEntries.map((e) => e.name).join(', ')}`,
    newDeps: [],
  });
}
