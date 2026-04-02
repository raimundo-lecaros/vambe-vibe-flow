'use client';

import { useState, useRef, useEffect } from 'react';
import PreviewPanel, { GeneratedPage } from '@/components/PreviewPanel';
import { fileToBase64, resizeForAPI, getMediaType } from '@/lib/image-utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type CreativityMode = 'disruptive' | 'modern' | 'corporate';
type PageType = 'saas' | 'producto' | 'agencia' | 'ecommerce' | 'startup' | 'portfolio';

const CREATIVITY_OPTIONS: { value: CreativityMode; label: string; icon: string }[] = [
  { value: 'disruptive', label: 'Disruptivo', icon: '🔥' },
  { value: 'modern', label: 'Moderno', icon: '✨' },
  { value: 'corporate', label: 'Corporativo', icon: '🏢' },
];

const PAGE_TYPE_OPTIONS: { value: PageType; label: string }[] = [
  { value: 'saas', label: 'SaaS' },
  { value: 'producto', label: 'Producto' },
  { value: 'agencia', label: 'Agencia' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'startup', label: 'Startup' },
  { value: 'portfolio', label: 'Portfolio' },
];

const EXAMPLE_PROMPTS = [
  'Landing para un CRM de ventas con IA, métricas de conversión y demo interactiva',
  'Agencia de marketing digital con cases de éxito animados y calculadora de ROI',
  'App móvil de finanzas personales con gráficos y comparador de planes',
];

