import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';

// PUT /api/projects/[id]/blocks — save all blocks
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { blocks } = await req.json();
    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: 'blocks array required' }, { status: 400 });
    }
    db.saveBlocks(params.id, blocks);
    return NextResponse.json({ saved: blocks.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/projects/[id]/blocks — get blocks
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const blocks = db.getBlocks(params.id);
    return NextResponse.json({ blocks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
