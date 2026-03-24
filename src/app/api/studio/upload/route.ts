import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import * as db from '@/lib/db/client';

const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']);
const ALLOWED_VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);

// POST /api/studio/upload — 이미지/영상 직접 업로드 → 갤러리에 추가
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const projectId = formData.get('projectId') as string;
    const file = formData.get('file') as File;

    if (!projectId || !file) {
      return NextResponse.json({ error: 'projectId, file 필수' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isImage = ALLOWED_IMAGE_EXTS.has(ext);
    const isVideo = ALLOWED_VIDEO_EXTS.has(ext);

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: '지원하지 않는 파일 형식' }, { status: 400 });
    }

    const galleryDir = path.join(process.cwd(), 'output', projectId, 'gallery');
    await fs.mkdir(galleryDir, { recursive: true });

    const itemId = uuid();
    const fileName = `${itemId}.${ext}`;
    const filePath = path.join(galleryDir, fileName);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buf);

    let width: number | undefined;
    let height: number | undefined;

    if (isImage) {
      try {
        const meta = await sharp(filePath).metadata();
        width = meta.width;
        height = meta.height;
      } catch { /* 이미지 메타데이터 읽기 실패 무시 */ }
    }

    db.createGalleryItem(
      itemId, projectId,
      isImage ? 'image' : 'video',
      'upload',
      file.name, null,
      filePath, buf.length,
      width, height
    );

    const serveUrl = `/api/output/serve?path=output/${projectId}/gallery/${fileName}`;

    return NextResponse.json({
      galleryItem: {
        id: itemId,
        type: isImage ? 'image' : 'video',
        workflow: 'upload',
        promptKo: file.name,
        fileUrl: serveUrl,
        width, height,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
