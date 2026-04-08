'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Wand2, ChevronDown, Plus } from 'lucide-react';
import { C } from '@/lib/studio/constants';

interface BrandOption { id: string; name: string }

interface Props {
  value: string;
  onChange: (id: string) => void;
  onImport: () => void;
  refreshTrigger?: number;
}

const BUILT_IN: BrandOption[] = [
  { id: 'vambe', name: 'Vambe' },
  { id: 'libre', name: 'Libre' },
];

export default function BrandSelector({ value, onChange, onImport, refreshTrigger }: Props) {
  const [open, setOpen] = useState(false);
  const [customs, setCustoms] = useState<BrandOption[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => setCustoms((data as BrandOption[]).map((b) => ({ id: b.id, name: b.name }))))
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

  const allOptions = [...BUILT_IN, ...customs];
  const current = allOptions.find((o) => o.id === value) ?? { id: value, name: value };
  const isCustom = value !== 'vambe' && value !== 'libre';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
        style={value === 'libre'
          ? { background: '#7c3aed', color: '#fff', border: '1px solid #7c3aed' }
          : isCustom
          ? { background: '#0d6e4e', color: '#fff', border: '1px solid #0d6e4e' }
          : { background: C.input, color: C.text3, border: `1px solid ${C.border}` }}
      >
        <Wand2 size={11} />
        <span className="max-w-[80px] truncate">{current.name}</span>
        <ChevronDown size={9} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-lg z-20 py-1 min-w-[150px]"
          style={{ background: C.panel, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {allOptions.map((opt) => (
            <button key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[11px] transition-colors truncate"
              style={{ color: opt.id === value ? C.text1 : C.text2, background: opt.id === value ? C.input : 'transparent' }}>
              {opt.name}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}` }} className="mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onImport(); }}
              className="w-full text-left px-3 py-2 text-[11px] flex items-center gap-1.5"
              style={{ color: C.text3 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.text1)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.text3)}
            >
              <Plus size={10} />
              Importar marca
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
