import { NextRequest, NextResponse } from 'next/server';
import { comfyui } from '@/lib/comfyui/client';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { workflow, inputImage, outputDir, params } = await req.json();

    if (!workflow) {
      return NextResponse.json({ error: 'workflow name required' }, { status: 400 });
    }

    // Load workflow template
    const wf = await comfyui.loadWorkflow(workflow);

    // Upload input image if provided
    if (inputImage) {
      const uploaded = await comfyui.uploadImage(inputImage);
      // Inject uploaded image filename into workflow's LoadImage node
      for (const nodeId of Object.keys(wf)) {
        if (wf[nodeId].class_type === 'LoadImage') {
          wf[nodeId].inputs.image = uploaded.name;
          break;
        }
      }
    }

    // Apply custom params (prompt text, seed, etc.)
    if (params) {
      for (const [nodeId, inputs] of Object.entries(params as Record<string, any>)) {
        if (wf[nodeId]) {
          Object.assign(wf[nodeId].inputs, inputs);
        }
      }
    }

    // Queue the prompt
    const queued = await comfyui.queuePrompt(wf);

    // Wait for completion
    const result = await comfyui.waitForCompletion(queued.prompt_id);

    // Download output images
    const outputPaths: string[] = [];
    const defaultOutDir = path.join(process.cwd(), 'output', 'temp');
    const outputRoot = path.resolve(process.cwd(), 'output');
    let outDir = defaultOutDir;
    if (outputDir) {
      const resolved = path.resolve(process.cwd(), outputDir);
      outDir = resolved.startsWith(outputRoot) ? resolved : defaultOutDir;
    }
    await fs.mkdir(outDir, { recursive: true });

    for (const img of result.images) {
      const buffer = await comfyui.downloadOutput(img.filename, img.subfolder, img.type);
      const outPath = path.join(outDir, img.filename);
      await fs.writeFile(outPath, buffer);
      outputPaths.push(outPath);
    }

    return NextResponse.json({
      promptId: result.promptId,
      images: outputPaths,
      videos: result.videos?.map(v => v.filename) || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
