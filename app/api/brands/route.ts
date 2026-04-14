import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { BrandProfile, BrandSummary } from '@/lib/brands';

const BRANDS_DIR = path.join(process.cwd(), 'brands');

export async function GET() {
  try {
    await fs.mkdir(BRANDS_DIR, { recursive: true });
    const files = await fs.readdir(BRANDS_DIR);
    const summaries: BrandSummary[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const p = JSON.parse(await fs.readFile(path.join(BRANDS_DIR, file), 'utf-8')) as BrandProfile;
        summaries.push({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt,
          hasAesthetic: Boolean(p.aesthetic),
          hasTone: Boolean(p.tone),
          hasIdentity: Boolean(p.identity),
        });
      } catch { /* skip */ }
    }
    summaries.sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json(summaries);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const profile = (await request.json()) as BrandProfile;
  if (!profile.id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  try {
    await fs.mkdir(BRANDS_DIR, { recursive: true });
    await fs.writeFile(path.join(BRANDS_DIR, `${profile.id}.json`), JSON.stringify(profile), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
