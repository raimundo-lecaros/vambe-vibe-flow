import { client, parseFilesFromText, toExportName } from './helpers';
import { buildDesignSystem } from './design-system';
import type { Plan, GeneratedFile, OrchestrateParams } from './types';

type Msg = { role: 'user' | 'assistant'; content: string };

async function streamRaw(
  system: string,
  messages: Msg[],
  temperature: number,
  maxTokens: number,
  onChunk: (text: string) => void
): Promise<string> {
  const stream = client.messages.stream({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, temperature, system, messages });
  let fullText = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }
  return fullText;
}

export async function runComponentAgent(
  componentName: string,
  plan: Plan,
  params: OrchestrateParams,
  isComplex: boolean,
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

  const system = `Eres un senior frontend engineer. Generás UN SOLO componente React/Next.js de producción.

${buildDesignSystem(params.designBrief)}
${faqInstruction}

CLEAN CODE — OBLIGATORIO:
- Sin comentarios de ningún tipo (ni //, ni /* */, ni JSDoc)
- Máx 150 líneas por archivo. Si el componente las supera, extraé sub-componentes
  en una SUBCARPETA con el nombre del componente:
    components/${componentName}/index.tsx       ← componente principal
    components/${componentName}/Card.tsx        ← sub-componente
  El archivo principal SIEMPRE es index.tsx dentro de la subcarpeta.
  Los sub-componentes NO llevan el prefijo del padre: Card.tsx no ${componentName}Card.tsx
  Devolvé cada archivo como un bloque ===FILE:=== separado.
- 'use client' EN SUBCARPETAS: pon 'use client' SOLO en index.tsx. Los sub-componentes NO lo llevan.
- Sin imports sin usar, sin variables sin usar, sin console.log

KEYS EN LISTAS: SIEMPRE usá key con índice: key={\`\${value}-\${index}\`}

IMÁGENES: https://picsum.photos/{width}/{height}?random={n} (n único por imagen). Nunca unsplash photo-ID.

ICONOS: si la interface tiene iconKey, creá ICON_MAP. NUNCA renderices {item.iconKey} directo.

IMPORTS:
- components/${componentName}.tsx       → '../data/content'
- components/${componentName}/index.tsx → '../../data/content'
- La fuente la define el brief. Importala desde 'next/font/google' y aplicá font.className en el root.
- UN SOLO import por path.
- NUNCA: interface X extends Type['field'][number] — Turbopack no lo soporta. Extraé el tipo primero.
- El componente importa sus datos desde data/content. NUNCA como prop desde page.tsx.

FORMATO DE SALIDA:
===FILE: app/(generated)/${plan.slug}/components/${componentName}.tsx===
...código...
===ENDFILE===`;

  const userMsg = `Landing: ${plan.summary}
${params.creativityPrefix}

Generá el componente "${componentName}" para esta landing.

Interfaces disponibles (de data/content.ts):
${plan.interfaces}

Ruta según ubicación:
  components/${componentName}.tsx       → '../data/content'
  components/${componentName}/index.tsx → '../../data/content'
  components/${componentName}/Card.tsx  → '../../data/content'
Solo el bloque ===FILE:===...===ENDFILE===.`;

  const maxTokens = isComplex ? 16000 : 12000;
  const messages: Msg[] = [{ role: 'user', content: userMsg }];
  let fullText = await streamRaw(system, messages, params.temperature, maxTokens, onChunk);

  if (!fullText.includes('===ENDFILE===') && fullText.length > 100) {
    const continuation = await streamRaw(
      system,
      [...messages, { role: 'assistant', content: fullText }, { role: 'user', content: 'La respuesta fue truncada. Continuá exactamente donde se cortó, sin repetir nada, hasta cerrar con ===ENDFILE===.' }],
      0,
      8000,
      onChunk
    );
    fullText = fullText + continuation;
  }

  return parseFilesFromText(fullText);
}
