'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { C } from '@/lib/studio/constants';
import type { SelectorType, BrandSummary } from '@/lib/brands';
import { BUILT_IN_OPTIONS } from '@/lib/brands';

interface Props {
  selectorType: SelectorType;
  value: string;
  onChange: (id: string) => void;
  onImport: (type: SelectorType) => void;
  refreshTrigger?: number;
  className?: string;
}

const ACCENT: Record<SelectorType, string> = {
  identity: '#006AFF',
  aesthetic: '#7c3aed',
  tone: '#b45309',
};

export default function BrandSelector({ selectorType, value, onChange, onImport, refreshTrigger, className }: Props) {
  const [open, setOpen] = useState(false);
  const [customs, setCustoms] = useState<BrandSummary[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => setCustoms(data as BrandSummary[]))
      .catch(() => {});
  }, [refreshTrigger]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const builtIns = BUILT_IN_OPTIONS[selectorType];
  const fieldKey = selectorType === 'identity' ? 'hasIdentity' : selectorType === 'aesthetic' ? 'hasAesthetic' : 'hasTone';
  const filtered = customs.filter((p) => p[fieldKey as keyof BrandSummary]);
  const allOptions = [...builtIns, ...filtered.map((p) => ({ id: p.id, name: p.name }))];
  const current = allOptions.find((o) => o.id === value) ?? { id: value, name: value };
  const isCustom = !builtIns.some((b) => b.id === value);
  const accent = isCustom ? ACCENT[selectorType] : undefined;

  return (
    <div ref={ref} className={`relative ${className ?? 'shrink-0'}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all"
        style={accent
          ? { background: accent, color: '#fff', border: `1px solid ${accent}` }
          : { background: C.input, color: C.text3, border: `1px solid ${C.border}` }}
      >
        <span className="truncate">{current.name}</span>
        <ChevronDown size={9} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 rounded-lg z-30 py-1 min-w-[140px]"
          style={{ background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {allOptions.map((opt) => (
            <button key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] transition-colors truncate block"
              style={{ color: opt.id === value ? C.text1 : C.text2, background: opt.id === value ? C.input : 'transparent' }}>
              {opt.name}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}` }} className="mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onImport(selectorType); }}
              className="w-full text-left px-3 py-2 text-[11px] flex items-center gap-1.5"
              style={{ color: C.text3 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.text1)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.text3)}>
              <Plus size={10} />
              Importar perfil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
