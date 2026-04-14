function extractProps(content: string): string | null {
  const match = content.match(/(?:interface|type)\s+Props[\s\S]*?\{[\s\S]*?\n\}/);
  return match ? match[0] : null;
}

function buildTree(paths: string[], slug: string): string {
  const prefix = `app/(generated)/${slug}/`;
  const relative = paths
    .filter((p) => p.startsWith(prefix))
    .map((p) => p.slice(prefix.length))
    .sort();
  return relative.map((p) => `  ${p}`).join('\n');
}

export function buildSlugContext(
  existingFiles: { path: string; content: string }[],
  slug: string
): string {
  const parts: string[] = [];

  const tree = buildTree(existingFiles.map((f) => f.path), slug);
  if (tree) parts.push(`## Estructura del proyecto\n\`\`\`\n${tree}\n\`\`\``);

  const page = existingFiles.find((f) => f.path === `app/(generated)/${slug}/page.tsx`);
  if (page) parts.push(`## page.tsx\n\`\`\`tsx\n${page.content}\n\`\`\``);

  const data = existingFiles.find((f) => f.path.endsWith('data/content.ts'));
  if (data) parts.push(`## data/content.ts\n\`\`\`ts\n${data.content}\n\`\`\``);

  const componentFiles = existingFiles.filter((f) =>
    f.path.includes(`/components/`) && f.path.endsWith('.tsx')
  );
  const propsList = componentFiles
    .map((f) => {
      const props = extractProps(f.content);
      if (!props) return null;
      const name = f.path.split('/components/')[1]?.replace(/\/(index)?\.tsx$/, '').replace(/\.tsx$/, '');
      return `### ${name}\n\`\`\`ts\n${props}\n\`\`\``;
    })
    .filter(Boolean);
  if (propsList.length > 0) parts.push(`## Interfaces de componentes\n${propsList.join('\n\n')}`);

  return parts.join('\n\n');
}
