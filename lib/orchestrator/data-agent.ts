import { client, parseFilesFromText, toExportName } from './helpers';
import { buildDesignSystem } from './design-system';
import type { Plan, GeneratedFile, OrchestrateParams } from './types';

async function streamAgent(
  system: string,
  userMsg: string,
  temperature: number,
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    temperature,
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

export async function runDataAgent(
  plan: Plan,
  params: OrchestrateParams,
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const exportLines = plan.components
    .map((c) => `  export const ${toExportName(c)}: ${c}Data = { ... }`)
    .join('\n');

  const system = `Eres un copywriter especializado en copy de conversión para landing pages.
Generás el archivo data/content.ts.

${buildDesignSystem(params.designBrief)}

ESTRUCTURA DEL ARCHIVO — CRÍTICO:
- Todo va en UN SOLO archivo: data/content.ts
- Las interfaces van PRIMERO, inline en el mismo archivo. NUNCA importes desde "./types" ni crees archivos separados.
- Un archivo data/types.ts separado rompe la build — no existe en el disco.
- Estructura obligatoria:
    export interface HeroData { ... }
    export interface FeatureItem { ... }
    export const HERO_DATA: HeroData = { ... }
    export const FEATURES_DATA: FeatureItem[] = [ ... ]
- Sin comentarios (ni //, ni /* */)
- Sin exports sin usar
- Nombres de tipos descriptivos: HeroData no Hero, PricingPlanData no Plan
- Arrays de categorías NUNCA incluyen "Todos" — ese ítem lo agrega el componente en runtime.
  MAL:  categories: ['Todos', 'Tradicional', 'Realismo']
  BIEN: categories: ['Tradicional', 'Realismo', 'Blackwork']
- NUNCA uses URLs images.unsplash.com/photo-{ID} — dan 404. Usá https://picsum.photos/{w}/{h}?random={n}

COPY PARA GEO — CRÍTICO:
  Headings: formulados como preguntas directas que la gente busca en Google/ChatGPT
  Primer texto de cada sección: responde la pregunta del heading en ≤2 oraciones
  Incluí siempre: nombre de la empresa/producto, industria, propuesta de valor, métricas clave
  FAQ: mínimo 5 items con preguntas reales que los usuarios harían a un AI search engine
  Testimonios: con nombre completo, empresa, cargo, y métrica específica lograda

FORMATO DE SALIDA:
===FILE: app/(generated)/${plan.slug}/data/content.ts===
...código...
===ENDFILE===`;

  const userMsg = `Landing: ${plan.summary}
${params.creativityPrefix}

Generá data/content.ts para app/(generated)/${plan.slug}/data/content.ts

Usá exactamente estas interfaces:
${plan.interfaces}

Convención de exports:
${exportLines}

Copy real, métricas concretas, en español latinoamericano (tuteo, nunca vosotros). Generá los datos completos.
Solo el bloque ===FILE:===...===ENDFILE===.`;

  return streamAgent(system, userMsg, Math.min(params.temperature + 0.1, 1), onChunk);
}
