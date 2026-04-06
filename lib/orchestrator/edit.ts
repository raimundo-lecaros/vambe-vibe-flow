import { client, extractText, parseFilesFromText } from './helpers';
import { buildCoordinatorSystem, buildEditSystem } from './edit-prompts';
import type { GeneratedFile, OrchestrateEditParams, OrchestratorEvent } from './types';

async function runEditCoordinator(
  params: OrchestrateEditParams
): Promise<{ components: string[]; updateData: boolean }> {
  const fileList = params.existingFiles.map((f) => `- ${f.path}`).join('\n');

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    temperature: 0,
    system: buildCoordinatorSystem(!!params.fixMode),
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

async function runEditAgent(
  filePath: string,
  existingContent: string,
  params: OrchestrateEditParams,
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const isTs = filePath.endsWith('.ts');
  const temperature = params.fixMode ? 0 : params.temperature;
  const userMsg = `${params.fixMode ? 'Bugs a corregir' : 'Pedido'}: ${params.userPrompt}\n\nArchivo actual (${filePath}):\n\`\`\`${isTs ? 'ts' : 'tsx'}\n${existingContent}\n\`\`\`\n\nAplicá los cambios. Devolvé SOLO el bloque ===FILE:===...===ENDFILE===.`;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    temperature,
    system: buildEditSystem(filePath, !!params.fixMode),
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

  onEvent({ type: 'status', message: `Corrigiendo: ${agentEntries.map((e) => e.name).join(' · ')}` });
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
    summary: `${params.fixMode ? 'Corregido' : 'Actualizado'}: ${agentEntries.map((e) => e.name).join(', ')}`,
    newDeps: [],
  });
}
