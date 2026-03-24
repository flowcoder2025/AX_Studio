import { NextRequest, NextResponse } from 'next/server';
import { comfyui } from '@/lib/comfyui/client';
import { sendMessage } from '@/lib/claude/client';
import { buildVideoScriptPrompt } from '@/lib/claude/prompts';
import { kling } from '@/lib/kling/client';
import * as ffmpeg from '@/lib/ffmpeg/runner';
import { withRetry } from '@/lib/utils/retry';
import { CategoryId } from '@/lib/templates/categories';
import fs from 'fs/promises';
import path from 'path';

type VideoType = 'rotate_360' | 'demo' | 'before_after' | 'shortform';

export async function POST(req: NextRequest) {
  try {
    const {
      projectId, videoType, category, productName,
      productAnalysis, inputImage,
    } = await req.json() as {
      projectId: string;
      videoType: VideoType;
      category: CategoryId;
      productName: string;
      productAnalysis: any;
      inputImage?: string;
    };

    if (!projectId || !videoType || !category || !productName) {
      return NextResponse.json(
        { error: 'projectId, videoType, category, productName required' },
        { status: 400 }
      );
    }

    const outDir = path.join(process.cwd(), 'output', projectId, 'videos');
    await fs.mkdir(outDir, { recursive: true });

    const tempDir = path.join(process.cwd(), 'output', projectId, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Generate video script via Claude
    const script = await generateScript(productName, category, videoType, productAnalysis);

    // Route to workflow
    let outputPath: string;
    switch (videoType) {
      case 'rotate_360':
        outputPath = await generate360(outDir, tempDir, inputImage, script);
        break;
      case 'demo':
        outputPath = await generateDemo(outDir, tempDir, inputImage, script);
        break;
      case 'before_after':
        outputPath = await generateBeforeAfter(outDir, tempDir, script);
        break;
      case 'shortform':
        outputPath = await generateShortform(outDir, tempDir, script, inputImage);
        break;
      default:
        throw new Error(`Unknown video type: ${videoType}`);
    }

    // Cleanup temp
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

    return NextResponse.json({ videoPath: outputPath, videoType, script });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateScript(productName: string, category: CategoryId, videoType: VideoType, analysis: any) {
  const prompt = buildVideoScriptPrompt(productName, category, videoType, analysis);
  const res = await withRetry(() => sendMessage(
    [{ role: 'user', content: prompt }],
    { system: 'You are a Korean e-commerce video director. Respond with valid JSON only.' }
  ), { maxRetries: 2 });
  const text = res.content.find(c => c.type === 'text')?.text || '{}';
  return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
}

// === Workflow 1: 360° Rotation ===
async function generate360(outDir: string, tempDir: string, inputImage: string | undefined, script: any): Promise<string> {
  const outputPath = path.join(outDir, 'rotate_360.mp4');

  const comfyOk = await comfyui.healthCheck();
  const klingOk = await kling.isAvailable();

  // Preferred: Kling turntable (higher quality)
  if (klingOk && inputImage) {
    const imageBase64 = (await fs.readFile(inputImage)).toString('base64');
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    await kling.generateAndDownload(
      {
        image: imageUrl,
        prompt: script.klingPrompt || 'smooth 360 degree turntable rotation of the product, white background, studio lighting',
        duration: '5',
        aspect_ratio: '1:1',
      },
      outputPath
    );
    return outputPath;
  }

  // Fallback: ComfyUI Zero123++ → RIFE → FFmpeg
  if (comfyOk && inputImage) {
    // Step 1: RMBG
    const rmbgWf = await comfyui.loadWorkflow('rmbg');
    const uploaded = await comfyui.uploadImage(inputImage);
    injectLoadImage(rmbgWf, uploaded.name);
    const rmbgResult = await runWorkflow(rmbgWf);

    // Step 2: Rotate360 workflow
    const rotateWf = await comfyui.loadWorkflow('rotate-360');
    if (rmbgResult.images[0]) {
      injectLoadImage(rotateWf, rmbgResult.images[0].filename);
    }
    const rotateResult = await runWorkflow(rotateWf);

    // Step 3: If we got frames, encode to MP4
    if (rotateResult.images.length > 0) {
      // Download frames to temp
      for (let i = 0; i < rotateResult.images.length; i++) {
        const buf = await comfyui.downloadOutput(
          rotateResult.images[i].filename,
          rotateResult.images[i].subfolder,
          rotateResult.images[i].type
        );
        await fs.writeFile(path.join(tempDir, `frame_${String(i).padStart(4, '0')}.png`), buf);
      }

      await ffmpeg.framesToVideo(
        path.join(tempDir, 'frame_%04d.png'),
        outputPath,
        24,
        { loop: 1, crf: 20 }
      );
      return outputPath;
    }
  }

  // No services available — return empty path
  await fs.writeFile(outputPath.replace('.mp4', '.txt'), 'Video generation skipped: ComfyUI and Kling unavailable');
  return outputPath;
}

// === Workflow 2: Feature Demo ===
async function generateDemo(outDir: string, tempDir: string, inputImage: string | undefined, script: any): Promise<string> {
  const outputPath = path.join(outDir, 'demo.mp4');
  const clips: ffmpeg.ConcatInput[] = [];

  const comfyOk = await comfyui.healthCheck();
  const klingOk = await kling.isAvailable();
  const scenes = script.scenes || [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const clipPath = path.join(tempDir, `demo_clip_${i}.mp4`);

    if (comfyOk) {
      // 배경만 생성 (Flux 우선, SDXL fallback)
      let bgResult;
      const bgPromptText = scene.backgroundPrompt || 'clean neutral surface, soft studio lighting, minimalist';
      try {
        const fluxWf = await comfyui.loadWorkflow('bg-flux');
        injectPrompt(fluxWf, '4', bgPromptText);
        if (fluxWf['5']?.inputs) { fluxWf['5'].inputs.width = 1024; fluxWf['5'].inputs.height = 1024; }
        bgResult = await runWorkflow(fluxWf);
      } catch {
        const sdxlWf = await comfyui.loadWorkflow('background');
        injectPrompt(sdxlWf, '2', bgPromptText);
        if (sdxlWf['4']?.inputs) { sdxlWf['4'].inputs.width = 1024; sdxlWf['4'].inputs.height = 1024; }
        bgResult = await runWorkflow(sdxlWf);
      }

      // If Kling available, generate motion
      if (klingOk && bgResult.images[0]) {
        const compositeBuf = await comfyui.downloadOutput(
          bgResult.images[0].filename, bgResult.images[0].subfolder, bgResult.images[0].type
        );
        const compositeFile = path.join(tempDir, `composite_${i}.png`);
        await fs.writeFile(compositeFile, compositeBuf);

        const base64 = compositeBuf.toString('base64');
        await kling.generateAndDownload(
          {
            image: `data:image/png;base64,${base64}`,
            prompt: scene.klingPrompt || 'gentle product showcase motion',
            duration: '5',
            aspect_ratio: '1:1',
          },
          clipPath
        );
      } else {
        // Static frame → short video
        if (bgResult.images[0]) {
          const buf = await comfyui.downloadOutput(
            bgResult.images[0].filename, bgResult.images[0].subfolder, bgResult.images[0].type
          );
          const framePath = path.join(tempDir, `static_${i}.png`);
          await fs.writeFile(framePath, buf);
          await ffmpeg.framesToVideo(framePath, clipPath, 30, { crf: 20, duration: scene.duration || 4 });
        }
      }
    }

    // Add text overlay if clip exists
    try {
      await fs.access(clipPath);
      if (scene.overlayText) {
        const withTextPath = path.join(tempDir, `demo_text_${i}.mp4`);
        await ffmpeg.addTextOverlay(clipPath, withTextPath, [{
          text: scene.overlayText,
          x: '(w-text_w)/2',
          y: 'h-80',
          fontsize: 36,
          fontcolor: 'white',
          startTime: 0.5,
          endTime: scene.duration || 4,
          fadeIn: 0.5,
        }]);
        clips.push({ file: withTextPath, duration: scene.duration || 4 });
      } else {
        clips.push({ file: clipPath, duration: scene.duration || 4 });
      }
    } catch {
      // Clip not generated, skip
    }
  }

  // Concat clips
  if (clips.length > 0) {
    await ffmpeg.concatWithTransitions(clips, outputPath, 'fade', 0.5);
  }
  return outputPath;
}

// === Workflow 3: Before→After ===
async function generateBeforeAfter(outDir: string, tempDir: string, script: any): Promise<string> {
  const outputPath = path.join(outDir, 'before_after.mp4');
  const comfyOk = await comfyui.healthCheck();
  const klingOk = await kling.isAvailable();

  if (!comfyOk) return outputPath;

  // Generate before/after image pair
  const baWf = await comfyui.loadWorkflow('before-after');
  injectPrompt(baWf, '2', script.beforePrompt || 'problem state, dirty, worn out');
  injectPrompt(baWf, '13', script.afterPrompt || 'improved state, clean, renewed');

  const baResult = await runWorkflow(baWf);

  if (baResult.images.length < 2) return outputPath;

  // Download both images
  const beforeBuf = await comfyui.downloadOutput(
    baResult.images[0].filename, baResult.images[0].subfolder, baResult.images[0].type
  );
  const afterBuf = await comfyui.downloadOutput(
    baResult.images[1].filename, baResult.images[1].subfolder, baResult.images[1].type
  );

  const beforePath = path.join(tempDir, 'before.png');
  const afterPath = path.join(tempDir, 'after.png');
  await fs.writeFile(beforePath, beforeBuf);
  await fs.writeFile(afterPath, afterBuf);

  if (klingOk) {
    // Kling morph transition
    const morphPath = path.join(tempDir, 'morph.mp4');
    const b64 = beforeBuf.toString('base64');
    await kling.generateAndDownload(
      {
        image: `data:image/png;base64,${b64}`,
        prompt: script.klingMorphPrompt || 'smooth transformation, gradual improvement',
        duration: '5',
        aspect_ratio: '1:1',
      },
      morphPath
    );

    // Add BEFORE/AFTER labels
    const labeledPath = path.join(tempDir, 'morph_labeled.mp4');
    await ffmpeg.addTextOverlay(morphPath, labeledPath, [
      {
        text: script.beforeLabel || 'BEFORE',
        x: '(w-text_w)/2', y: '40',
        fontsize: 48, fontcolor: 'white',
        startTime: 0, endTime: 2, fadeIn: 0.3,
      },
      {
        text: script.afterLabel || 'AFTER',
        x: '(w-text_w)/2', y: '40',
        fontsize: 48, fontcolor: 'white',
        startTime: 3, endTime: 5, fadeIn: 0.3,
      },
    ]);

    await fs.copyFile(labeledPath, outputPath);
  } else {
    // FILM interpolation fallback — create hold + crossfade
    const holdBefore = path.join(tempDir, 'hold_before.mp4');
    const holdAfter = path.join(tempDir, 'hold_after.mp4');

    // Create 2s holds from static images
    await ffmpeg.framesToVideo(beforePath, holdBefore, 30, { crf: 20, duration: 3 });
    await ffmpeg.framesToVideo(afterPath, holdAfter, 30, { crf: 20, duration: 3 });

    // Add labels
    const labeledBefore = path.join(tempDir, 'lb.mp4');
    const labeledAfter = path.join(tempDir, 'la.mp4');
    await ffmpeg.addTextOverlay(holdBefore, labeledBefore, [{
      text: script.beforeLabel || 'BEFORE', x: '(w-text_w)/2', y: '40',
      fontsize: 48, fontcolor: 'white', startTime: 0, endTime: 3,
    }]);
    await ffmpeg.addTextOverlay(holdAfter, labeledAfter, [{
      text: script.afterLabel || 'AFTER', x: '(w-text_w)/2', y: '40',
      fontsize: 48, fontcolor: 'white', startTime: 0, endTime: 3,
    }]);

    // Concat with crossfade
    await ffmpeg.concatWithTransitions(
      [{ file: labeledBefore, duration: 3 }, { file: labeledAfter, duration: 3 }],
      outputPath,
      'fade',
      1.0
    );
  }

  return outputPath;
}

// === Workflow 4: Text Shortform ===
async function generateShortform(outDir: string, tempDir: string, script: any, inputImage?: string): Promise<string> {
  const outputPath = path.join(outDir, 'shortform.mp4');
  const scenes = script.scenes || [];
  if (scenes.length === 0) return outputPath;

  const comfyOk = await comfyui.healthCheck();
  const clips: ffmpeg.ConcatInput[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const dur = scene.duration || 3;
    const clipPath = path.join(tempDir, `short_${i}.mp4`);

    // KPI count-up scene
    if (scene.kpiValue) {
      await ffmpeg.createKpiCountUp(
        Number(scene.kpiValue),
        scene.kpiLabel || '',
        clipPath,
        dur,
        { width: 1080, height: 1920, bgColor: '0x0a0a0a', textColor: 'white' }
      );
      clips.push({ file: clipPath, duration: dur });
      continue;
    }

    // Text scene with background
    let bgPath: string | null = null;
    if (comfyOk && scene.backgroundPrompt) {
      const bgWf = await comfyui.loadWorkflow('background');
      injectPrompt(bgWf, '2', scene.backgroundPrompt);
      // Set 9:16 aspect ratio
      for (const nodeId of Object.keys(bgWf)) {
        if (bgWf[nodeId].class_type === 'EmptyLatentImage') {
          bgWf[nodeId].inputs.width = 1080;
          bgWf[nodeId].inputs.height = 1920;
        }
      }
      const bgResult = await runWorkflow(bgWf);
      if (bgResult.images[0]) {
        const buf = await comfyui.downloadOutput(
          bgResult.images[0].filename, bgResult.images[0].subfolder, bgResult.images[0].type
        );
        bgPath = path.join(tempDir, `bg_${i}.png`);
        await fs.writeFile(bgPath, buf);
      }
    }

    // Create video from background (or solid color)
    if (bgPath) {
      await ffmpeg.framesToVideo(bgPath, clipPath, 30, { crf: 20, duration: dur });
    } else {
      // Solid dark background
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const exec = promisify(execFile);
      await exec(process.env.FFMPEG_PATH || 'ffmpeg', [
        '-y', '-f', 'lavfi',
        '-i', `color=c=0x0a0a0a:s=1080x1920:d=${dur}:r=30`,
        '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', clipPath,
      ]);
    }

    // Add text overlay
    if (scene.text) {
      const textClip = path.join(tempDir, `short_text_${i}.mp4`);
      await ffmpeg.addTextOverlay(clipPath, textClip, [{
        text: scene.text,
        x: '(w-text_w)/2',
        y: '(h-text_h)/2',
        fontsize: 64,
        fontcolor: 'white',
        startTime: 0.3,
        endTime: dur - 0.2,
        fadeIn: 0.4,
      }]);
      clips.push({ file: textClip, duration: dur });
    } else {
      clips.push({ file: clipPath, duration: dur });
    }
  }

  // Concat all scenes
  if (clips.length > 0) {
    await ffmpeg.concatWithTransitions(clips, outputPath, 'fade', 0.5);
  }

  return outputPath;
}

// === Helpers ===

function injectLoadImage(wf: Record<string, any>, imageName: string) {
  for (const nodeId of Object.keys(wf)) {
    if (wf[nodeId].class_type === 'LoadImage') {
      wf[nodeId].inputs.image = imageName;
      return;
    }
  }
}

function injectPrompt(wf: Record<string, any>, nodeId: string, text: string) {
  if (wf[nodeId]?.inputs) {
    wf[nodeId].inputs.text = text;
  }
}

async function runWorkflow(wf: Record<string, any>) {
  // Remove _meta before sending to ComfyUI
  const clean = { ...wf };
  delete clean._meta;
  const queued = await comfyui.queuePrompt(clean);
  return comfyui.waitForCompletion(queued.prompt_id);
}
