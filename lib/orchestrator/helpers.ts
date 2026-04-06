import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedFile, Plan } from './types';

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function extractText(resp: Anthropic.Message): string {
  const block = resp.content.find((c) => c.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

export function parseFilesFromText(text: string): GeneratedFile[] {
  const matches = [...text.matchAll(/===FILE:\s*(.+?)===\n([\s\S]*?)===ENDFILE===/g)];
  return matches.map((m) => ({ path: m[1].trim(), content: m[2] }));
}

export function toExportName(componentName: string): string {
  return `${componentName.toUpperCase()}_DATA`;
}

export function buildJsonLd(plan: Plan): Record<string, unknown> {
  const name = plan.metaTitle.split(' | ')[0]?.trim() ?? plan.summary;
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': plan.schemaType,
    name,
    description: plan.metaDescription,
  };

  if (plan.schemaType === 'SoftwareApplication') {
    base.applicationCategory = 'BusinessApplication';
    base.operatingSystem = 'Web';
    base.offers = { '@type': 'Offer', price: '0', priceCurrency: 'USD' };
  } else if (plan.schemaType === 'LocalBusiness' || plan.schemaType === 'Organization') {
    base.areaServed = 'Latinoamérica';
  } else if (plan.schemaType === 'Product') {
    base.offers = { '@type': 'Offer', availability: 'https://schema.org/InStock' };
  }

  return base;
}

export function buildPageFile(plan: Plan): GeneratedFile {
  const imports = plan.components
    .map((c) => `import ${c} from './components/${c}';`)
    .join('\n');
  const tags = plan.components.map((c) => `      <${c} />`).join('\n');
  const jsonLd = buildJsonLd(plan);

  // Escape for safe embedding inside template literal
  const metaTitle = plan.metaTitle.replace(/'/g, "\\'");
  const metaDesc = plan.metaDescription.replace(/'/g, "\\'");

  return {
    path: `app/(generated)/${plan.slug}/page.tsx`,
    content: `import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
${imports}

const font = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: '${metaTitle}',
  description: '${metaDesc}',
  openGraph: {
    title: '${metaTitle}',
    description: '${metaDesc}',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${metaTitle}',
    description: '${metaDesc}',
  },
};

const jsonLd = ${JSON.stringify(jsonLd, null, 2)};

export default function Page() {
  return (
    <main className={\`\${font.className} bg-zinc-950 text-white overflow-x-hidden\`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
${tags}
    </main>
  );
}
`,
  };
}