export default function StudioPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [genChars, setGenChars] = useState(0);
  const [creativityMode, setCreativityMode] = useState<CreativityMode>('modern');
  const [pageType, setPageType] = useState<PageType>('saas');
  const [generatedPage, setGeneratedPage] = useState<GeneratedPage | null>(null);
  const [pageHistory, setPageHistory] = useState<GeneratedPage[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore state from localStorage on first render
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vibe-studio');
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        messages?: Message[];
        generatedPage?: GeneratedPage | null;
        pageHistory?: GeneratedPage[];
      };
      if (saved.messages) setMessages(saved.messages);
      if (saved.generatedPage) setGeneratedPage(saved.generatedPage);
      if (saved.pageHistory) setPageHistory(saved.pageHistory);
    } catch {
      // corrupted storage, ignore
    }
  }, []);

  // Persist state whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        'vibe-studio',
        JSON.stringify({ messages, generatedPage, pageHistory })
      );
    } catch {
      // quota exceeded or private browsing, ignore
    }
  }, [messages, generatedPage, pageHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleUndo = () => {
    if (pageHistory.length <= 1) {
      setPageHistory([]);
      setGeneratedPage(null);
    } else {
      const prev = pageHistory[pageHistory.length - 2];
      setPageHistory((h) => h.slice(0, -1));
      setGeneratedPage(prev);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isGenerating) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsGenerating(true);
    setGenStatus('Preparando…');
    setGenChars(0);

    try {
      let imageBase64: string | undefined;
      let mediaType: string | undefined;

      if (imageFile) {
        const raw = await fileToBase64(imageFile);
        imageBase64 = await resizeForAPI(raw);
        mediaType = getMediaType(imageFile);
        setImageFile(null);
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          creativityMode,
          pageType,
          imageBase64,
          mediaType,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              message?: string;
              chars?: number;
              error?: string;
              slug?: string;
              previewUrl?: string;
              files?: GeneratedPage['files'];
              summary?: string;
            };

            if (event.type === 'status' && event.message) {
              setGenStatus(event.message);
            } else if (event.type === 'progress' && event.chars !== undefined) {
              setGenChars(event.chars);
            } else if (event.type === 'done') {
              const page: GeneratedPage = {
                slug: event.slug!,
                previewUrl: event.previewUrl!,
                files: event.files!,
                summary: event.summary!,
              };
              setMessages((m) => [...m, { role: 'assistant', content: `✓ ${page.summary}` }]);
              setPageHistory((h) => [...h, page]);
              setGeneratedPage(page);
            } else if (event.type === 'error') {
              setMessages((m) => [
                ...m,
                { role: 'assistant', content: `❌ Error: ${event.message}` },
              ]);
            }
          } catch {
            // malformed SSE line, skip
          }
        }
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `❌ Error inesperado: ${String(err)}` },
      ]);
    } finally {
      setIsGenerating(false);
      setGenStatus('');
      setGenChars(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* ── Chat panel ── */}
      <div className="w-[360px] shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#006AFF' }}
            >
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-none">Vibe Studio</h1>
              <p className="text-[10px] text-zinc-500 leading-none mt-0.5">by Vambe AI</p>
            </div>
            <button
              onClick={() => {
                if (!confirm('¿Limpiar sesión?')) return;
                setMessages([]);
                setGeneratedPage(null);
                setPageHistory([]);
                localStorage.removeItem('vibe-studio');
              }}
              title="Nueva sesión"
              className="ml-auto text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            >
              ✕ nuevo
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-b border-zinc-800 space-y-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Creatividad</p>
            <div className="flex gap-1">
              {CREATIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCreativityMode(opt.value)}
                  className="flex-1 py-1.5 text-[11px] rounded-md transition-colors font-medium"
                  style={
                    creativityMode === opt.value
                      ? { background: '#006AFF', color: 'white' }
                      : { background: '#27272a', color: '#a1a1aa' }
                  }
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Tipo de página</p>
            <select
              value={pageType}
              onChange={(e) => setPageType(e.target.value as PageType)}
              className="w-full bg-zinc-800 text-white text-xs rounded-md px-2.5 py-1.5 border border-zinc-700 focus:outline-none focus:border-[#006AFF]"
            >
              {PAGE_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {messages.length === 0 && (
            <div className="py-4">
              <p className="text-zinc-600 text-xs mb-3 text-center">Ejemplos para empezar:</p>
              <div className="space-y-2">
                {EXAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => void handleSend(p)}
                    className="w-full text-left text-xs text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                style={
                  msg.role === 'user'
                    ? { background: '#006AFF', color: 'white', borderTopRightRadius: '4px' }
                    : { background: '#27272a', color: '#d4d4d8', borderTopLeftRadius: '4px' }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex justify-start">
              <div
                className="text-zinc-400 text-xs px-3 py-2 rounded-2xl space-y-1"
                style={{ background: '#27272a', borderTopLeftRadius: '4px', maxWidth: '85%' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                  </span>
                  <span className="truncate">{genStatus || 'Generando…'}</span>
                </div>
                {genChars > 0 && (
                  <div className="text-[10px] text-zinc-600 font-mono">
                    {genChars.toLocaleString()} caracteres generados
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-zinc-800">
          {imageFile && (
            <div className="flex items-center gap-2 mb-2 bg-zinc-800 rounded-lg px-3 py-1.5">
              <span className="text-zinc-400 text-xs truncate">📎 {imageFile.name}</span>
              <button
                onClick={() => setImageFile(null)}
                className="ml-auto text-zinc-500 hover:text-white text-xs shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen de referencia"
              className="p-2 text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors shrink-0"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describí la landing… (Enter para enviar)"
              rows={3}
              className="flex-1 bg-zinc-800 text-white text-xs rounded-lg px-3 py-2 resize-none border border-zinc-700 focus:outline-none focus:border-[#006AFF] placeholder-zinc-600 leading-relaxed"
            />

            <button
              onClick={() => void handleSend()}
              disabled={isGenerating || !input.trim()}
              className="p-2.5 rounded-lg text-white font-bold text-sm disabled:opacity-40 transition-opacity shrink-0"
              style={{ background: '#006AFF' }}
              title="Generar (Enter)"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview panel ── */}
      <PreviewPanel
        generatedPage={generatedPage}
        onUndo={pageHistory.length > 0 ? handleUndo : undefined}
      />
    </div>
  );
}
