import { client, parseFilesFromText, toExportName } from './helpers';
import { DESIGN_SYSTEM } from './design-system';
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

export async function runComponentAgent(
  componentName: string,
  plan: Plan,
  params: OrchestrateParams,
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const exportName = toExportName(componentName);

  const faqInstruction = componentName === 'FAQ'
    ? `\nEste es el componente FAQ — OBLIGATORIO:
- Generá mínimo 5 preguntas/respuestas relevantes al producto
- Las preguntas deben ser del tipo "¿Cómo...?", "¿Cuánto...?", "¿Por qué...?"
- Incluí este JSON-LD al inicio del JSX para FAQPage schema:
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.items.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer }
    }))
  }) }} />`
    : '';

  const system = `Eres un senior frontend engineer de Vambe AI.
Generás UN SOLO componente React/Next.js de producción.

${DESIGN_SYSTEM}
${faqInstruction}

CLEAN CODE — OBLIGATORIO:
- Sin comentarios de ningún tipo (ni //, ni /* */, ni JSDoc)
- Máx 150 líneas por archivo. Si el componente las supera, extraé sub-componentes
  en una SUBCARPETA con el nombre del componente:
    components/${componentName}/index.tsx       ← componente principal
    components/${componentName}/Card.tsx        ← sub-componente
    components/${componentName}/Header.tsx      ← sub-componente
  El archivo principal SIEMPRE es index.tsx dentro de la subcarpeta.
  Los sub-componentes NO llevan el prefijo del padre: Card.tsx no ${componentName}Card.tsx
  Devolvé cada archivo como un bloque ===FILE:=== separado.
- Sin imports sin usar, sin variables sin usar, sin console.log
- Nombres descriptivos y auto-explicativos

ICONOS — VERIFICACIÓN OBLIGATORIA ANTES DE ESCRIBIR EL COMPONENTE:
¿La interface tiene algún campo iconKey (o icon)?
  SÍ → DEBES crear un ICON_MAP en el componente que lo usa. NUNCA hagas {item.iconKey} directo.
  NO → no hay nada que hacer.
El ICON_MAP mapea el string (ej: "TrendingUp") al componente Lucide real (ej: <TrendingUp size={20} />).
Ver sección ICONOS arriba para la lista de nombres disponibles.

IMPORTANTE — RUTAS DE IMPORT:
- Si el componente está en components/${componentName}.tsx (sin subcarpeta):
    import { ${exportName} } from '../data/content'
- Si el componente está en components/${componentName}/index.tsx (con subcarpeta):
    import { ${exportName} } from '../../data/content'
- Los sub-componentes en components/${componentName}/Card.tsx también usan:
    import { ... } from '../../data/content'
- NO reimportés Plus_Jakarta_Sans — la fuente ya viene del layout
- Usá exactamente las interfaces del plan
- Generá el componente completo sin truncar

FORMATO DE SALIDA:
===FILE: app/(generated)/${plan.slug}/components/${componentName}.tsx===
...código...
===ENDFILE===`;

  const userMsg = `Landing: ${plan.summary}
${params.creativityPrefix}

Generá el componente "${componentName}" para esta landing.

Interfaces disponibles (de data/content.ts):
${plan.interfaces}

ATENCIÓN con los imports:
- Archivo simple (components/${componentName}.tsx): import { ${exportName} } from '../data/content'
- Con subcarpeta (components/${componentName}/index.tsx): import { ${exportName} } from '../../data/content'
Solo el bloque ===FILE:===...===ENDFILE===.`;

  return streamAgent(system, userMsg, params.temperature, onChunk);
}

export async function runDataAgent(
  plan: Plan,
  params: OrchestrateParams,
  onChunk: (text: string) => void
): Promise<GeneratedFile[]> {
  const exportLines = plan.components
    .map((c) => `  export const ${toExportName(c)}: ${c}Data = { ... }`)
    .join('\n');

  const system = `Eres un copywriter técnico especializado en SEO y GEO (Generative Engine Optimization).
Generás el archivo data/content.ts de una landing page.

${DESIGN_SYSTEM}

CLEAN CODE — OBLIGATORIO:
- Sin comentarios de ningún tipo (ni //, ni /* */)
- Sin exports sin usar
- Nombres de tipos descriptivos: HeroData no Hero, PricingPlanData no Plan

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

Copy real, métricas concretas, en español. Generá los datos completos.
Solo el bloque ===FILE:===...===ENDFILE===.`;

  return streamAgent(system, userMsg, Math.min(params.temperature + 0.1, 1), onChunk);
}
