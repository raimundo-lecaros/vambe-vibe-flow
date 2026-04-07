import fs from 'fs/promises';
import path from 'path';

const FALLBACK_VAMBE = `IDENTIDAD VAMBE:
  Font: Plus Jakarta Sans | Primario: #006AFF | Acento: #0060E6
  Fondos: bg-zinc-950, bg-zinc-900, bg-zinc-800 | rounded-xl default
  CTAs: "Comenzar Ahora", "Agenda tu Demo" | Sin emojis`;

const FALLBACK_LIBRE = `DISEÑO LIBRE — sin restricciones de marca.
  Elegí paleta, tipografía y layout propios. Inspirate en Stripe, Linear, Vercel, Arc.
  Sé inesperado. Sin emojis. Calidad de clase mundial.`;

export type BrandMode = 'vambe' | 'libre';

export async function readDesignBrief(mode: BrandMode): Promise<string> {
  const file = mode === 'libre' ? 'DESIGNER_LIBRE.md' : 'DESIGNER.md';
  try {
    return await fs.readFile(path.join(process.cwd(), file), 'utf-8');
  } catch {
    return mode === 'libre' ? FALLBACK_LIBRE : FALLBACK_VAMBE;
  }
}
