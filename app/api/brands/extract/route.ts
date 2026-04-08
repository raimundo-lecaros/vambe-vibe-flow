import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { capturePageScreenshots } from '@/lib/brand-screenshot';

const anthropic = new Anthropic();

const VISUAL_PROMPT = `Eres un director de arte y brand strategist con 20 años de experiencia. Analiza estas capturas de pantalla de una web real con extremo detalle y construye un perfil de marca completo y fiel.

No te quedes en lo superficial. Capturá la PERSONALIDAD, la ACTITUD, la FILOSOFÍA de diseño — lo que hace que esta marca se sienta como se siente.

Devuelve ÚNICAMENTE este JSON (sin texto adicional, sin markdown):
{"name":"Nombre exacto de la empresa","brief":"..."}

El brief debe incluir estas secciones en texto plano separadas por saltos de línea:

MARCA: nombre
TIPOGRAFÍA: fuente(s) detectadas, pesos usados, tamaño relativo de títulos vs body, tratamientos especiales (italic, uppercase, tracking amplio, etc.)
PALETA: todos los colores significativos con contexto de uso — no solo el hex, explicá cuándo y cómo aparece cada uno
FONDOS: dark/light/mixto, ¿sólidos o gradientes? ¿texturas, ruido, formas de fondo?
ESPACIADO: ¿denso o muy aireado? ¿mucho whitespace intencional? ¿padding generoso o comprimido?
FORMAS Y BORDES: border-radius (sharp vs pill vs sutil), estilo de cards, separadores, líneas
LAYOUT: tipo de grid, asimetría vs simetría, si hay overlaps, superposiciones o elementos que rompen la grilla
PERSONALIDAD VISUAL: describí la actitud estética en 2-3 líneas concretas — evitá adjetivos genéricos como "moderno" o "limpio", sé específico sobre qué tipo de moderno, qué tipo de limpio
TONO DE COPY: estilo de escritura, vocabulario (técnico/aspiracional/directo/poético), longitud de frases, si tutean o no, si hay humor
CTAs: ejemplos literales de botones y llamadas a la acción, describí su tono (urgentes, suaves, directivos, conversacionales)
FILOSOFÍA DE DISEÑO: qué valores transmite este diseño — velocidad, precisión, calidez, exclusividad, accesibilidad, disrupción, etc.
DIFERENCIADORES: 2-3 decisiones de diseño específicas que los distinguen de la competencia en su categoría
EFECTOS Y DETALLES: gradientes animados, sombras (flat vs profundas), hover effects visibles, microinteracciones, badges, tags
ICONOGRAFÍA Y GRÁFICOS: estilo de íconos, si usan ilustraciones y de qué tipo, uso de fotografía vs abstracción
EVITAR ABSOLUTAMENTE: qué estilos, colores, recursos visuales o tonos van completamente en contra de esta identidad`;

const HTML_PROMPT = `Eres un brand analyst. Analizá este HTML de una página web y extraé el perfil de marca con todo el detalle que el código permita. El HTML puede ser limitado si es una app React — extraé lo que puedas con precisión, sin inventar lo que no esté.

Devuelve ÚNICAMENTE este JSON (sin texto adicional, sin markdown):
{"name":"Nombre de la empresa","brief":"..."}

El brief debe incluir en texto plano:

MARCA: nombre detectado
TIPOGRAFÍA: fuentes en font-family, clases de Tailwind de tipografía, Google Fonts linkeadas
PALETA: colores en style attributes, variables CSS, clases de color de Tailwind
FONDOS: clases de background detectadas
TONO DE COPY: estilo del texto visible — vocabulario, voz, tono
CTAs: texto literal de botones encontrados
ESTRUCTURA: secciones detectadas, jerarquía del contenido
EVITAR: lo que claramente está ausente de esta identidad

HTML:
`;

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .slice(0, 28000);
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
        max_tokens: 2048,
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

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'No se pudo extraer el perfil' }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]) as { name: string; brief: string });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
