import { client, extractText } from './helpers';
import type { Plan, OrchestrateParams } from './types';

export async function runPlanner(params: OrchestrateParams): Promise<Plan> {
  type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: SupportedMediaType; data: string } };
  type TextBlock = { type: 'text'; text: string };
  type ContentBlock = ImageBlock | TextBlock;

  const userContent: ContentBlock[] = [];
  if (params.imageBase64) {
    const mt = (params.mediaType ?? 'image/jpeg') as SupportedMediaType;
    userContent.push({ type: 'image', source: { type: 'base64', media_type: mt, data: params.imageBase64 } });
  }
  userContent.push({ type: 'text', text: params.userPrompt });

  const system = `Eres un arquitecto de landing pages especialista en SEO y GEO (Generative Engine Optimization).
Respondés SOLO con JSON válido, sin markdown ni texto extra.

Dado un brief, planificás la estructura completa de la landing:
{
  "slug": "url-slug-en-minusculas-con-guiones",
  "summary": "descripción en 1 línea de qué hace el producto",
  "components": ["Hero", "Features", "Pricing", "FAQ", "CTA"],
  "interfaces": "export interface HeroData { ... }\\nexport interface FeatureItem { ... }\\n...",
  "deps": [],
  "metaTitle": "Keyword Principal - Propuesta de Valor | Empresa (max 60 chars)",
  "metaDescription": "Descripción accionable con keyword principal + beneficio clave (max 155 chars)",
  "schemaType": "SoftwareApplication"
}

Reglas:
- slug: URL-safe, solo minúsculas y guiones
- components: PascalCase, máximo 7, ordenados por posición. SIEMPRE incluí "FAQ" — es obligatorio para SEO/GEO
- interfaces: TypeScript válido, una interface por sección
- deps: SOLO paquetes no disponibles en: ${params.installedDeps.join(', ')}
- metaTitle: incluye keyword principal, max 60 chars, termina en "| [Marca]"
- metaDescription: responde "¿qué hace X para Y?", max 155 chars, incluye métrica concreta si aplica
- schemaType: uno de SoftwareApplication | LocalBusiness | Product | Organization | Service

Respondé ÚNICAMENTE con el JSON.`;

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = extractText(resp);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Planner no devolvió JSON válido');

  const plan = JSON.parse(match[0]) as Partial<Plan>;
  if (!plan.slug || !plan.components?.length) throw new Error('Plan incompleto: falta slug o components');

  // Ensure FAQ is always present
  if (!plan.components.includes('FAQ')) plan.components.push('FAQ');

  return {
    slug: plan.slug,
    summary: plan.summary ?? '',
    components: plan.components,
    interfaces: plan.interfaces ?? '',
    deps: plan.deps ?? [],
    metaTitle: plan.metaTitle ?? plan.summary ?? '',
    metaDescription: plan.metaDescription ?? '',
    schemaType: plan.schemaType ?? 'Organization',
  };
}
