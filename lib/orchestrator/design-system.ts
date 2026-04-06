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
