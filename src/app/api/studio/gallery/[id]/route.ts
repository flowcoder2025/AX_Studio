import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import fs from 'fs/promises';

// DELETE /api/studio/gallery/[id] — 갤러리 항목 삭제
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = db.getGalleryItem(params.id);
    if (!item) {
      return NextResponse.json({ error: '항목 없음' }, { status: 404 });
    }

    // 파일 삭제
    await fs.unlink(item.file_path).catch(() => {});

    // 블록에 배정된 상태면 블록 data에서 URL 제거
    if (item.assigned_block_id && item.assigned_field) {
      const blocks = db.getBlocks(item.project_id);
      const block = blocks.find((b: any) => b.id === item.assigned_block_id);
      if (block) {
        const data = block.data as any;
        // 단순 필드 (heroImageUrl, imageUrl, videoUrl)
        if (item.assigned_field in data) {
          delete data[item.assigned_field];
        }
        // 중첩 필드 (features.0.imageUrl)
        const parts = item.assigned_field.split('.');
        if (parts.length === 3) {
          const [arrKey, indexStr, field] = parts;
          const arr = data[arrKey] || data.items;
          const idx = parseInt(indexStr);
          if (arr?.[idx]) {
            delete arr[idx][field];
          }
        }
        db.updateBlock(block.id, data);
      }
    }

    // DB 삭제
    db.deleteGalleryItem(params.id);

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
