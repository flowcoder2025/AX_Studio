import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = db.getProject(params.id);
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const sourceBlocks = db.getBlocks(params.id);

    const newId = uuid();
    db.createProject(newId, source.name + ' (복사)', source.category, source.mode);

    const newBlocks = sourceBlocks.map((b: any) => ({
      ...b,
      id: uuid(),
    }));
    db.saveBlocks(newId, newBlocks);

    return NextResponse.json({ projectId: newId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
