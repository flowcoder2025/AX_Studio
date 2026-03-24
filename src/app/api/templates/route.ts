import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

// POST — 현재 프로젝트 블록을 템플릿으로 저장
export async function POST(req: NextRequest) {
  try {
    const { name, projectId, includeCopy } = await req.json();

    if (!name || !projectId) {
      return NextResponse.json({ error: 'name, projectId 필수' }, { status: 400 });
    }

    const project = db.getProject(projectId);
    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });

    const blocks = db.getBlocks(projectId);
    const templateId = uuid();

    db.saveTemplate(templateId, name, project.category, !!includeCopy, blocks);

    return NextResponse.json({ templateId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — 템플릿 목록
export async function GET() {
  try {
    const templates = db.listTemplates().map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      includeCopy: t.include_copy === 1,
      blockCount: JSON.parse(t.blocks_json).length,
      createdAt: t.created_at,
    }));
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
