// Pipeline Engine — orchestrates full AX Studio generation with DB persistence and retry

import { v4 as uuid } from 'uuid';
import * as db from '@/lib/db/client';
import { CategoryId, getCategoryById } from '@/lib/templates/categories';
import { BlockDefinition, BlockType } from '@/types/block';
import { sendMessage } from '@/lib/claude/client';
import { buildAnalysisPrompt, buildCopyPrompt, buildBlockRecommendationPrompt, buildVideoScriptPrompt } from '@/lib/claude/prompts';
import { comfyui } from '@/lib/comfyui/client';
import { kling } from '@/lib/kling/client';
import * as ffmpeg from '@/lib/ffmpeg/runner';
import { withRetry } from '@/lib/utils/retry';
import fs from 'fs/promises';
import path from 'path';

function serveUrl(projectId: string, subpath: string): string {
  return `/api/output/serve?path=output/${projectId}/${subpath}`;
}

export type PipelineStatus =
  | 'idle' | 'analyzing' | 'generating_copy' | 'generating_images'
  | 'generating_videos' | 'assembling' | 'rendering' | 'complete' | 'error';

export type InputMode = 'simple' | 'detailed' | 'remake';

export interface PipelineInput {
  mode: InputMode;
  category: CategoryId;
  productName: string;
  productImages?: string[];
  keyFeatures?: string;
  price?: string;
  targetAudience?: string;
  specSheet?: Record<string, string>;
  reviews?: { rating: number; text: string }[];
  certifications?: string[];
  priceOptions?: { name: string; price: string; description: string }[];
  sourceUrl?: string;
  languages?: string[];
}

// In-memory status for SSE (DB is source of truth for persistence)
const liveStatus = new Map<string, { status: PipelineStatus; progress: number; step: string }>();

export function createPipeline(projectId: string): string {
  const id = uuid();
  db.createPipelineRun(id, projectId);
  liveStatus.set(id, { status: 'idle', progress: 0, step: 'Waiting to start' });
  return id;
}

export function getPipelineStatus(id: string) {
  return liveStatus.get(id) || null;
}

function update(id: string, status: PipelineStatus, progress: number, step: string) {
  liveStatus.set(id, { status, progress, step });
  db.updatePipelineRun(id, status, progress, step);
}

