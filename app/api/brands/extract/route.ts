import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { capturePageScreenshots } from '@/lib/brand-screenshot';

const anthropic = new Anthropic();

const BRIEF_SECTIONS = 'MARCA | TIPOGRAFÍA | PALETA | FONDOS | ESPACIADO | FORMAS Y BORDES | LAYOUT | PERSONALIDAD VISUAL | TONO DE COPY | CTAs | FILOSOFÍA DE DISEÑO | DIFERENCIADORES | EFECTOS Y DETALLES | ICONOGRAFÍA | EVITAR ABSOLUTAMENTE';

const VISUAL_PROMPT = `Eres un director de arte y brand strategist con 20 años de experiencia. Analizá estas capturas de pantalla con extremo detalle y construí un perfil de marca completo y fiel.

No te quedes en lo superficial. Capturá la PERSONALIDAD, la ACTITUD, la FILOSOFÍA — lo que hace que esta marca se sienta como se siente.

Devuelve ÚNICAMENTE JSON válido en una sola línea, sin markdown, sin texto adicional:
{"name":"Nombre exacto","brief":"SECCIÓN: contenido\\nSECCIÓN: contenido\\n..."}

IMPORTANTE: el brief es un string JSON. Usá \\n (barra invertida + n) para separar secciones, nunca saltos de línea reales.

Secciones a incluir en el brief (${BRIEF_SECTIONS}):
- MARCA: nombre
- TIPOGRAFÍA: fuentes, pesos, tamaños relativos, tratamientos (uppercase, tracking, italic)
- PALETA: todos los colores con contexto de uso — cuándo y cómo aparece cada uno, no solo hex
- FONDOS: dark/light/mixto, sólidos vs gradientes, texturas, ruido, formas decorativas
- ESPACIADO: denso vs aireado, whitespace intencional, padding generoso vs comprimido
- FORMAS Y BORDES: border-radius (sharp/sutil/pill), estilo de cards, separadores
- LAYOUT: tipo de grid, asimetría vs simetría, overlaps, elementos que rompen la grilla
- PERSONALIDAD VISUAL: actitud estética en 2-3 líneas concretas — nada genérico
- TONO DE COPY: estilo, vocabulario, longitud de frases, voz, humor si lo hay
- CTAs: ejemplos literales encontrados, describí su tono
- FILOSOFÍA DE DISEÑO: valores que transmite — velocidad, precisión, calidez, disrupción
- DIFERENCIADORES: 2-3 decisiones de diseño que los distinguen de su categoría
- EFECTOS Y DETALLES: gradientes, sombras, hover effects, micro-interacciones, badges
- ICONOGRAFÍA: estilo de íconos, ilustraciones, uso de fotografía vs abstracción
- EVITAR ABSOLUTAMENTE: estilos/colores/tonos que van en contra de esta identidad`;

const HTML_PROMPT = `Eres un brand analyst. Analizá este HTML y extraé el perfil de marca con todo el detalle que el código permita.

Devuelve ÚNICAMENTE JSON válido en una sola línea, sin markdown:
{"name":"Nombre","brief":"SECCIÓN: contenido\\nSECCIÓN: contenido\\n..."}

IMPORTANTE: usá \\n (barra invertida + n) para separar secciones, nunca saltos de línea reales.

Secciones: MARCA | TIPOGRAFÍA | PALETA | FONDOS | TONO DE COPY | CTAs | ESTRUCTURA | EVITAR

HTML:
`;

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .slice(0, 28000);
}

function parseResponse(text: string): { name: string; brief: string } | null {
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { name: string; brief: string };
  } catch {
    const sanitized = match[0].replace(/[\r\n\t]/g, ' ');
    try { return JSON.parse(sanitized) as { name: string; brief: string }; }
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
        max_tokens: 1536,
        messages: [{ role: 'user', content: HTML_PROMPT + cleanHtml(body.html) }],
      });
      text = (msg.content[0] as { type: string; text: string }).text;

    } else {
      return NextResponse.json({ error: 'Falta url o html' }, { status: 400 });
    }

    console.log('[brands/extract] raw response:', text.slice(0, 300));
    const parsed = parseResponse(text);
    if (!parsed) {
      console.error('[brands/extract] could not parse JSON from:', text.slice(0, 500));
      return NextResponse.json({ error: 'No se pudo extraer el perfil' }, { status: 500 });
    }
    return NextResponse.json(parsed);

  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    console.error('[brands/extract]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
