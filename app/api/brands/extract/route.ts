import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { capturePageScreenshots } from '@/lib/brand-screenshot';

const anthropic = new Anthropic();

const VISUAL_PROMPT = `Eres un director de arte y brand strategist con 20 años de experiencia. Analizá estas capturas con extremo detalle y construí un perfil de marca completo y fiel. Capturá la PERSONALIDAD, la ACTITUD, la FILOSOFÍA.

Devuelve ÚNICAMENTE JSON válido en una sola línea, sin markdown:
{"name":"Nombre exacto","identity":"...","aesthetic":"...","tone":"..."}

Usá \\n para separar líneas dentro de cada campo, nunca saltos de línea reales.

identity — identidad de marca (quién son, no cómo se ven):
MARCA: nombre y descripción del negocio | FILOSOFÍA DE DISEÑO: valores que transmite el diseño | DIFERENCIADORES: los de posicionamiento/negocio (no visuales)

aesthetic — estética visual (cómo se ve):
TIPOGRAFÍA: fuentes, pesos, tamaños, tratamientos especiales | PALETA: todos los colores con contexto de uso | FONDOS: dark/light/mixto, sólidos/gradientes/texturas | ESPACIADO: denso vs aireado, whitespace intencional | FORMAS Y BORDES: border-radius, estilo de cards | LAYOUT: grid, asimetría/simetría, overlaps | PERSONALIDAD VISUAL: actitud estética en 2-3 líneas concretas, nada genérico | DIFERENCIADORES VISUALES: 2-3 decisiones únicas | EFECTOS: gradientes, sombras, hover effects, micro-interacciones | ICONOGRAFÍA: íconos, ilustraciones, fotografía | EVITAR: estilos/colores que van en contra

tone — tono de comunicación (cómo hablan):
TONO DE COPY: estilo de escritura, vocabulario, longitud de frases, voz | CTAs: ejemplos literales y su tono | EVITAR VERBALMENTE: palabras y frases que no usan`;

const HTML_PROMPT = `Eres un brand analyst. Analizá este HTML y extraé el perfil de marca con todo el detalle que el código permita.

Devuelve ÚNICAMENTE JSON válido en una sola línea, sin markdown:
{"name":"Nombre","identity":"...","aesthetic":"...","tone":"..."}

Usá \\n para separar líneas. identity: MARCA + FILOSOFÍA. aesthetic: TIPOGRAFÍA + PALETA + FONDOS + FORMAS + LAYOUT + EVITAR (visual). tone: TONO DE COPY + CTAs + EVITAR (verbal).

HTML:
`;

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .slice(0, 28000);
}

type ExtractedProfile = { name: string; identity: string; aesthetic: string; tone: string };

function parseResponse(text: string): ExtractedProfile | null {
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as ExtractedProfile; }
  catch {
    try { return JSON.parse(match[0].replace(/[\r\n\t]/g, ' ')) as ExtractedProfile; }
    catch { return null; }
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { url?: string; html?: string };
  try {
    let text: string;

    if (body.url) {
      const screenshots = await capturePageScreenshots(body.url);
      const imageBlocks = screenshots.map((data) => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data },
      }));
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: [...imageBlocks, { type: 'text' as const, text: VISUAL_PROMPT }] }],
      });
      text = (msg.content[0] as { type: string; text: string }).text;
    } else if (body.html) {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: HTML_PROMPT + cleanHtml(body.html) }],
      });
      text = (msg.content[0] as { type: string; text: string }).text;
    } else {
      return NextResponse.json({ error: 'Falta url o html' }, { status: 400 });
    }

    console.log('[brands/extract] raw:', text.slice(0, 200));
    const parsed = parseResponse(text);
    if (!parsed) {
      console.error('[brands/extract] parse failed:', text.slice(0, 400));
      return NextResponse.json({ error: 'No se pudo extraer el perfil' }, { status: 500 });
    }
    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    console.error('[brands/extract]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
