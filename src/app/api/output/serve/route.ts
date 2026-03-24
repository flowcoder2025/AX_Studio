import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.html': 'text/html',
};

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'path parameter required' }, { status: 400 });
  }

  // 입력값이 output/ 접두사로 시작하도록 강제
  if (!filePath.startsWith('output/') && !filePath.startsWith('output\\')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Resolve to absolute path under output/
  const resolved = path.resolve(process.cwd(), filePath);
  const outputRoot = path.resolve(process.cwd(), 'output');

  // Security: only serve files under output/ directory
  if (!resolved.startsWith(outputRoot + path.sep) && resolved !== outputRoot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const data = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
