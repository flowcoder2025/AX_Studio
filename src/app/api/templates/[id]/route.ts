import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';

// GET — 템플릿 상세 (블록 데이터 포함)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = db.getTemplate(params.id);
    if (!template) return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 });

    return NextResponse.json({
      id: template.id,
      name: template.name,
      category: template.category,
      includeCopy: template.include_copy === 1,
      blocks: JSON.parse(template.blocks_json),
      createdAt: template.created_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — 템플릿 삭제
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    db.deleteTemplate(params.id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
