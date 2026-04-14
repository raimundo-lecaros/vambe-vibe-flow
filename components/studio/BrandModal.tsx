'use client';

import React, { useState, useRef } from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import { C } from '@/lib/studio/constants';
import BrandReviewStep from './BrandReviewStep';
import type { BrandProfile } from '@/lib/brands';

type Step = 'input' | 'loading' | 'review';

interface Props {
  onSave: (id: string) => void;
  onClose: () => void;
}

export default function BrandModal({ onSave, onClose }: Props) {
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [aesthetic, setAesthetic] = useState('');
  const [tone, setTone] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExtract() {
    setStep('loading');
    setError('');
    try {
      const body = mode === 'url' ? { url } : { html: await fileRef.current!.files![0].text() };
      const res = await fetch('/api/brands/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json()) as { name?: string; identity?: string; aesthetic?: string; tone?: string; error?: string };
      if (data.error) throw new Error(data.error);
      setName(data.name ?? '');
      setIdentity(data.identity ?? '');
      setAesthetic(data.aesthetic ?? '');
      setTone(data.tone ?? '');
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep('input');
    }
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const id = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const profile: BrandProfile = { id, name: trimmedName, identity: identity.trim(), aesthetic: aesthetic.trim(), tone: tone.trim(), createdAt: Date.now() };
    await fetch('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
    onSave(id);
  }

  const canExtract = mode === 'url' ? url.trim().length > 0 : fileName.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div className="relative rounded-xl p-5 w-[480px] space-y-4" style={{ background: C.sidebar, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold" style={{ color: C.text1 }}>Importar perfil de marca</span>
          <button onClick={onClose} style={{ color: C.text3 }} className="hover:opacity-70 transition-opacity"><X size={14} /></button>
        </div>

        {step === 'input' && (
          <>
            <div className="flex rounded-lg p-0.5" style={{ background: C.input }}>
              {(['url', 'file'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className="flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all"
                  style={mode === m ? { background: C.accent, color: '#fff' } : { color: C.text3 }}>
                  {m === 'url' ? 'URL' : 'Archivo HTML'}
                </button>
              ))}
            </div>
            {mode === 'url' ? (
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tuempresa.com"
                className="w-full text-[12px] rounded-lg px-3 py-2 outline-none"
                style={{ background: C.input, border: `1px solid ${C.border}`, color: C.text1 }} />
            ) : (
              <>
                <div onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-lg py-6 cursor-pointer"
                  style={{ border: `1px dashed ${C.border}`, color: C.text3 }}>
                  <Upload size={18} />
                  <span className="text-[11px]">{fileName || 'Haz click para subir .html'}</span>
                  <input ref={fileRef} type="file" accept=".html" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFileName(e.target.files[0].name); }} />
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: C.text3 }}>⚠️ Solo funciona bien con páginas estáticas o mockups. Apps React/Next.js exportadas tienen HTML muy limitado — preferí URL.</p>
              </>
            )}
            {error && <p className="text-[11px]" style={{ color: '#f87171' }}>{error}</p>}
            <button onClick={() => void handleExtract()} disabled={!canExtract}
              className="w-full py-2 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-40"
              style={{ background: C.accent, color: '#fff' }}>
              Analizar marca
            </button>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 size={22} className="animate-spin" style={{ color: C.accent }} />
            <p className="text-[12px]" style={{ color: C.text3 }}>{mode === 'url' ? 'Cargando página y tomando capturas…' : 'Analizando la marca…'}</p>
          </div>
        )}

        {step === 'review' && (
          <BrandReviewStep name={name} setName={setName} identity={identity} setIdentity={setIdentity} aesthetic={aesthetic} setAesthetic={setAesthetic} tone={tone} setTone={setTone} onBack={() => setStep('input')} onSave={() => void handleSave()} />
        )}
      </div>
    </div>
  );
}
