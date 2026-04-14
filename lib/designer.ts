import fs from 'fs/promises';
import path from 'path';
import type { BrandProfile } from './brands';

const BRANDS_DIR = path.join(process.cwd(), 'brands');

const LANG = 'Español neutro latinoamericano: usa "tú" (nunca "vos" ni "vosotros"). Sin términos de España (ordenador → computador). Registro natural, no rioplatense ni académico.';

const TONES: Record<string, string> = {
  directo: `TONO: Directo y declarativo. Frases cortas de alto impacto. Sin relleno ni hype. Cada palabra justifica su lugar. ${LANG}`,
  aspiracional: `TONO: Aspiracional y emocional. Evoca transformación y posibilidades. Headlines poéticos. Invita a imaginar. ${LANG}`,
  tecnico: `TONO: Técnico y preciso. Terminología específica del dominio. Credibilidad sobre emoción. El lector es exigente. ${LANG}`,
  conversacional: `TONO: Cercano y humano. Tuteo natural. Frases como se hablan. Humor sutil si aplica. Sin distancia corporativa. ${LANG}`,
  editorial: `TONO: Editorial y reflexivo. Frases elaboradas. Sofisticación intelectual. Sin urgencia de conversión. ${LANG}`,
};

const FB_AESTHETIC = `ESTÉTICA: Plus Jakarta Sans | Primario #006AFF | Fondos zinc-950/900/800 | rounded-xl | dark mode exclusivo.`;
const FB_LIBRE = `ESTÉTICA LIBRE — SIN RESTRICCIONES PREDEFINIDAS:
Elegí una paleta completamente propia. No uses #006AFF, zinc-950, ni colores de Vambe.
Elegí una tipografía propia e importala si es necesario (Inter, Geist, Sora, DM Sans, etc.).
Diseñá el layout desde cero — no repliques la estructura de Vambe ni ningún template genérico.
Inspiración: Stripe, Linear, Vercel, Loewe, Arc, Raycast. Sorprendé con algo inesperado.`;

async function readField(id: string, field: keyof BrandProfile): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(BRANDS_DIR, `${id}.json`), 'utf-8');
    return (JSON.parse(raw) as BrandProfile)[field] as string ?? null;
  } catch { return null; }
}

export async function readCombinedBrief(identityId: string, aestheticId: string, toneId: string): Promise<string> {
  const parts: string[] = [];

  if (identityId !== 'none') {
    const t = await readField(identityId, 'identity');
    if (t) parts.push('IDENTIDAD DE MARCA:\n' + t);
  }

  if (aestheticId === 'libre') {
    parts.push('ESTÉTICA VISUAL:\n' + FB_LIBRE);
  } else if (aestheticId === 'vambe') {
    try { parts.push('ESTÉTICA VISUAL:\n' + await fs.readFile(path.join(process.cwd(), 'DESIGNER.md'), 'utf-8')); }
    catch { parts.push('ESTÉTICA VISUAL:\n' + FB_AESTHETIC); }
  } else if (aestheticId !== 'none') {
    const t = await readField(aestheticId, 'aesthetic');
    if (t) parts.push('ESTÉTICA VISUAL A REPLICAR (priorizá sobre cualquier mención visual de la identidad):\n' + t);
  }

  if (toneId !== 'none') {
    const builtInTone = TONES[toneId];
    const tonePart = builtInTone ?? await readField(toneId, 'tone');
    if (tonePart) parts.push(tonePart);
  } else {
    parts.push(LANG);
  }

  return parts.join('\n\n---\n\n');
}

export type BrandMode = string;
