import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export interface BrandProfile {
  id: string;
  name: string;
  createdAt: number;
  brief: string;
}

const BRANDS_DIR = path.join(process.cwd(), 'brands');

export async function GET() {
  try {
    await fs.mkdir(BRANDS_DIR, { recursive: true });
    const files = await fs.readdir(BRANDS_DIR);
    const profiles: BrandProfile[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(BRANDS_DIR, file), 'utf-8');
        profiles.push(JSON.parse(raw) as BrandProfile);
      } catch { /* skip corrupt */ }
    }
    profiles.sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json(profiles);
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
