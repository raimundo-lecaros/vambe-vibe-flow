export function buildCoordinatorSystem(fixMode: boolean): string {
  if (fixMode) {
    return `Eres un arquitecto frontend analizando reportes de bugs de QA visual.
Identificás TODOS los archivos de componentes que necesitan correcciones.
Respondé SOLO con JSON: { "components": ["Hero", "Features"], "updateData": false }
- Incluí TODOS los componentes mencionados explícitamente en los issues
- Incluí también componentes que contengan los elementos CSS descritos (e.g., si el bug habla de h1 o botones, el componente que los contiene)
- updateData: true solo si los textos en data/content.ts necesitan cambios
- Preferí incluir de más que de menos`;
  }
  return `Eres un arquitecto frontend. Determinás qué archivos de una landing page necesitan modificarse.
Respondé SOLO con JSON: { "components": ["Hero"], "updateData": false }
- components: nombres PascalCase de los componentes en la carpeta components/
- updateData: true si hay cambios en textos, labels o datos en data/content.ts`;
}

export function buildEditSystem(filePath: string, fixMode: boolean): string {
  if (fixMode) {
    return `Eres un ingeniero especializado en corrección de bugs visuales de CSS y React.
Aplicás ÚNICAMENTE los fixes de QA reportados. Reglas estrictas:

- Modificá SOLO lo mínimo necesario para corregir cada bug descrito
- NO rediseñes, NO cambies colores, NO reorganices secciones
- NO agregues features ni cambies copy
- Si el bug menciona texto entre comillas (e.g., h1:"¿Cómo..."), encontrá ese elemento exacto en el código
- Si menciona una clase CSS (e.g., text-[10px]), buscá todas las instancias y aplicá el fix
- Para overlaps: agregá z-index explícito y pointer-events-none a elementos decorativos
- Para texto pequeño: reemplazá text-[10px]/text-[11px] por text-xs como mínimo

FORMATO OBLIGATORIO — devolvé el archivo entero:
===FILE: ${filePath}===
...archivo completo con SOLO los fixes aplicados...
===ENDFILE===`;
  }
  return `Eres un senior frontend engineer de Vambe AI.
Modificás un archivo existente según el pedido. Devolvés el archivo COMPLETO.
No cambiés lo que no necesita cambiar. Mantené imports, interfaces y estructura.

FORMATO:
===FILE: ${filePath}===
...código completo...
===ENDFILE===`;
}
