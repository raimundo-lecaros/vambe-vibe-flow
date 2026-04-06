'use client';

import React from 'react';
import { C, CREATIVITY_OPTIONS, PAGE_TYPE_OPTIONS } from '@/lib/studio/constants';
import type { CreativityMode, PageType } from '@/lib/studio/types';

interface ControlsProps {
  creativityMode: CreativityMode;
  setCreativityMode: (m: CreativityMode) => void;
  pageType: PageType;
  setPageType: (t: PageType) => void;
}

export default function Controls({ creativityMode, setCreativityMode, pageType, setPageType }: ControlsProps) {
  return (
    <div className="px-4 py-3 space-y-3" style={{ borderBottom: `1px solid ${C.border}` }}>
      {/* Style segmented control */}
      <div className="flex rounded-lg p-0.5" style={{ background: C.input }}>
        {CREATIVITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setCreativityMode(opt.value)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
            style={
              creativityMode === opt.value
                ? { background: C.accent, color: '#fff' }
                : { color: C.text3 }
            }
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Page type */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] shrink-0" style={{ color: C.text3 }}>Tipo</span>
        <select
          value={pageType}
          onChange={(e) => setPageType(e.target.value as PageType)}
          className="flex-1 text-[12px] rounded-md px-2.5 py-1.5 focus:outline-none transition-colors"
          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text2 }}
        >
          {PAGE_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
