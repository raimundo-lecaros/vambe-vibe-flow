import fs from 'fs/promises';
import path from 'path';

const FALLBACK_VAMBE = `IDENTIDAD VAMBE:
  Font: Plus Jakarta Sans | Primario: #006AFF | Acento: #0060E6
  Fondos: bg-zinc-950, bg-zinc-900, bg-zinc-800 | rounded-xl default
  CTAs: "Comenzar Ahora", "Agenda tu Demo" | Sin emojis`;

const FALLBACK_LIBRE = `DISEÑO LIBRE — sin restricciones de marca.
  Elegí paleta, tipografía y layout propios. Inspirate en Stripe, Linear, Vercel, Arc.
  Sé inesperado. Sin emojis. Calidad de clase mundial.`;

export type BrandMode = 'vambe' | 'libre' | (string & {});

export async function readDesignBrief(mode: string): Promise<string> {
  if (mode === 'libre') {
    try { return await fs.readFile(path.join(process.cwd(), 'DESIGNER_LIBRE.md'), 'utf-8'); }
    catch { return FALLBACK_LIBRE; }
  }
  if (mode !== 'vambe') {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), 'brands', `${mode}.json`), 'utf-8');
      return (JSON.parse(raw) as { brief: string }).brief;
    } catch { /* fallthrough to vambe */ }
  }
  try { return await fs.readFile(path.join(process.cwd(), 'DESIGNER.md'), 'utf-8'); }
  catch { return FALLBACK_VAMBE; }
}
