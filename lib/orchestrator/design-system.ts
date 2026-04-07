export const DESIGN_SYSTEM = `IDENTIDAD VAMBE:
  Primario: #006AFF | Acento: #0060E6
  Usa text-vambe / bg-vambe en lugar de colores inline cuando puedas
  Fondos oscuros: bg-zinc-950, bg-zinc-900, bg-zinc-800
  rounded-xl default, espaciado generoso

COPY — REGLAS GEO/SEO:
  Headings como preguntas directas: "¿Cómo X?" en vez de "Características"
  Primer párrafo responde exactamente qué es el producto en ≤2 oraciones
  Métricas específicas y concretas: "+47% conversión en 90 días" no "mejora tu conversión"
  CTAs: "Comenzar Ahora", "Agenda tu Demo"

COPY — TONO:
  NUNCA uses emojis en el código ni en los textos de la landing
  Lenguaje profesional, directo, sin decoraciones infantiles

REGLAS DE CÓDIGO:
  'use client' al tope si usás useState/useEffect/event handlers
  Tailwind mobile-first (sm: md: lg:)
  TypeScript strict, props tipadas
  next/image con width y height explícitos
  NUNCA style jsx ni styled-jsx
  NUNCA Math.random() ni Date.now() en estado inicial — hydration mismatch
  Arrays desde props o data: siempre con fallback — const items = data?.items ?? []

ICONOS — REGLAS CRÍTICAS (violación = íconos rotos, se muestran como texto plano):

REGLA ABSOLUTA: NUNCA renderices {item.iconKey} ni {item.icon} directamente en JSX.
  MAL: <span>{item.iconKey}</span>   ← imprime el string "TrendingUp" como texto
  MAL: {item.icon}                   ← igual de malo
  BIEN: {ICON_MAP[item.iconKey] ?? <Zap size={20} />}  ← renderiza el componente real

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

Íconos disponibles en lucide-react (nombres exactos para el ICON_MAP):
  Check, CheckCircle, Clock, Calendar, User, Users, UserCheck, Shield, ShieldCheck,
  Lock, Key, Star, Heart, Bell, Mail, MessageSquare, Phone, Search, Settings,
  Zap, ArrowRight, ArrowLeft, ChevronRight, ChevronDown, Plus, Edit, Trash2,
  Download, Upload, ExternalLink, Globe, MapPin, Building2, Package, Layers,
  BarChart2, TrendingUp, TrendingDown, Target, Award, RefreshCw, Eye, Code2,
  Database, Server, Cpu, Wifi, Cloud, FileText, Folder, Play, Bookmark, Brain,
  Sparkles, Workflow, DollarSign, FileCheck, RotateCcw, CreditCard, Headphones,
  Maximize2, Pen, BarChart3

ANIMACIONES — USA FRAMER MOTION (siempre disponible):
  import { motion } from 'framer-motion'
  El componente DEBE tener 'use client'
  Fade + slide al entrar al viewport:
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
  Para listas con stagger (aplicá delay por índice):
    transition={{ duration: 0.4, delay: index * 0.08 }}
  Para elementos hero (sin viewport, animan al montar):
    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
  NUNCA uses animate-fade-in, animate-slide-up ni clases CDN para animaciones — son poco confiables`;
