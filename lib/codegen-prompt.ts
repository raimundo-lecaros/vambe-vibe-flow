import {
  ARCHITECTURE_SECTION,
  ANIMATIONS_SECTION,
  ICONS_SECTION,
  CODE_RULES_SECTION,
  SEO_GEO_SECTION,
  FORMAT_SECTION,
} from './codegen-prompt-sections';

interface PromptParams {
  installedDeps?: string[];
  existingFiles?: { path: string; content: string }[];
}

export function buildCodegenSystemPrompt({
  installedDeps = [],
  existingFiles = [],
}: PromptParams = {}): string {
  const depsSection = installedDeps.length > 0
    ? `\nDEPENDENCIAS DISPONIBLES — solo podés importar estas:\n${installedDeps.join(', ')}\n\nSi el diseño requiere una dep no listada, declarala DESPUÉS de SUMMARY: y ANTES del primer ===FILE:===:\nDEPS: nombre-paquete, otro-paquete\nSi no necesitás deps nuevas, omití la línea DEPS: completamente.`
    : '';

  const editSection = existingFiles.length > 0
    ? `\nMODO EDIT — Archivos actuales del proyecto:\n${existingFiles.map((f) => `===CURRENT: ${f.path}===\n${f.content}\n===ENDCURRENT===`).join('\n')}\n\nREGLA CRÍTICA: Incluí SOLO los archivos que realmente modificás. No incluyas archivos sin cambios.`
    : '';

  return [
    ARCHITECTURE_SECTION,
    ANIMATIONS_SECTION,
    ICONS_SECTION,
    CODE_RULES_SECTION,
    SEO_GEO_SECTION,
    FORMAT_SECTION,
    depsSection,
    editSection,
  ].filter(Boolean).join('\n\n');
}
