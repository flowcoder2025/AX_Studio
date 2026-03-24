import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type') || 'html';

  if (!projectId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const baseDir = path.join(process.cwd(), 'output', projectId);

  try {
    let filePath: string;
    let contentType: string;
    let suffix: string;

    switch (type) {
      case 'html':
        filePath = path.join(baseDir, 'html', 'detail-page.html');
        contentType = 'text/html';
        suffix = '상세페이지.html';
        break;
      case 'image': {
        const platform = req.nextUrl.searchParams.get('platform') || 'default';
        const format = req.nextUrl.searchParams.get('format') || 'png';
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        filePath = path.join(baseDir, 'images', `detail-${platform}.${ext}`);
        contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        suffix = `${platform}.${ext}`;
        break;
      }
      case 'video': {
        const videoType = req.nextUrl.searchParams.get('videoType') || 'rotate_360';
        filePath = path.join(baseDir, 'videos', `${videoType}.mp4`);
        contentType = 'video/mp4';
        suffix = `${videoType}.mp4`;
        break;
      }
      default:
        return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }

    const buffer = await fs.readFile(filePath);

    const project = db.getProject(projectId);
    const projectName = (project?.name || 'export')
      .replace(/[^a-zA-Z0-9가-힣\s_-]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const downloadName = `${projectName}_${suffix}`;

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
