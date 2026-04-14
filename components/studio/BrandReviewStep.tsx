'use client';

import React from 'react';
import { C } from '@/lib/studio/constants';

interface Props {
  name: string;
  setName: (v: string) => void;
  identity: string;
  setIdentity: (v: string) => void;
  aesthetic: string;
  setAesthetic: (v: string) => void;
  tone: string;
  setTone: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
}

const FIELDS = [
  { key: 'identity', label: 'Identidad de marca' },
  { key: 'aesthetic', label: 'Estética visual' },
  { key: 'tone', label: 'Tono de comunicación' },
] as const;

export default function BrandReviewStep({ name, setName, identity, setIdentity, aesthetic, setAesthetic, tone, setTone, onBack, onSave }: Props) {
  const values: Record<string, string> = { identity, aesthetic, tone };
  const setters: Record<string, (v: string) => void> = { identity: setIdentity, aesthetic: setAesthetic, tone: setTone };

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-[11px]" style={{ color: C.text3 }}>Nombre</p>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full text-[12px] rounded-lg px-3 py-2 outline-none"
          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text1 }} />
      </div>

      <div className="overflow-y-auto space-y-3" style={{ maxHeight: 340 }}>
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <p className="text-[11px]" style={{ color: C.text3 }}>{label}</p>
            <textarea
              value={values[key]}
              onChange={(e) => setters[key](e.target.value)}
              rows={4}
              className="w-full text-[10px] rounded-lg px-3 py-2 outline-none resize-none font-mono"
              style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text2 }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onBack}
          className="flex-1 py-2 rounded-lg text-[12px] font-medium"
          style={{ background: C.input, color: C.text2, border: `1px solid ${C.border}` }}>
          Volver
        </button>
        <button onClick={onSave} disabled={!name.trim()}
          className="flex-1 py-2 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-40"
          style={{ background: C.accent, color: '#fff' }}>
          Guardar perfil
        </button>
      </div>
    </>
  );
}
