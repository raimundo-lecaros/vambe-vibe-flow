'use client';

import React from 'react';
import { C, CREATIVITY_OPTIONS, PAGE_TYPE_OPTIONS } from '@/lib/studio/constants';
import type { CreativityMode, PageType } from '@/lib/studio/types';
import type { SelectorType } from '@/lib/brands';
import BrandSelector from './BrandSelector';

interface ControlsProps {
  creativityMode: CreativityMode;
  setCreativityMode: (m: CreativityMode) => void;
  pageType: PageType;
  setPageType: (t: PageType) => void;
  identityMode: string;
  setIdentityMode: (v: string) => void;
  aestheticMode: string;
  setAestheticMode: (v: string) => void;
  toneMode: string;
  setToneMode: (v: string) => void;
  onImportBrand: (type: SelectorType) => void;
  brandRefreshTrigger?: number;
}

const SELECTORS: { key: SelectorType; label: string; getValue: (p: ControlsProps) => string; setValue: (p: ControlsProps) => (v: string) => void }[] = [
  { key: 'identity', label: 'Identidad', getValue: (p) => p.identityMode, setValue: (p) => p.setIdentityMode },
  { key: 'aesthetic', label: 'Estética', getValue: (p) => p.aestheticMode, setValue: (p) => p.setAestheticMode },
  { key: 'tone', label: 'Tono', getValue: (p) => p.toneMode, setValue: (p) => p.setToneMode },
];

export default function Controls(props: ControlsProps) {
  const { creativityMode, setCreativityMode, pageType, setPageType, onImportBrand, brandRefreshTrigger } = props;
  return (
    <div className="px-4 py-3 space-y-3" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div className="flex rounded-lg p-0.5" style={{ background: C.input }}>
        {CREATIVITY_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setCreativityMode(opt.value)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
            style={creativityMode === opt.value ? { background: C.accent, color: '#fff' } : { color: C.text3 }}>
            {opt.icon}{opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] shrink-0" style={{ color: C.text3 }}>Tipo</span>
        <select value={pageType} onChange={(e) => setPageType(e.target.value as PageType)}
          className="flex-1 text-[12px] rounded-md px-2.5 py-1.5 focus:outline-none"
          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text2 }}>
          {PAGE_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SELECTORS.map(({ key, label, getValue, setValue }) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-[10px]" style={{ color: C.text3 }}>{label}</span>
            <BrandSelector selectorType={key} value={getValue(props)} onChange={setValue(props)} onImport={onImportBrand} refreshTrigger={brandRefreshTrigger} className="relative w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