export async function runPipeline(pipelineId: string, projectId: string, input: PipelineInput): Promise<void> {
  const category = getCategoryById(input.category);
  if (!category) {
    update(pipelineId, 'error', 0, `Unknown category: ${input.category}`);
    return;
  }

  try {
    // === Step 1: Analyze product (10%) ===
    update(pipelineId, 'analyzing', 5, '제품 분석 중...');

    // Mode B: specs를 분석 프롬프트에 주입
    if (input.specSheet && Object.keys(input.specSheet).length > 0) {
      const specString = Object.entries(input.specSheet)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      input.keyFeatures = (input.keyFeatures || '') + '\n\n[스펙시트 데이터]\n' + specString;
    }

    let analysis: any = {};
    try {
      const prompt = buildAnalysisPrompt(input.productName, input.category, input.keyFeatures);
      const res = await withRetry(() => sendMessage(
        [{ role: 'user', content: prompt }],
        { system: 'You are a Korean e-commerce product analyst. Respond with valid JSON only.' }
      ), { maxRetries: 2 });
      const text = res.content.find(c => c.type === 'text')?.text || '{}';
      analysis = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    } catch (e: any) {
      console.warn('Analysis failed, using defaults:', e.message);
      analysis = {
        productSummary: input.productName,
        keySellingPoints: input.keyFeatures?.split(',').map(s => s.trim()) || [],
        painpoints: [],
      };
    }

    update(pipelineId, 'analyzing', 10, '블록 구성 결정 중...');

    // === Step 2: Determine block order (15%) ===
    let blockOrder = category.blockOrder;
    try {
      const recPrompt = buildBlockRecommendationPrompt(
        input.category, analysis, !!input.productImages?.length
      );
      const recRes = await withRetry(() => sendMessage(
        [{ role: 'user', content: recPrompt }],
        { system: 'You are an e-commerce UX expert. Respond with valid JSON only.' }
      ), { maxRetries: 1 });
      const recText = recRes.content.find(c => c.type === 'text')?.text || '{}';
      const rec = JSON.parse(recText.replace(/```json\n?|```/g, '').trim());
      if (rec.blockOrder?.length) blockOrder = rec.blockOrder;
    } catch {
      // Use default order
    }

    // Build block structure
    const blocks: BlockDefinition[] = blockOrder.map((type: BlockType, index: number) => ({
      id: uuid(),
      type,
      order: index,
      source: getBlockSource(type),
      data: {},
      images: [],
      videos: [],
      visible: true,
    }));

    update(pipelineId, 'generating_copy', 20, '카피 생성 중...');

    // === Step 3: Generate copy for all blocks (40%) ===
    const textBlockTypes = blocks
      .filter(b => !b.type.startsWith('video_') && !['styling', 'unboxing', 'process'].includes(b.type))
      .map(b => b.type);

    try {
      const copyPrompt = buildCopyPrompt(input.productName, input.category, analysis, textBlockTypes, input.languages);
      const copyRes = await withRetry(() => sendMessage(
        [{ role: 'user', content: copyPrompt }],
        { system: 'You are a top Korean e-commerce copywriter. Respond with valid JSON only.', maxTokens: 8192 }
      ), { maxRetries: 2 });
      const copyText = copyRes.content.find(c => c.type === 'text')?.text || '{}';
      const copyData = JSON.parse(copyText.replace(/```json\n?|```/g, '').trim());

      // Merge copy data into blocks
      const isMultiLang = input.languages && input.languages.length > 1;
      for (const block of blocks) {
        if (copyData[block.type]) {
          if (isMultiLang && copyData[block.type].ko) {
            block.data = copyData[block.type].ko;
            block.multiLangData = copyData[block.type];
          } else {
            block.data = copyData[block.type];
          }
        }
      }
    } catch (e: any) {
      console.error('Copy generation failed:', e.message);
      update(pipelineId, 'generating_copy', 35, '카피 일부 생성 실패, 계속 진행...');
    }

    update(pipelineId, 'generating_copy', 40, '카피 생성 완료');

    // === Step 4: Generate images (60%) ===
    update(pipelineId, 'generating_images', 45, '이미지 생성 중...');

    const comfyAvailable = await comfyui.healthCheck();
    const imgDir = path.join(process.cwd(), 'output', projectId, 'images');
    await fs.mkdir(imgDir, { recursive: true });

    if (comfyAvailable && input.productImages?.length) {
      try {
        // Upload product images to ComfyUI
        for (const imgPath of input.productImages.slice(0, 3)) {
          await withRetry(() => comfyui.uploadImage(imgPath), { maxRetries: 2 });
        }

        // Run RMBG workflow on first image
        const rmbgWf = await comfyui.loadWorkflow('rmbg');
        const uploaded = await comfyui.uploadImage(input.productImages[0]);
        for (const nodeId of Object.keys(rmbgWf)) {
          if (rmbgWf[nodeId].class_type === 'LoadImage') {
            rmbgWf[nodeId].inputs.image = uploaded.name;
          }
        }

        const queued = await comfyui.queuePrompt(rmbgWf);
        const result = await comfyui.waitForCompletion(queued.prompt_id);

        // Download generated images to output/{projectId}/images/
        const savedImages: string[] = [];
        for (let i = 0; i < result.images.length; i++) {
          const img = result.images[i];
          const buf = await comfyui.downloadOutput(img.filename, img.subfolder, img.type);
          const localName = `rmbg_${i}.png`;
          await fs.writeFile(path.join(imgDir, localName), buf);
          savedImages.push(localName);
        }

        // Attach to hero block data
        const heroBlock = blocks.find(b => b.type === 'hero');
        if (heroBlock && savedImages.length > 0) {
          heroBlock.images = savedImages;
          (heroBlock.data as any).heroImageUrl = serveUrl(projectId, `images/${savedImages[0]}`);
        }

        // Attach to feature block images
        const featureBlock = blocks.find(b => b.type === 'feature');
        if (featureBlock && savedImages.length > 1 && (featureBlock.data as any).features) {
          const features = (featureBlock.data as any).features;
          for (let i = 0; i < Math.min(features.length, savedImages.length - 1); i++) {
            features[i].imageUrl = serveUrl(projectId, `images/${savedImages[i + 1] || savedImages[0]}`);
          }
        }

        // Attach to ingredient/tech block imageUrl
        for (const blockType of ['ingredient', 'tech'] as const) {
          const block = blocks.find(b => b.type === blockType);
          if (block && savedImages.length > 0) {
            (block.data as any).imageUrl = serveUrl(projectId, `images/${savedImages[0]}`);
          }
        }

        update(pipelineId, 'generating_images', 55, `배경 제거 완료 — ${savedImages.length}개 이미지`);
      } catch (e: any) {
        console.warn('Image generation failed:', e.message);
        update(pipelineId, 'generating_images', 55, '이미지 생성 일부 실패, 계속 진행...');
      }
    } else if (input.productImages?.length) {
      // ComfyUI unavailable but user uploaded images — use originals directly
      for (let i = 0; i < input.productImages.length; i++) {
        const src = input.productImages[i];
        const ext = path.extname(src) || '.jpg';
        const localName = `upload_${i}${ext}`;
        await fs.copyFile(src, path.join(imgDir, localName)).catch(() => {});

        if (i === 0) {
          const heroBlock = blocks.find(b => b.type === 'hero');
          if (heroBlock) {
            (heroBlock.data as any).heroImageUrl = serveUrl(projectId, `images/${localName}`);
          }
        }
      }
      update(pipelineId, 'generating_images', 55, 'ComfyUI 미연결 — 원본 이미지 사용');
    } else {
      update(pipelineId, 'generating_images', 55, '이미지 없음 — 건너뜀');
    }

    update(pipelineId, 'generating_images', 60, '이미지 처리 완료');

    // === Step 5: Generate videos (80%) ===
    update(pipelineId, 'generating_videos', 65, '영상 생성 준비 중...');

    const videoBlocks = blocks.filter(b => b.type.startsWith('video_'));
    const videoTypeMap: Record<string, string> = {
      video_360: 'rotate_360', video_demo: 'demo',
      video_ba: 'before_after', video_short: 'shortform',
    };
    const vidDir = path.join(process.cwd(), 'output', projectId, 'videos');
    const vidTempDir = path.join(process.cwd(), 'output', projectId, 'temp');
    await fs.mkdir(vidDir, { recursive: true });
    await fs.mkdir(vidTempDir, { recursive: true });

    const klingOk = await kling.isAvailable();
    const firstImage = input.productImages?.[0] || null;

    for (let vi = 0; vi < videoBlocks.length; vi++) {
      const vb = videoBlocks[vi];
      const vType = videoTypeMap[vb.type] || vb.type;
      const progress = 65 + Math.round((vi / videoBlocks.length) * 15);
      update(pipelineId, 'generating_videos', progress, `영상 생성 중: ${vb.type} (${vi + 1}/${videoBlocks.length})`);

      vb.data = { videoType: vType, status: 'pending' } as any;

      if (!comfyAvailable && !klingOk) continue; // graceful skip

      try {
        // Generate video script via Claude
        const scriptPrompt = buildVideoScriptPrompt(input.productName, input.category, vType as any, analysis);
        const scriptRes = await withRetry(() => sendMessage(
          [{ role: 'user', content: scriptPrompt }],
          { system: 'You are a Korean e-commerce video director. Respond with valid JSON only.' }
        ), { maxRetries: 1 });
        const scriptText = scriptRes.content.find(c => c.type === 'text')?.text || '{}';
        const script = JSON.parse(scriptText.replace(/```json\n?|```/g, '').trim());

        let videoPath: string | null = null;

        switch (vType) {
          case 'rotate_360': {
            videoPath = path.join(vidDir, 'rotate_360.mp4');
            if (klingOk && firstImage) {
              const imgBuf = await fs.readFile(firstImage);
              const b64 = imgBuf.toString('base64');
              await kling.generateAndDownload({
                image: `data:image/png;base64,${b64}`,
                prompt: script.klingPrompt || 'smooth 360 degree turntable rotation, white background',
                duration: '5', aspect_ratio: '1:1',
              }, videoPath);
            } else if (comfyAvailable && firstImage) {
              // ComfyUI Zero123++ fallback
              const rWf = await comfyui.loadWorkflow('rotate-360');
              const up = await comfyui.uploadImage(firstImage);
              for (const nid of Object.keys(rWf)) {
                if (rWf[nid].class_type === 'LoadImage') rWf[nid].inputs.image = up.name;
              }
              const q = await comfyui.queuePrompt(rWf);
              const r = await comfyui.waitForCompletion(q.prompt_id);
              if (r.images.length > 0) {
                for (let fi = 0; fi < r.images.length; fi++) {
                  const buf = await comfyui.downloadOutput(r.images[fi].filename, r.images[fi].subfolder, r.images[fi].type);
                  await fs.writeFile(path.join(vidTempDir, `frame_${String(fi).padStart(4, '0')}.png`), buf);
                }
                await ffmpeg.framesToVideo(path.join(vidTempDir, 'frame_%04d.png'), videoPath, 24, { loop: 1, crf: 20 });
              }
            }
            break;
          }

          case 'demo': {
            videoPath = path.join(vidDir, 'feature_demo.mp4');
            const scenes = script.scenes || [];
            const clips: ffmpeg.ConcatInput[] = [];

            for (let si = 0; si < scenes.length; si++) {
              const scene = scenes[si];
              const clipPath = path.join(vidTempDir, `demo_${si}.mp4`);

              if (comfyAvailable) {
                const bgWf = await comfyui.loadWorkflow('feature-demo');
                for (const nid of Object.keys(bgWf)) {
                  if (bgWf[nid].inputs?.text !== undefined) bgWf[nid].inputs.text = scene.backgroundPrompt || 'modern lifestyle scene';
                }
                if (firstImage) {
                  const up = await comfyui.uploadImage(firstImage);
                  for (const nid of Object.keys(bgWf)) {
                    if (bgWf[nid].class_type === 'LoadImage') bgWf[nid].inputs.image = up.name;
                  }
                }
                const q = await comfyui.queuePrompt(bgWf);
                const r = await comfyui.waitForCompletion(q.prompt_id);
                if (r.images[0]) {
                  const buf = await comfyui.downloadOutput(r.images[0].filename, r.images[0].subfolder, r.images[0].type);
                  const framePath = path.join(vidTempDir, `demo_frame_${si}.png`);
                  await fs.writeFile(framePath, buf);
                  await ffmpeg.framesToVideo(framePath, clipPath, 1, { crf: 20 });
                }
              }

              try {
                await fs.access(clipPath);
                if (scene.overlayText) {
                  const textPath = path.join(vidTempDir, `demo_text_${si}.mp4`);
                  await ffmpeg.addTextOverlay(clipPath, textPath, [{
                    text: scene.overlayText, x: '(w-text_w)/2', y: 'h-80',
                    fontsize: 36, fontcolor: 'white', startTime: 0.5, endTime: scene.duration || 4, fadeIn: 0.5,
                  }]);
                  clips.push({ file: textPath, duration: scene.duration || 4 });
                } else {
                  clips.push({ file: clipPath, duration: scene.duration || 4 });
                }
              } catch { /* clip not generated */ }
            }

            if (clips.length > 0) {
              await ffmpeg.concatWithTransitions(clips, videoPath, 'fade', 0.5);
            }
            break;
          }

          case 'before_after': {
            videoPath = path.join(vidDir, 'before_after.mp4');
            if (comfyAvailable) {
              const baWf = await comfyui.loadWorkflow('before-after');
              for (const nid of Object.keys(baWf)) {
                if (baWf[nid].inputs?.text !== undefined && nid <= '5') baWf[nid].inputs.text = script.beforePrompt || 'problem state';
                if (baWf[nid].inputs?.text !== undefined && nid > '10') baWf[nid].inputs.text = script.afterPrompt || 'improved state';
              }
              const q = await comfyui.queuePrompt(baWf);
              const r = await comfyui.waitForCompletion(q.prompt_id);
              if (r.images.length >= 2) {
                const bBuf = await comfyui.downloadOutput(r.images[0].filename, r.images[0].subfolder, r.images[0].type);
                const aBuf = await comfyui.downloadOutput(r.images[1].filename, r.images[1].subfolder, r.images[1].type);
                const bPath = path.join(vidTempDir, 'before.png');
                const aPath = path.join(vidTempDir, 'after.png');
                await fs.writeFile(bPath, bBuf);
                await fs.writeFile(aPath, aBuf);

                const holdB = path.join(vidTempDir, 'hold_b.mp4');
                const holdA = path.join(vidTempDir, 'hold_a.mp4');
                await ffmpeg.framesToVideo(bPath, holdB, 1, { crf: 20 });
                await ffmpeg.framesToVideo(aPath, holdA, 1, { crf: 20 });

                await ffmpeg.concatWithTransitions(
                  [{ file: holdB, duration: 3 }, { file: holdA, duration: 3 }],
                  videoPath, 'fade', 1.0
                );
              }
            }
            break;
          }

          case 'shortform': {
            videoPath = path.join(vidDir, 'shortform.mp4');
            const scenes = script.scenes || [];
            const clips: ffmpeg.ConcatInput[] = [];

            for (let si = 0; si < scenes.length; si++) {
              const scene = scenes[si];
              const dur = scene.duration || 3;
              const clipPath = path.join(vidTempDir, `short_${si}.mp4`);

              if (scene.kpiValue) {
                await ffmpeg.createKpiCountUp(
                  Number(scene.kpiValue), scene.kpiLabel || '', clipPath, dur,
                  { width: 1080, height: 1920, bgColor: '0x0a0a0a', textColor: 'white' }
                );
              } else {
                // Solid dark background with text
                const { execFile } = await import('child_process');
                const { promisify } = await import('util');
                const exec = promisify(execFile);
                await exec(process.env.FFMPEG_PATH || 'ffmpeg', [
                  '-y', '-f', 'lavfi',
                  '-i', `color=c=0x0a0a0a:s=1080x1920:d=${dur}:r=30`,
                  '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', clipPath,
                ]);

                if (scene.text) {
                  const textClip = path.join(vidTempDir, `short_text_${si}.mp4`);
                  await ffmpeg.addTextOverlay(clipPath, textClip, [{
                    text: scene.text, x: '(w-text_w)/2', y: '(h-text_h)/2',
                    fontsize: 64, fontcolor: 'white', startTime: 0.3, endTime: dur - 0.2, fadeIn: 0.4,
                  }]);
                  clips.push({ file: textClip, duration: dur });
                  continue;
                }
              }
              clips.push({ file: clipPath, duration: dur });
            }

            if (clips.length > 0) {
              await ffmpeg.concatWithTransitions(clips, videoPath, 'fade', 0.5);
            }
            break;
          }
        }

        // Set video URL in block data if file was created
        if (videoPath) {
          try {
            await fs.access(videoPath);
            const relPath = `videos/${path.basename(videoPath)}`;
            vb.data = { videoType: vType, status: 'complete', videoUrl: serveUrl(projectId, relPath) } as any;
            vb.videos = [path.basename(videoPath)];
          } catch {
            // File not created — keep pending
          }
        }
      } catch (e: any) {
        console.warn(`Video ${vType} generation failed:`, e.message);
        vb.data = { videoType: vType, status: 'error', error: e.message } as any;
      }
    }

    // Cleanup temp
    await fs.rm(vidTempDir, { recursive: true, force: true }).catch(() => {});

    update(pipelineId, 'generating_videos', 80, `영상 ${videoBlocks.filter(b => (b.data as any).status === 'complete').length}/${videoBlocks.length} 생성 완료`);

    // === Step 6: Assemble (90%) ===
    update(pipelineId, 'assembling', 85, '블록 조립 중...');

    // Add CTA pricing from input if available
    const ctaBlock = blocks.find(b => b.type === 'cta');
    if (ctaBlock && input.priceOptions?.length) {
      ctaBlock.data = {
        ...ctaBlock.data,
        packages: input.priceOptions.map((p, i) => ({
          ...p,
          featured: i === input.priceOptions!.length - 1,
        })),
        buttonText: '구매하기',
      };
    }

    // Save blocks to DB
    db.saveBlocks(projectId, blocks);
    db.updateProjectStatus(projectId, 'complete');

    update(pipelineId, 'assembling', 90, '블록 저장 완료');

    // === Step 7: Render (95%) ===
    update(pipelineId, 'rendering', 95, 'HTML 렌더링 중...');

    // HTML rendering will be triggered by the client on export

    // === Complete ===
    update(pipelineId, 'complete', 100, '완료!');

  } catch (error: any) {
    console.error('Pipeline error:', error);
    update(pipelineId, 'error', 0, `오류: ${error.message}`);
    db.updateProjectStatus(projectId, 'error');
  }
}

function getBlockSource(type: BlockType): 'claude' | 'comfyui' | 'ffmpeg' | 'puppeteer' | 'user' {
  if (['video_360', 'video_demo', 'video_ba', 'styling', 'unboxing', 'process'].includes(type)) return 'comfyui';
  if (['video_short'].includes(type)) return 'ffmpeg';
  return 'claude';
}

export function cancelPipeline(id: string): void {
  update(id, 'error', 0, '사용자에 의해 취소됨');
}

