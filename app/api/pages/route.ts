import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as { slugs?: string[] };
  const slugs = body.slugs;
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return NextResponse.json({ error: 'slugs required' }, { status: 400 });
  }
  await Promise.allSettled(
    slugs.map((slug) =>
      fs.rm(path.join(process.cwd(), 'app/(generated)', slug), { recursive: true, force: true })
    )
  );
  return NextResponse.json({ ok: true });
}
