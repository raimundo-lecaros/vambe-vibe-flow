export interface BrandProfile {
  id: string;
  name: string;
  createdAt: number;
  aesthetic?: string;
  tone?: string;
  identity?: string;
}

export interface BrandSummary {
  id: string;
  name: string;
  createdAt: number;
  hasAesthetic: boolean;
  hasTone: boolean;
  hasIdentity: boolean;
}

export type SelectorType = 'identity' | 'aesthetic' | 'tone';

export const BUILT_IN_OPTIONS: Record<SelectorType, { id: string; name: string }[]> = {
  identity: [
    { id: 'none', name: 'Ninguna' },
    { id: 'vambe', name: 'Vambe' },
  ],
  aesthetic: [
    { id: 'none', name: 'Ninguna' },
    { id: 'vambe', name: 'Vambe' },
    { id: 'libre', name: 'Libre' },
  ],
  tone: [
    { id: 'none', name: 'Ninguno' },
    { id: 'directo', name: 'Directo' },
    { id: 'aspiracional', name: 'Aspiracional' },
    { id: 'tecnico', name: 'Técnico' },
    { id: 'conversacional', name: 'Conversacional' },
    { id: 'editorial', name: 'Editorial' },
  ],
};
