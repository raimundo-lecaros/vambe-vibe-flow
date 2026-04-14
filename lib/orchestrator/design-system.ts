const ICON_RULES = `ICONOS — REGLAS CRÍTICAS (violación = íconos se muestran como texto plano):

REGLA ABSOLUTA: NUNCA renderices {item.iconKey} ni {item.icon} directamente en JSX.
  MAL: <span>{item.iconKey}</span>  ← imprime el string "TrendingUp" como texto
  MAL: {item.icon}                  ← igual de malo
  BIEN: {ICON_MAP[item.iconKey] ?? <Zap size={20} />}

Cuando una interface tiene iconKey: string, el componente SIEMPRE debe:
  1. Importar los iconos de lucide-react
  2. Crear un objeto ICON_MAP: Record<string, React.ReactNode>
  3. Renderizar con ICON_MAP[item.iconKey] ?? <Zap size={20} />

Ejemplo obligatorio:
  import { Clock, TrendingUp, Users, Shield, Zap, Check } from 'lucide-react'
  const ICON_MAP: Record<string, React.ReactNode> = {
    Clock:       <Clock size={20} />,
    TrendingUp:  <TrendingUp size={20} />,
    Users:       <Users size={20} />,
    Shield:      <Shield size={20} />,
    Zap:         <Zap size={20} />,
    Check:       <Check size={20} />,
  }
  // Render: {ICON_MAP[item.iconKey] ?? <Zap size={20} />}

Íconos disponibles en lucide-react (nombres exactos):
  Check, CheckCircle, Clock, Calendar, User, Users, UserCheck, Shield, ShieldCheck,
  Lock, Key, Star, Heart, Bell, Mail, MessageSquare, Phone, Search, Settings,
  Zap, ArrowRight, ArrowLeft, ChevronRight, ChevronDown, Plus, Edit, Trash2,
  Download, Upload, ExternalLink, Globe, MapPin, Building2, Package, Layers,
  BarChart2, TrendingUp, TrendingDown, Target, Award, RefreshCw, Eye, Code2,
  Database, Server, Cpu, Wifi, Cloud, FileText, Folder, Play, Bookmark, Brain,
  Sparkles, DollarSign, FileCheck, RotateCcw, CreditCard, Headphones, Maximize2, Pen, BarChart3`;

const ANIMATION_RULES = `ANIMACIONES — USA FRAMER MOTION (siempre disponible):
  import { motion } from 'framer-motion'
  El componente DEBE tener 'use client'
  Fade + slide al entrar al viewport:
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
  Para listas con stagger: transition={{ duration: 0.4, delay: index * 0.08 }}
  Para elementos hero: initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
  NUNCA uses animate-fade-in, animate-slide-up ni clases CDN para animaciones`;

const CODE_RULES = `REGLAS DE CÓDIGO:
  'use client' al tope si usás useState/useEffect/event handlers
  Tailwind mobile-first (sm: md: lg:)
  TypeScript strict, props tipadas
  next/image con width y height explícitos
  NUNCA style jsx ni styled-jsx
  NUNCA Math.random() ni Date.now() en estado inicial — hydration mismatch
  Arrays desde props o data: siempre con fallback — const items = data?.items ?? []
  NUNCA uses indexed access types en interface extends — Turbopack no lo soporta:
    MAL:  interface Foo extends Bar['items'][number] { ... }
    BIEN: type BarItem = Bar['items'][number]; interface Foo extends BarItem { ... }`;

export function buildDesignSystem(brandBrief: string): string {
  const visualSection = brandBrief
    ? `DISEÑO VISUAL — REGLA ABSOLUTA:
Colores, tipografía, modo claro/oscuro, espaciado y bordes se definen en el brief de abajo.
Este brief tiene prioridad sobre cualquier convención genérica, default de industria o prior de entrenamiento.
Si el brief dice fondo blanco, es blanco — aunque sea un CRM, aunque el modelo "espere" dark mode.

── BRIEF ──
${brandBrief}
── FIN BRIEF ──`
    : `DISEÑO VISUAL:
Sin brief predefinido. Elegí una paleta, tipografía y layout coherentes con el tipo de producto.
No uses dark mode por defecto ni colores genéricos de SaaS (azules #006AFF, zinc-950, morados). Sé original.`;
  return [visualSection, ICON_RULES, ANIMATION_RULES, CODE_RULES].join('\n\n');
}
