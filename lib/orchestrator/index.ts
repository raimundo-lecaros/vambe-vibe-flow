import { runComponentAgent, runDataAgent } from './agents';
import { runPlanner } from './planner';
import { buildPageFile } from './helpers';
import type { OrchestrateParams, OrchestratorEvent, GeneratedFile } from './types';

export { orchestrateEdit } from './edit';
export type { GeneratedFile, OrchestratorEvent, OrchestrateParams, OrchestrateEditParams } from './types';

export async function orchestrate(
  params: OrchestrateParams,
  onEvent: (event: OrchestratorEvent) => void
): Promise<void> {
  onEvent({ type: 'status', message: 'Planeando arquitectura…' });
  onEvent({ type: 'agent_start', agent: 'Planner' });

  const plan = await runPlanner(params);

  onEvent({ type: 'agent_done', agent: 'Planner', files: [] });
  onEvent({ type: 'status', message: `Componentes: ${plan.components.join(' · ')}` });

  const agentNames = [...plan.components, 'Datos'];
  for (const name of agentNames) {
    onEvent({ type: 'agent_start', agent: name });
  }

  const componentPromises = plan.components.map((name) =>
    runComponentAgent(name, plan, params, plan.complexComponents.includes(name), (chunk) =>
      onEvent({ type: 'agent_log', agent: name, chunk })
    )
  );
  const dataPromise = runDataAgent(plan, params, (chunk) =>
    onEvent({ type: 'agent_log', agent: 'Datos', chunk })
  );

  const results = await Promise.allSettled([...componentPromises, dataPromise]);

  const files: GeneratedFile[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const agent = agentNames[i];
    if (result.status === 'fulfilled') {
      files.push(...result.value);
      onEvent({ type: 'agent_done', agent, files: result.value.map((f) => f.path) });
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      onEvent({ type: 'agent_error', agent, message: msg });
    }
  }

  if (files.length === 0) throw new Error('Todos los agentes fallaron');

  files.push(buildPageFile(plan));

  const newDeps = plan.deps.filter((d) => !params.installedDeps.includes(d));
  onEvent({ type: 'result', files, slug: plan.slug, summary: plan.summary, newDeps });
}
