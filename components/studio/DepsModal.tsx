'use client';

import React from 'react';
import { C } from '@/lib/studio/constants';
import type { PendingInstall } from '@/lib/studio/types';

interface DepsModalProps {
  pendingInstall: PendingInstall;
  isGenerating: boolean;
  onInstall: () => void;
  onCancel: () => void;
}

export default function DepsModal({ pendingInstall, isGenerating, onInstall, onCancel }: DepsModalProps) {
  return (
    <div className="absolute inset-0 flex items-end justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full rounded-2xl p-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
        <p className="text-[14px] font-semibold mb-1" style={{ color: C.text1 }}>Dependencias nuevas</p>
        <p className="text-[12px] mb-4" style={{ color: C.text2 }}>El diseño requiere instalar:</p>
        <div className="space-y-1.5 mb-5">
          {pendingInstall.deps.map((d) => (
            <div key={d} className="rounded-lg px-3 py-2 text-[12px] font-mono text-blue-300" style={{ background: '#0d1b33', border: '1px solid #3b82f622' }}>
              {d}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onInstall}
            disabled={isGenerating}
            className="flex-1 py-2.5 text-[13px] font-semibold rounded-xl text-white disabled:opacity-40 transition-opacity"
            style={{ background: C.accent }}
          >
            {isGenerating ? 'Instalando…' : 'Instalar y continuar'}
          </button>
          <button
            onClick={onCancel}
            disabled={isGenerating}
            className="px-4 py-2.5 text-[13px] font-medium rounded-xl disabled:opacity-40 transition-colors"
            style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text2 }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
