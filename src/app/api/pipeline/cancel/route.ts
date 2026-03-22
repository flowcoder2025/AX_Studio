import { NextRequest, NextResponse } from 'next/server';
import { cancelPipeline } from '@/lib/pipeline/engine';

export async function POST(req: NextRequest) {
  const { pipelineId } = await req.json();
  if (!pipelineId) {
    return NextResponse.json({ error: 'pipelineId required' }, { status: 400 });
  }
  cancelPipeline(pipelineId);
  return NextResponse.json({ cancelled: true });
}
