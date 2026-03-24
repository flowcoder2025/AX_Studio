import { NextRequest, NextResponse } from 'next/server';
import { createPipeline, runPipeline, PipelineInput } from '@/lib/pipeline/engine';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const input: PipelineInput = await req.json();

    if (!input.mode || !input.category || !input.productName) {
      return NextResponse.json(
        { error: 'mode, category, productName are required' },
        { status: 400 }
      );
    }

    // Create project in DB (input_data 포함)
    const projectId = uuid();
    db.createProject(projectId, input.productName, input.category, input.mode, input);

    // Create pipeline run
    const pipelineId = createPipeline(projectId);

    // Start pipeline asynchronously (don't await)
    runPipeline(pipelineId, projectId, input).catch(err => {
      console.error('Pipeline failed:', err);
    });

    return NextResponse.json({
      projectId,
      pipelineId,
      status: 'idle',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
