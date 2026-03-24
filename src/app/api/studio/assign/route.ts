import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';

// POST /api/studio/assign — 갤러리 항목을 블록에 배정
export async function POST(req: NextRequest) {
  try {
    const { galleryItemId, blockId, field } = await req.json();

    if (!galleryItemId || !blockId || !field) {
      return NextResponse.json({ error: 'galleryItemId, blockId, field 필수' }, { status: 400 });
    }

    const item = db.getGalleryItem(galleryItemId);
    if (!item) {
      return NextResponse.json({ error: '갤러리 항목 없음' }, { status: 404 });
    }

    // serve URL 생성
    const fileUrl = `/api/output/serve?path=${item.file_path.replace(/\\/g, '/').replace(/^.*output\//, 'output/')}`;

    // 블록 data에 URL 설정
    const blocks = db.getBlocks(item.project_id);
    const block = blocks.find((b: any) => b.id === blockId);
    if (!block) {
      return NextResponse.json({ error: '블록 없음' }, { status: 404 });
    }

    const data = block.data as any;

    // 단순 필드 (heroImageUrl, imageUrl, videoUrl)
    if (!field.includes('.')) {
      data[field] = fileUrl;
    } else {
      // 중첩 필드 (features.0.imageUrl, items.1.imageUrl, steps.2.imageUrl)
      const parts = field.split('.');
      if (parts.length === 3) {
        const [arrKey, indexStr, prop] = parts;
        const arr = data[arrKey] || data.items;
        const idx = parseInt(indexStr);
        if (arr?.[idx]) {
          arr[idx][prop] = fileUrl;
        }
      }
    }

    db.updateBlock(blockId, data);

    // 갤러리 항목에 배정 정보 기록
    db.assignGalleryItem(galleryItemId, blockId, field);

    return NextResponse.json({ assigned: true, blockId, field, fileUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
