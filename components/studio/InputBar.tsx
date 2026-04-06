'use client';

import React, { useRef } from 'react';
import { Paperclip, ArrowRight, X } from 'lucide-react';
import { C } from '@/lib/studio/constants';
import type { SelectedElement } from '@/components/preview/types';

interface InputBarProps {
  input: string;
  setInput: (v: string) => void;
  isGenerating: boolean;
  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  onSend: () => void;
}

export default function InputBar({
  input,
  setInput,
  isGenerating,
  selectedElement,
  setSelectedElement,
  imageFile,
  setImageFile,
  onSend,
}: InputBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.border}`, background: C.sidebar }}>
      {/* Selected element chip */}
      {selectedElement && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg" style={{ background: '#0d1b33', border: '1px solid #3b82f633' }}>
          <span className="text-[10px] font-mono text-blue-400 shrink-0">&lt;{selectedElement.tag}&gt;</span>
          <span className="text-[11px] truncate flex-1" style={{ color: C.text2 }}>{selectedElement.text || 'elemento seleccionado'}</span>
          <button onClick={() => setSelectedElement(null)} style={{ color: C.text3 }}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* Image chip */}
      {imageFile && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg" style={{ background: C.input, border: `1px solid ${C.border}` }}>
          <span className="text-[11px] truncate flex-1" style={{ color: C.text2 }}>{imageFile.name}</span>
          <button onClick={() => setImageFile(null)} style={{ color: C.text3 }}>
            <X size={11} />
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar imagen"
          className="p-2 rounded-lg transition-colors shrink-0"
          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text3 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.text2; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.text3; }}
        >
          <Paperclip size={14} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedElement ? `Pedí cambios sobre <${selectedElement.tag}>…` : 'Describí tu landing… (Enter para generar)'}
          rows={3}
          className="flex-1 text-[13px] rounded-xl px-3.5 py-2.5 resize-none focus:outline-none leading-relaxed"
          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text1 }}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = C.accent; }}
          onBlur={(e) => { (e.target as HTMLElement).style.borderColor = C.border; }}
        />

        <button
          onClick={onSend}
          disabled={isGenerating || !input.trim()}
          className="p-2.5 rounded-xl text-white disabled:opacity-30 transition-all shrink-0"
          style={{ background: C.accent }}
          title="Generar (Enter)"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
