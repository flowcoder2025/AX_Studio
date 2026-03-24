// ComfyUI 생성 함수 — 생성소(Studio) API와 파이프라인 공용

import { comfyui } from './client';
import { sendMessage } from '@/lib/claude/client';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export interface GenerationResult {
  images: { filename: string; subfolder: string; type: string }[];
  videos?: { filename: string; subfolder: string; type: string }[];
}

// === 프롬프트 번역 ===

export async function translateToEnglish(koreanText: string): Promise<string> {
  try {
    const res = await sendMessage(
      [{ role: 'user', content: `Translate the following Korean text to English. This will be used as a Stable Diffusion image generation prompt.

Rules:
- Output ONLY the English translation, nothing else
- Keep it descriptive and visual
- Do not add quotes or explanations
- If the input is already English, return it as-is

Korean: ${koreanText}` }],
      { system: 'You are a translator. Return only the English translation.' }
    );
    const translated = res.content.find(c => c.type === 'text')?.text?.trim();
    return translated || koreanText;
  } catch {
    return koreanText;
  }
}

// === T2I 생성 (Flux 우선, SDXL fallback) ===

export async function runT2I(
  prompt: string,
  negative: string,
  opts?: { width?: number; height?: number }
): Promise<GenerationResult> {
  const w = opts?.width || 1024;
  const h = opts?.height || 1024;
  const seed = Math.floor(Math.random() * 999999);

  // Flux 시도
  try {
    const wf = await comfyui.loadWorkflow('t2i-flux');
    if (wf['4']?.inputs) wf['4'].inputs.text = prompt;
    if (wf['6']?.inputs) wf['6'].inputs.seed = seed;
    if (wf['5']?.inputs) { wf['5'].inputs.width = w; wf['5'].inputs.height = h; }
    const q = await comfyui.queuePrompt(wf);
    return await comfyui.waitForCompletion(q.prompt_id);
  } catch (e: any) {
    console.warn('Flux T2I failed, falling back to SDXL:', e.message);
  }

  // SDXL fallback
  const wf = await comfyui.loadWorkflow('t2i-sdxl');
  if (wf['2']?.inputs) wf['2'].inputs.text = prompt;
  if (wf['3']?.inputs) wf['3'].inputs.text = negative;
  if (wf['5']?.inputs) wf['5'].inputs.seed = seed;
  if (wf['4']?.inputs) { wf['4'].inputs.width = w; wf['4'].inputs.height = h; }
  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === 배경 생성 (Flux 우선, SDXL fallback) ===

export async function runBgGeneration(
  prompt: string,
  opts?: { width?: number; height?: number }
): Promise<GenerationResult> {
  const w = opts?.width || 1024;
  const h = opts?.height || 1024;
  const seed = Math.floor(Math.random() * 999999);

  // Flux 배경 시도
  try {
    const wf = await comfyui.loadWorkflow('bg-flux');
    if (wf['4']?.inputs) wf['4'].inputs.text = prompt;
    if (wf['6']?.inputs) wf['6'].inputs.seed = seed;
    if (wf['5']?.inputs) { wf['5'].inputs.width = w; wf['5'].inputs.height = h; }
    const q = await comfyui.queuePrompt(wf);
    return await comfyui.waitForCompletion(q.prompt_id);
  } catch (e: any) {
    console.warn('Flux BG failed, falling back to SDXL:', e.message);
  }

  // SDXL background fallback
  const wf = await comfyui.loadWorkflow('background');
  if (wf['2']?.inputs) wf['2'].inputs.text = prompt;
  if (wf['3']?.inputs) wf['3'].inputs.text = 'blurry, text, watermark, low quality, product, object, device, person';
  if (wf['5']?.inputs) wf['5'].inputs.seed = seed;
  if (wf['4']?.inputs) { wf['4'].inputs.width = w; wf['4'].inputs.height = h; }
  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === RMBG 배경 제거 ===

export async function runRMBG(imagePath: string): Promise<GenerationResult> {
  const wf = await comfyui.loadWorkflow('rmbg');
  const uploaded = await comfyui.uploadImage(imagePath);
  for (const nodeId of Object.keys(wf)) {
    if (wf[nodeId].class_type === 'LoadImage') {
      wf[nodeId].inputs.image = uploaded.name;
    }
  }
  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === 360° 회전 (SV3D + RIFE) ===

export async function runRotate360(imagePath: string, outputDir: string): Promise<string | null> {
  // 전처리: 흰 배경 + 576x576
  const preparedPath = path.join(outputDir, 'rotate_prepared.png');
  await sharp(imagePath)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(576, 576, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .png().toFile(preparedPath);

  const wf = await comfyui.loadWorkflow('rotate-360');
  const uploaded = await comfyui.uploadImage(preparedPath);
  for (const nodeId of Object.keys(wf)) {
    if (wf[nodeId].class_type === 'LoadImage') {
      wf[nodeId].inputs.image = uploaded.name;
    }
  }
  if (wf['6']?.inputs) wf['6'].inputs.seed = Math.floor(Math.random() * 999999);

  const q = await comfyui.queuePrompt(wf);
  const result = await comfyui.waitForCompletion(q.prompt_id);

  if (result.images.length === 0) return null;

  // 프레임 다운로드
  const framesDir = path.join(outputDir, 'frames');
  await fs.mkdir(framesDir, { recursive: true });
  for (let i = 0; i < result.images.length; i++) {
    const buf = await comfyui.downloadOutput(
      result.images[i].filename, result.images[i].subfolder, result.images[i].type
    );
    await fs.writeFile(path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`), buf);
  }

  // FFmpeg로 MP4 인코딩
  const { framesToVideo } = await import('@/lib/ffmpeg/runner');
  const videoPath = path.join(outputDir, 'rotate_360.mp4');
  await framesToVideo(path.join(framesDir, 'frame_%04d.png'), videoPath, 24, { loop: 1, crf: 20 });

  // 프레임 정리
  await fs.rm(framesDir, { recursive: true, force: true }).catch(() => {});
  // 전처리 이미지 정리
  await fs.unlink(preparedPath).catch(() => {});

  return videoPath;
}

// === Before/After 이미지 쌍 ===

export async function runBeforeAfter(
  beforePrompt: string,
  afterPrompt: string,
  negative: string
): Promise<GenerationResult> {
  const wf = await comfyui.loadWorkflow('before-after');
  if (wf['2']?.inputs) wf['2'].inputs.text = beforePrompt;
  if (wf['13']?.inputs) wf['13'].inputs.text = afterPrompt;
  if (wf['3']?.inputs) wf['3'].inputs.text = negative;
  const seed = Math.floor(Math.random() * 999999);
  if (wf['5']?.inputs) wf['5'].inputs.seed = seed;
  if (wf['14']?.inputs) wf['14'].inputs.seed = seed;
  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === 장면 생성 (FLUX.2 Klein 4B Edit) ===

export async function runSceneGeneration(
  productImagePath: string,
  scenePrompt: string,
  negative: string
): Promise<GenerationResult> {
  const meta = await sharp(productImagePath).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;

  const uploaded = await comfyui.uploadImage(productImagePath);

  const wf: Record<string, any> = {
    '1': { class_type: 'UNETLoader', inputs: {
      unet_name: 'flux-2-klein-4b-fp8.safetensors', weight_dtype: 'default',
    }},
    '2': { class_type: 'DualCLIPLoader', inputs: {
      clip_name1: 'clip_l.safetensors', clip_name2: 't5xxl_fp8_e4m3fn.safetensors', type: 'flux',
    }},
    '3': { class_type: 'VAELoader', inputs: { vae_name: 'flux2-vae.safetensors' } },
    '4': { class_type: 'LoadImage', inputs: { image: uploaded.name } },
    '5': { class_type: 'CLIPTextEncode', inputs: { text: scenePrompt, clip: ['2', 0] } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['2', 0] } },
    '7': { class_type: 'SolidMask', inputs: { value: 1.0, width: w, height: h } },
    '8': { class_type: 'InpaintModelConditioning', inputs: {
      positive: ['5', 0], negative: ['6', 0], vae: ['3', 0],
      pixels: ['4', 0], mask: ['7', 0], noise_mask: true,
    }},
    '9': { class_type: 'KSampler', inputs: {
      model: ['1', 0], positive: ['8', 0], negative: ['8', 1],
      latent_image: ['8', 2], seed: Math.floor(Math.random() * 999999),
      steps: 28, cfg: 3.5, sampler_name: 'euler', scheduler: 'simple', denoise: 1.0,
    }},
    '10': { class_type: 'VAEDecode', inputs: { samples: ['9', 0], vae: ['3', 0] } },
    '11': { class_type: 'SaveImage', inputs: { images: ['10', 0], filename_prefix: 'klein_scene' } },
  };

  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === IP-Adapter (레거시 — 단순 참조) ===

export async function runIPAdapter(
  imagePath: string,
  prompt: string,
  negative: string
): Promise<GenerationResult> {
  const uploaded = await comfyui.uploadImage(imagePath);

  // IPAdapterStyleComposition 사용 — 스타일(질감)과 구도(주제)를 분리 제어
  // weight_style: 낮게 → 참조 이미지의 크롬/금속 질감이 장면에 번지지 않음
  // weight_composition: 높게 → 참조 이미지의 주제(면도기 형태)는 반영
  const wf: Record<string, any> = {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    // IP-Adapter 모델 로드 (PLUS)
    '2': { class_type: 'IPAdapterUnifiedLoader', inputs: { model: ['1', 0], preset: 'PLUS (high strength)' } },
    // 참조 이미지 로드
    '3': { class_type: 'LoadImage', inputs: { image: uploaded.name } },
    // Style & Composition 분리 적용
    '4': { class_type: 'IPAdapterStyleComposition', inputs: {
      model: ['2', 0], ipadapter: ['2', 1],
      image_style: ['3', 0],           // 스타일 참조 (약하게)
      image_composition: ['3', 0],      // 구도/주제 참조 (강하게)
      weight_style: 0.15,              // 질감 전이 최소화
      weight_composition: 0.7,          // 주제 형태 반영
      expand_style: false,
      combine_embeds: 'concat',
      start_at: 0.0,
      end_at: 0.8,
      embeds_scaling: 'K+mean(V) w/ C penalty',
    }},
    // 텍스트 프롬프트 (새 장면)
    '5': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['1', 1] } },
    // 빈 잠재 이미지 (새로 생성)
    '7': { class_type: 'EmptyLatentImage', inputs: { width: 1024, height: 1024, batch_size: 1 } },
    '8': { class_type: 'KSampler', inputs: {
      model: ['4', 0], positive: ['5', 0], negative: ['6', 0],
      latent_image: ['7', 0], seed: Math.floor(Math.random() * 999999),
      steps: 30, cfg: 7.0, sampler_name: 'euler_ancestral', scheduler: 'normal', denoise: 1.0,
    }},
    '9': { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['1', 2] } },
    '10': { class_type: 'SaveImage', inputs: { images: ['9', 0], filename_prefix: 'ipadapter' } },
  };

  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === img2img (SDXL — 배경/스타일 변경) ===

export async function runImg2Img(
  imagePath: string,
  prompt: string,
  negative: string,
  denoise: number = 0.6
): Promise<GenerationResult> {
  const wf: Record<string, any> = {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    '2': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
    '3': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['1', 1] } },
    '4': { class_type: 'LoadImage', inputs: { image: 'input.png' } },
    '5': { class_type: 'VAEEncode', inputs: { pixels: ['4', 0], vae: ['1', 2] } },
    '6': { class_type: 'KSampler', inputs: {
      model: ['1', 0], positive: ['2', 0], negative: ['3', 0],
      latent_image: ['5', 0], seed: Math.floor(Math.random() * 999999),
      steps: 30, cfg: 7.0, sampler_name: 'euler_ancestral', scheduler: 'normal', denoise,
    }},
    '7': { class_type: 'VAEDecode', inputs: { samples: ['6', 0], vae: ['1', 2] } },
    '8': { class_type: 'SaveImage', inputs: { images: ['7', 0], filename_prefix: 'img2img' } },
  };

  const uploaded = await comfyui.uploadImage(imagePath);
  wf['4'].inputs.image = uploaded.name;

  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === Wan 2.2 Image-to-Video ===

export async function runWan22I2V(
  imagePath: string,
  prompt: string,
  mode: 'high' | 'low' = 'high',
  opts?: { width?: number; height?: number; numFrames?: number }
): Promise<GenerationResult> {
  const w = opts?.width || 640;
  const h = opts?.height || 640;
  const numFrames = opts?.numFrames || 81;

  const uploaded = await comfyui.uploadImage(imagePath);

  // 네이티브 ComfyUI 노드 구조 (LightX2V LoRA + 2패스)
  const wf: Record<string, any> = {
    // High noise 모델 + LoRA
    '1': { class_type: 'UNETLoader', inputs: { unet_name: 'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors', weight_dtype: 'default' } },
    '2': { class_type: 'LoraLoaderModelOnly', inputs: { model: ['1', 0], lora_name: 'wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors', strength_model: 1 } },
    '3': { class_type: 'ModelSamplingSD3', inputs: { model: ['2', 0], shift: 5 } },
    // Low noise 모델 + LoRA
    '4': { class_type: 'UNETLoader', inputs: { unet_name: 'wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors', weight_dtype: 'default' } },
    '5': { class_type: 'LoraLoaderModelOnly', inputs: { model: ['4', 0], lora_name: 'wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors', strength_model: 1 } },
    '6': { class_type: 'ModelSamplingSD3', inputs: { model: ['5', 0], shift: 5 } },
    // 텍스트 인코딩
    '7': { class_type: 'CLIPLoader', inputs: { clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', type: 'wan', device: 'default' } },
    '8': { class_type: 'VAELoader', inputs: { vae_name: 'wan_2.1_vae.safetensors' } },
    '9': { class_type: 'CLIPVisionLoader', inputs: { clip_name: 'CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors' } },
    '10': { class_type: 'LoadImage', inputs: { image: uploaded.name } },
    '11': { class_type: 'CLIPVisionEncode', inputs: { clip_vision: ['9', 0], image: ['10', 0], crop: 'none' } },
    '12': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['7', 0] } },
    '13': { class_type: 'CLIPTextEncode', inputs: { text: 'blurry, low quality, static, deformed, ugly, text, watermark', clip: ['7', 0] } },
    // WanImageToVideo
    '14': { class_type: 'WanImageToVideo', inputs: {
      positive: ['12', 0], negative: ['13', 0], vae: ['8', 0],
      width: w, height: h, length: numFrames, batch_size: 1,
      clip_vision_output: ['11', 0], start_image: ['10', 0],
    }},
    // 2패스 KSampler (high noise → low noise)
    '15': { class_type: 'KSamplerAdvanced', inputs: {
      model: ['3', 0], add_noise: 'enable', noise_seed: Math.floor(Math.random() * 999999),
      steps: 4, cfg: 1, sampler_name: 'euler', scheduler: 'simple',
      positive: ['14', 0], negative: ['14', 1], latent_image: ['14', 2],
      start_at_step: 0, end_at_step: 2, return_with_leftover_noise: 'enable',
    }},
    '16': { class_type: 'KSamplerAdvanced', inputs: {
      model: ['6', 0], add_noise: 'disable', noise_seed: 0,
      steps: 4, cfg: 1, sampler_name: 'euler', scheduler: 'simple',
      positive: ['14', 0], negative: ['14', 1], latent_image: ['15', 0],
      start_at_step: 2, end_at_step: 10000, return_with_leftover_noise: 'disable',
    }},
    // 디코드 + 영상 저장
    '17': { class_type: 'VAEDecode', inputs: { samples: ['16', 0], vae: ['8', 0] } },
    '18': { class_type: 'CreateVideo', inputs: { images: ['17', 0], fps: 16 } },
    '19': { class_type: 'SaveVideo', inputs: { video: ['18', 0], filename_prefix: 'wan22_i2v', format: 'mp4', codec: 'h264' } },
  };

  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === Wan 2.2 Text-to-Video ===

export async function runWan22T2V(
  prompt: string,
  opts?: { width?: number; height?: number; numFrames?: number }
): Promise<GenerationResult> {
  const w = opts?.width || 832;
  const h = opts?.height || 480;
  const numFrames = opts?.numFrames || 81;

  const wf: Record<string, any> = {
    '1': { class_type: 'WanVideoModelLoader', inputs: {
      model: 'wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors',
      base_precision: 'bf16', quantization: 'disabled', load_device: 'offload_device',
    }},
    '2': { class_type: 'WanVideoVAELoader', inputs: { model_name: 'wan_2.1_vae.safetensors', precision: 'bf16' } },
    '3': { class_type: 'WanVideoTextEncodeCached', inputs: { model_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', precision: 'bf16', positive_prompt: prompt, negative_prompt: '', quantization: 'disabled', use_disk_cache: true, device: 'gpu' } },
    '4': { class_type: 'WanVideoImageToVideoEncode', inputs: {
      width: w, height: h, num_frames: numFrames,
      noise_aug_strength: 0.0, start_latent_strength: 0.0, end_latent_strength: 0.0, force_offload: true,
      vae: ['2', 0],
    }},
    '5': { class_type: 'WanVideoSampler', inputs: {
      model: ['1', 0], image_embeds: ['4', 0], steps: 30, cfg: 3.0, shift: 5.0,
      seed: Math.floor(Math.random() * 999999), force_offload: true,
      scheduler: 'unipc', riflex_freq_index: 0, text_embeds: ['3', 0],
    }},
    '6': { class_type: 'WanVideoDecode', inputs: {
      vae: ['2', 0], samples: ['5', 0],
      enable_vae_tiling: true, tile_x: 128, tile_y: 128, tile_stride_x: 96, tile_stride_y: 96,
    }},
    '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'wan22_t2v' } },
  };

  const q = await comfyui.queuePrompt(wf);
  return comfyui.waitForCompletion(q.prompt_id);
}

// === 결과 다운로드 유틸 ===

export async function downloadResult(
  result: GenerationResult,
  outputDir: string,
  prefix: string
): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true });
  const saved: string[] = [];
  for (let i = 0; i < result.images.length; i++) {
    const img = result.images[i];
    const buf = await comfyui.downloadOutput(img.filename, img.subfolder, img.type);
    const localName = `${prefix}_${i}.png`;
    await fs.writeFile(path.join(outputDir, localName), buf);
    saved.push(localName);
  }
  return saved;
}
