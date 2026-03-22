import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';

// GET /api/projects/[id] — fetch project with blocks
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = db.getProject(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const blocks = db.getBlocks(params.id);
    const outputs = db.getOutputs(params.id);

    return NextResponse.json({
      ...project,
      input_data: JSON.parse(project.input_data || '{}'),
      blocks,
      outputs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    db.deleteProject(params.id);
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
