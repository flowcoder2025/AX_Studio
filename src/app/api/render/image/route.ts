import { NextRequest, NextResponse } from 'next/server';
import { renderFileToImage } from '@/lib/puppeteer/renderer';
import { saveOutput } from '@/lib/db/client';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const { projectId, platform, format } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const htmlPath = path.join(process.cwd(), 'output', projectId, 'html', 'detail-page.html');

    // Check HTML exists
    try {
      await fs.access(htmlPath);
    } catch {
      return NextResponse.json({ error: 'HTML not found. Generate HTML first.' }, { status: 404 });
    }

    const outDir = path.join(process.cwd(), 'output', projectId, 'images');
    await fs.mkdir(outDir, { recursive: true });

    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const outPath = path.join(outDir, `detail-${platform || 'default'}.${ext}`);

    await renderFileToImage(htmlPath, outPath, {
      platform: platform || 'default',
      format: format || 'png',
    });

    const stat = await fs.stat(outPath);

    saveOutput(uuid(), projectId, 'image', platform || 'default', outPath, stat.size);

    return NextResponse.json({
      imagePath: outPath,
      platform: platform || 'default',
      size: stat.size,
      format: format || 'png',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
