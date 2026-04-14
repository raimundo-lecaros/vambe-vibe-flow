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
  const promptText = [params.creativityPrefix, params.userPrompt].filter(Boolean).join('\n\n');
  userContent.push({ type: 'text', text: promptText });

  const system = `Eres un arquitecto de landing pages especialista en SEO y GEO (Generative Engine Optimization).

Contexto de diseño para esta sesión:
${params.designBrief}

Dado un brief, respondé en DOS bloques exactos, en este orden:

Bloque 1 — JSON de arquitectura (sin markdown):
{
  "slug": "url-slug-en-minusculas-con-guiones",
  "summary": "descripción en 1 línea de qué hace el producto",
  "components": ["Hero", "Features", "Pricing", "FAQ", "CTA"],
  "complexComponents": ["Pricing"],
  "deps": [],
  "metaTitle": "Keyword Principal - Propuesta de Valor | Empresa (max 60 chars)",
  "metaDescription": "Descripción accionable con keyword principal + beneficio clave (max 155 chars)",
  "schemaType": "SoftwareApplication"
}

Bloque 2 — Interfaces TypeScript (sin markdown):
===INTERFACES===
export interface HeroData { ... }
export interface FeatureItem { ... }
===END===

Reglas:
- slug: URL-safe, solo minúsculas y guiones
- components: PascalCase, máximo 7, ordenados por posición. Los nombres deben reflejar el brief y el tipo de producto. FAQ recomendado para SaaS/servicios/productos; opcional para portfolios y editoriales
- complexComponents: subconjunto de components que requieren lógica interactiva avanzada (calculadoras, sliders con estado, demos animadas, tablas con filtros/sorting, modales con formularios complejos, comparadores). Componentes puramente visuales o de contenido NO van aquí
- deps: SOLO paquetes no disponibles en: ${params.installedDeps.join(', ')}
- metaTitle: incluye keyword principal, max 60 chars, termina en "| [Marca]"
- metaDescription: responde "¿qué hace X para Y?", max 155 chars, incluye métrica concreta si aplica
- schemaType: uno de SoftwareApplication | LocalBusiness | Product | Organization | Service
- interfaces: TypeScript válido, una interface por componente. Los campos de ícono SIEMPRE se llaman iconKey: string (nunca icon: string)

Respondé ÚNICAMENTE con los dos bloques, sin texto adicional.`;

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = extractText(resp);

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('Planner no devolvió JSON válido');
  const plan = JSON.parse(jsonMatch[0]) as Partial<Plan>;
  if (!plan.slug || !plan.components?.length) throw new Error('Plan incompleto: falta slug o components');

  const ifaceMatch = text.match(/===INTERFACES===([\s\S]*?)===END===/);
  const interfaces = ifaceMatch ? ifaceMatch[1].trim() : '';

  return {
    slug: plan.slug,
    summary: plan.summary ?? '',
    components: plan.components,
    complexComponents: plan.complexComponents ?? [],
    interfaces,
    deps: plan.deps ?? [],
    metaTitle: plan.metaTitle ?? plan.summary ?? '',
    metaDescription: plan.metaDescription ?? '',
    schemaType: plan.schemaType ?? 'Organization',
  };
}
