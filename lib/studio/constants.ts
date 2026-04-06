import React from 'react';
import { Zap, Sparkles, Building2 } from 'lucide-react';
import type { CreativityMode, PageType } from './types';

export const CREATIVITY_OPTIONS: { value: CreativityMode; label: string; icon: React.ReactNode }[] = [
  { value: 'disruptive', label: 'Disruptivo', icon: React.createElement(Zap, { size: 11 }) },
  { value: 'modern', label: 'Moderno', icon: React.createElement(Sparkles, { size: 11 }) },
  { value: 'corporate', label: 'Corporativo', icon: React.createElement(Building2, { size: 11 }) },
];

export const PAGE_TYPE_OPTIONS: { value: PageType; label: string }[] = [
  { value: 'saas', label: 'SaaS' },
  { value: 'producto', label: 'Producto' },
  { value: 'agencia', label: 'Agencia' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'startup', label: 'Startup' },
  { value: 'portfolio', label: 'Portfolio' },
];

export const EXAMPLE_PROMPTS = [
  'CRM de ventas con IA, métricas de conversión y demo interactiva',
  'Agencia de marketing con cases de éxito y calculadora de ROI',
  'App de finanzas personales con gráficos y comparador de planes',
];

export const C = {
  sidebar:  '#1c1c22',
  panel:    '#222228',
  input:    '#2a2a32',
  border:   '#38383f',
  borderHi: '#52525c',
  text1:    '#f0f0f4',
  text2:    '#a0a0b0',
  text3:    '#68687a',
  accent:   '#006AFF',
} as const;
