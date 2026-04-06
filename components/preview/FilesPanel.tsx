'use client';

import React from 'react';
import { C } from './constants';
import type { GeneratedPage } from './types';

interface FilesPanelProps {
  files: GeneratedPage['files'];
}

export default function FilesPanel({ files }: FilesPanelProps) {
  return (
    <div className="px-4 py-3 shrink-0" style={{ background: C.panel, borderBottom: `1px solid ${C.border}` }}>
      <p className="text-[10px] font-medium uppercase tracking-widest mb-2.5" style={{ color: C.text3 }}>Archivos</p>
      <div className="space-y-1.5">
        {files.map((f) => (
          <div key={f.path} className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-mono truncate" style={{ color: C.text2 }}>{f.path}</span>
            <span className="text-[10px] shrink-0 font-mono" style={{ color: C.text3 }}>{f.lines}L</span>
          </div>
        ))}
      </div>
    </div>
  );
}
