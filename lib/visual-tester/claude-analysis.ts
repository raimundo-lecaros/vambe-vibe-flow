import Anthropic from '@anthropic-ai/sdk';
import type { Issue, DomMetrics } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeWithConsultant(
  desktopB64: string,
  mobileB64: string,
  desktop2B64: string,
  metrics: DomMetrics,
  sourceFiles: { path: string; content: string }[]
): Promise<Issue[]> {
  const codeSection = sourceFiles.length > 0
    ? sourceFiles.map((f) => `// ${f.path}\n${f.content}`).join('\n\n---\n\n').slice(0, 18000)
    : 'Código fuente no disponible.';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: desktopB64 } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: mobileB64 } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: desktop2B64 } },
          {
            type: 'text',
            text: `Sos un auditor de QA agresivo especializado en landing pages B2B SaaS. Tu objetivo es encontrar errores reales — no suposiciones. Los datos de Playwright son hechos objetivos medidos en el DOM real: tomalos como verdad absoluta y convertí cada uno en un issue.

SCREENSHOTS: imagen 1 = desktop (carga inicial), imagen 2 = mobile, imagen 3 = desktop después de 2 segundos (para verificar animaciones).

═══ REPORTE OBJETIVO DE PLAYWRIGHT (HECHOS, NO OPINIONES) ═══

ÍCONOS ROTOS detectados en el DOM (texto kebab-case donde debería haber SVG):
${metrics.brokenIcons.length > 0
  ? `⚠ CRÍTICO: ${JSON.stringify(metrics.brokenIcons)}
  Esto significa que el componente usa <Icon name="x" /> o similar en vez de named imports de lucide-react.
  OBLIGATORIO: creá un issue critical con category "error" por esto.`
  : '✓ Ninguno detectado'}

OVERLAPS detectados (intersecciones de píxeles entre elementos críticos):
${metrics.overlaps.length > 0
  ? metrics.overlaps.map(o => `⚠ "${o.elementA}" se superpone con "${o.elementB}" — área: ${o.overlapArea}px²`).join('\n  ')
  : '✓ Ninguno detectado'}

Overflow horizontal: ${metrics.hasHorizontalOverflow ? '⚠ SÍ — elementos salen del viewport' : '✓ No'}
Errores JS en consola: ${metrics.consoleErrors.length > 0 ? '⚠ ' + JSON.stringify(metrics.consoleErrors) : '✓ Ninguno'}
Animaciones atascadas: ${metrics.stuckAnimations.length > 0 ? '⚠ ' + JSON.stringify(metrics.stuckAnimations) : '✓ Ninguna'}
Tap targets < 44px: ${metrics.smallTapTargets > 0 ? `⚠ ${metrics.smallTapTargets} elementos` : '✓ Ninguno'}
Textos < 12px: ${metrics.smallTextElements > 0 ? `⚠ ${metrics.smallTextElements} elementos` : '✓ Ninguno'}
Imágenes rotas: ${metrics.brokenImages > 0 ? `⚠ ${metrics.brokenImages}` : '✓ Ninguna'}

═══ CÓDIGO FUENTE ═══
\`\`\`
${codeSection}
\`\`\`

═══ ANÁLISIS VISUAL (screenshots) ═══

Revisá estos aspectos adicionales que Playwright no puede medir:

1. LAYOUT VISUAL: ¿Hay secciones con fondo que tapa texto? ¿Grids rotos o asimétricos sin intención? ¿Elementos cortados en los bordes?
2. CONTRASTE: Sé específico — "texto #aaa sobre fondo #999 en la sección de features".
3. MOBILE: ¿El contenido se ve bien en 390px? ¿Grids que no colapsan correctamente?
4. ANIMACIONES: Comparando imagen 1 vs imagen 3, ¿hay diferencias? Si no las hay y el código usa Framer Motion, las animaciones pueden no estar funcionando.
5. COPY/CONVERSIÓN: ¿El headline responde una pregunta directa con métrica concreta? ¿CTA visible above the fold? ¿Social proof creíble?

REGLA CRÍTICA: Si Playwright reportó íconos rotos u overlaps, DEBÉS incluirlos como issues aunque no los puedas ver claramente en los screenshots — el DOM no miente.

Respondé ÚNICAMENTE con un array JSON válido:
[
  {
    "component": "NombreDelComponente",
    "category": "error",
    "severity": "critical",
    "description": "Descripción específica con datos concretos del DOM o del screenshot",
    "fixHint": "Instrucción técnica concreta: qué cambiar, en qué archivo, cómo"
  }
]

Reglas de output:
- Entre 3 y 8 issues totales.
- severity "critical" = roto/ilegible/bloquea conversión. "warning" = degradación visible. "suggestion" = mejora de calidad.
- Citá datos reales: nombres de selectores, texto visible, colores, coordenadas si los tenés.
- fixHint = instrucción de código accionable, no una vaguedad.
- NUNCA ignorés un ⚠ del reporte de Playwright — cada uno debe generar al menos un issue.
- Respondé SOLO con el array JSON, sin markdown ni texto extra.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  const text = textBlock?.type === 'text' ? textBlock.text : '[]';

  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const raw = JSON.parse(match[0]) as {
      component?: string;
      category?: string;
      severity?: string;
      description?: string;
      fixHint?: string;
    }[];
    return raw.map((item, i) => ({
      id: `issue-${i}-${Date.now()}`,
      component: item.component ?? 'General',
      category: (item.category ?? 'ux') as Issue['category'],
      severity: (item.severity ?? 'warning') as Issue['severity'],
      description: item.description ?? '',
      fixHint: item.fixHint ?? '',
    }));
  } catch {
    return [];
  }
}
