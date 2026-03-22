import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

// POST — 현재 프로젝트를 템플릿으로 저장
export async function POST(req: NextRequest) {
  try {
    const { name, projectId } = await req.json();

    if (!name || !projectId) {
      return NextResponse.json({ error: 'name and projectId are required' }, { status: 400 });
    }

    const project = db.getProject(projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const blocks = db.getBlocks(projectId);

    const templateId = uuid();
    db.saveTemplate(
      templateId,
      name,
      project.category,
      blocks.map((b: any) => b.type),
      blocks.reduce((acc: any, b: any) => ({ ...acc, [b.type]: b.data }), {})
    );

    return NextResponse.json({ templateId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — 템플릿 목록
export async function GET() {
  try {
    const templates = db.listTemplates();
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
