import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif']);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadId = (formData.get('projectId') as string) || uuid();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // 공용 temp 디렉토리에 업로드 (파이프라인이 실제 프로젝트 디렉토리로 복사함)
    const dir = path.join(process.cwd(), 'output', 'uploads', uploadId);
    await fs.mkdir(dir, { recursive: true });

    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      if (!ALLOWED_IMAGE_EXTS.has(ext)) continue;
      const filePath = path.join(dir, `product_${i}.${ext}`);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buf);
      paths.push(filePath);
    }

    return NextResponse.json({ uploadId, imagePaths: paths });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
