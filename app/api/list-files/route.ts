import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface FileEntry { path: string; lines: number; }

function walk(dir: string, base: string): FileEntry[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: FileEntry[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full, base));
    } else {
      const content = fs.readFileSync(full, 'utf-8');
      result.push({
        path: path.relative(base, full).replace(/\\/g, '/'),
        lines: content.split('\n').length,
      });
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug || slug.includes('..')) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });

  const dir = path.join(process.cwd(), 'app/(generated)', slug);
  if (!fs.existsSync(dir)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ files: walk(dir, dir) });
}
