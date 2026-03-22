import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type') || 'html'; // html | image | video

  if (!projectId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const baseDir = path.join(process.cwd(), 'output', projectId);

  try {
    let filePath: string;
    let contentType: string;

    switch (type) {
      case 'html':
        filePath = path.join(baseDir, 'html', 'detail-page.html');
        contentType = 'text/html';
        break;
      case 'image':
        const platform = req.nextUrl.searchParams.get('platform') || 'default';
        const format = req.nextUrl.searchParams.get('format') || 'png';
        filePath = path.join(baseDir, 'images', `detail-${platform}.${format === 'jpeg' ? 'jpg' : 'png'}`);
        contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        break;
      case 'video':
        const videoType = req.nextUrl.searchParams.get('videoType') || 'rotate_360';
        filePath = path.join(baseDir, 'videos', `${videoType}.mp4`);
        contentType = 'video/mp4';
        break;
      default:
        return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }

    const buffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
