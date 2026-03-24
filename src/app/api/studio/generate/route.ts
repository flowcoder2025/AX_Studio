import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import * as db from '@/lib/db/client';
import { comfyui } from '@/lib/comfyui/client';
import {
  translateToEnglish,
  runT2I,
  runBgGeneration,
  runRMBG,
  runRotate360,
  runSceneGeneration,
  runIPAdapter,
  runImg2Img,
  runWan22I2V,
  runWan22T2V,
  downloadResult,
} from '@/lib/comfyui/generate';

export async function POST(req: NextRequest) {
  try {
    const { projectId, promptKo, workflow, inputImage, params } = await req.json();

    if (!projectId || !workflow) {
      return NextResponse.json({ error: 'projectId, workflow 필수' }, { status: 400 });
    }

    // Kling 워크플로우 — 준비 중
    if (workflow.startsWith('kling-')) {
      return NextResponse.json({ error: 'Kling 워크플로우는 준비 중입니다. 추후 활성화됩니다.' }, { status: 501 });
    }

    // ComfyUI 연결 확인
    const comfyOk = await comfyui.healthCheck();
    if (!comfyOk) {
      return NextResponse.json({ error: 'ComfyUI 미연결' }, { status: 503 });
    }

    // inputImage가 갤러리 항목 ID면 실제 파일 경로로 변환
    let resolvedInputImage = inputImage;
    if (inputImage && !inputImage.includes('/') && !inputImage.includes('\\')) {
      const galleryItem = db.getGalleryItem(inputImage);
      if (galleryItem) resolvedInputImage = galleryItem.file_path;
    }

    // 갤러리 디렉토리
    const galleryDir = path.join(process.cwd(), 'output', projectId, 'gallery');
    await fs.mkdir(galleryDir, { recursive: true });

    const itemId = uuid();
    let promptEn = '';
    let resultType: 'image' | 'video' = 'image';
    let savedFiles: string[] = [];
    let fileWidth: number | undefined;
    let fileHeight: number | undefined;

    switch (workflow) {
      // === 이미지: 텍스트→이미지 (Flux) ===
      case 'flux-t2i': {
        if (!promptKo) return NextResponse.json({ error: '프롬프트 필수' }, { status: 400 });
        promptEn = await translateToEnglish(promptKo);
        const result = await runT2I(promptEn, 'blurry, low quality, text, watermark, cartoon');
        savedFiles = await downloadResult(result, galleryDir, itemId);
        fileWidth = 1024; fileHeight = 1024;
        break;
      }

      // === 이미지: 배경 제거 ===
      case 'rmbg': {
        if (!resolvedInputImage) return NextResponse.json({ error: '이미지 입력 필수' }, { status: 400 });
        const result = await runRMBG(resolvedInputImage);
        savedFiles = await downloadResult(result, galleryDir, itemId);
        if (savedFiles.length > 0) {
          const meta = await sharp(path.join(galleryDir, savedFiles[0])).metadata();
          fileWidth = meta.width; fileHeight = meta.height;
        }
        promptEn = 'background removal';
        break;
      }

      // === 이미지: 이미지 변환 (img2img) ===
      case 'img2img': {
        if (!resolvedInputImage) return NextResponse.json({ error: '이미지 입력 필수' }, { status: 400 });
        if (!promptKo) return NextResponse.json({ error: '프롬프트 필수' }, { status: 400 });
        promptEn = await translateToEnglish(promptKo);
        const result = await runImg2Img(resolvedInputImage, promptEn, 'blurry, low quality, text, watermark');
        savedFiles = await downloadResult(result, galleryDir, itemId);
        if (savedFiles.length > 0) {
          const meta = await sharp(path.join(galleryDir, savedFiles[0])).metadata();
          fileWidth = meta.width; fileHeight = meta.height;
        }
        break;
      }

      // === 이미지: 장면 생성 (멀티 스텝 — 컷아웃 + 장면 + 합성 + 인페인팅) ===
      case 'ipadapter': {
        if (!resolvedInputImage) return NextResponse.json({ error: '이미지 입력 필수' }, { status: 400 });
        if (!promptKo) return NextResponse.json({ error: '프롬프트 필수' }, { status: 400 });
        promptEn = await translateToEnglish(promptKo);
        const result = await runSceneGeneration(
          resolvedInputImage,
          promptEn,
          'blurry, low quality, text, watermark, cartoon, anime'
        );
        savedFiles = await downloadResult(result, galleryDir, itemId);
        fileWidth = 1024; fileHeight = 1024;
        break;
      }

      // === 동영상: Wan 2.2 이미지→영상 (모션 큼) ===
      case 'wan22-i2v-high': {
        if (!resolvedInputImage) return NextResponse.json({ error: '이미지 입력 필수' }, { status: 400 });
        resultType = 'video';
        promptEn = promptKo ? await translateToEnglish(promptKo) : 'gentle product showcase motion';
        const result = await runWan22I2V(resolvedInputImage, promptEn, 'high');
        savedFiles = await downloadResult(result, galleryDir, itemId);
        break;
      }

      // === 동영상: Wan 2.2 이미지→영상 (모션 작음) ===
      case 'wan22-i2v-low': {
        if (!resolvedInputImage) return NextResponse.json({ error: '이미지 입력 필수' }, { status: 400 });
        resultType = 'video';
        promptEn = promptKo ? await translateToEnglish(promptKo) : 'subtle gentle motion';
        const result = await runWan22I2V(resolvedInputImage, promptEn, 'low');
        savedFiles = await downloadResult(result, galleryDir, itemId);
        break;
      }

      // === 동영상: Wan 2.2 텍스트→영상 ===
      case 'wan22-t2v': {
        if (!promptKo) return NextResponse.json({ error: '프롬프트 필수' }, { status: 400 });
        resultType = 'video';
        promptEn = await translateToEnglish(promptKo);
        const result = await runWan22T2V(promptEn);
        savedFiles = await downloadResult(result, galleryDir, itemId);
        break;
      }

      // === 동영상: 360° 회전 (SV3D) ===
      case 'sv3d-360': {
        if (!resolvedInputImage) return NextResponse.json({ error: '이미지 입력 필수' }, { status: 400 });
        resultType = 'video';
        const tempDir = path.join(galleryDir, `temp_${itemId}`);
        await fs.mkdir(tempDir, { recursive: true });
        const videoPath = await runRotate360(resolvedInputImage, tempDir);
        if (videoPath) {
          const finalPath = path.join(galleryDir, `${itemId}.mp4`);
          await fs.rename(videoPath, finalPath);
          savedFiles = [`${itemId}.mp4`];
        }
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        promptEn = '360 degree rotation';
        break;
      }

      default:
        return NextResponse.json({ error: `지원하지 않는 워크플로우: ${workflow}` }, { status: 400 });
    }

    if (savedFiles.length === 0) {
      return NextResponse.json({ error: '생성 결과 없음' }, { status: 500 });
    }

    // 갤러리에 등록
    const mainFile = savedFiles[0];
    const filePath = path.join(galleryDir, mainFile);
    const stat = await fs.stat(filePath);

    db.createGalleryItem(
      itemId, projectId, resultType, workflow,
      promptKo || null, promptEn || null,
      filePath, stat.size, fileWidth, fileHeight
    );

    const serveUrl = `/api/output/serve?path=output/${projectId}/gallery/${mainFile}`;

    return NextResponse.json({
      galleryItem: {
        id: itemId,
        type: resultType,
        workflow,
        promptKo: promptKo || null,
        promptEn,
        fileUrl: serveUrl,
        width: fileWidth,
        height: fileHeight,
      },
    });
  } catch (error: any) {
    console.error('Studio generate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
