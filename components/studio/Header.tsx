'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { C } from '@/lib/studio/constants';

interface HeaderProps {
  onNewSession: () => void;
}

export default function Header({ onNewSession }: HeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 select-none"
        style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0040cc 100%)' }}
      >
        <span className="text-white text-xs font-bold">V</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-none" style={{ color: C.text1 }}>Vambe VibeFlow</p>
      </div>
      <button
        onClick={onNewSession}
        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors"
        style={{ color: C.text3, border: `1px solid ${C.border}` }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.text2; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.text3; }}
      >
        <Plus size={10} />
        Nueva
      </button>
    </div>
  );
}
