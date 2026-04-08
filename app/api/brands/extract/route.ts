import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .slice(0, 28000);
}

const PROMPT = `Analiza el HTML de esta página web y extrae el perfil visual de la marca.
Devuelve ÚNICAMENTE un JSON con este formato exacto (sin texto adicional):
{
  "name": "Nombre de la empresa",
  "brief": "MARCA: Nombre\\nTIPOGRAFÍA: fuente principal detectada en CSS/clases\\nPRIMARIO: #hexcolor\\nSECUNDARIO: #hexcolor (si existe, sino omitir)\\nFONDO: #hexcolor principal\\nTONO VISUAL: una línea describiendo el estilo (minimalista, bold, editorial, etc.)\\nTONO DE COPY: una línea (formal, casual, técnico, aspiracional, etc.)\\nCTAs: ejemplos literales de botones/llamadas a la acción encontrados\\nLAYOUT: descripción breve del estilo de layout\\nEVITAR: qué elementos/estilos claramente NO usa esta marca"
}

HTML:
`;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { url?: string; html?: string };

  let html: string;
  if (body.url) {
    try {
      const res = await fetch(body.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandExtractor/1.0)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (e) {
      return NextResponse.json({ error: `No se pudo obtener la URL: ${String(e)}` }, { status: 400 });
    }
  } else if (body.html) {
    html = body.html;
  } else {
    return NextResponse.json({ error: 'Falta url o html' }, { status: 400 });
  }

  const cleaned = cleanHtml(html);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: PROMPT + cleaned }],
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'No se pudo extraer el perfil de la respuesta' }, { status: 500 });

    const parsed = JSON.parse(match[0]) as { name: string; brief: string };
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
