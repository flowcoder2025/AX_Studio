import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';

// GET /api/studio/gallery?projectId=xxx — 갤러리 목록
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId 필수' }, { status: 400 });
  }

  const items = db.listGalleryItems(projectId);

  // serve URL 추가
  const itemsWithUrl = items.map(item => ({
    ...item,
    fileUrl: `/api/output/serve?path=${item.file_path.replace(/\\/g, '/').replace(/^.*output\//, 'output/')}`,
  }));

  return NextResponse.json({ items: itemsWithUrl });
}
