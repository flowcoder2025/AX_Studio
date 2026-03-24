// Pipeline Engine — 카피 전용 파이프라인
// 이미지/영상 생성은 생성소(Studio)에서 독립적으로 처리

import { v4 as uuid } from 'uuid';
import * as db from '@/lib/db/client';
import { CategoryId, getCategoryById } from '@/lib/templates/categories';
import { BlockDefinition, BlockType } from '@/types/block';
import { sendMessage } from '@/lib/claude/client';
import { buildAnalysisPrompt, buildCopyPrompt, buildBlockRecommendationPrompt } from '@/lib/claude/prompts';
import { withRetry } from '@/lib/utils/retry';

export type PipelineStatus =
  | 'idle' | 'analyzing' | 'generating_copy'
  | 'assembling' | 'complete' | 'error';

export type InputMode = 'simple' | 'detailed' | 'remake';

export interface PipelineInput {
  mode: InputMode;
  category: CategoryId;
  productName: string;
  keyFeatures?: string;
  price?: string;
  targetAudience?: string;
  specSheet?: Record<string, string>;
  reviews?: { rating: number; text: string }[];
  certifications?: string[];
  priceOptions?: { name: string; price: string; description: string }[];
  productImages?: string[];
  sourceUrl?: string;
  languages?: string[];
}

// In-memory status for SSE
const liveStatus = new Map<string, { status: PipelineStatus; progress: number; step: string }>();
const abortControllers = new Map<string, AbortController>();

export function createPipeline(projectId: string): string {
  const id = uuid();
  db.createPipelineRun(id, projectId);
  liveStatus.set(id, { status: 'idle', progress: 0, step: '시작 대기 중' });
  return id;
}

export function getPipelineStatus(id: string) {
  const live = liveStatus.get(id);
  if (live) return live;
  // DB fallback (서버 재시작 후 복구)
  const dbRun = db.getPipelineRun(id);
  if (dbRun) return { status: dbRun.status as PipelineStatus, progress: dbRun.progress, step: dbRun.current_step || '' };
  return null;
}

function update(id: string, status: PipelineStatus, progress: number, step: string) {
  liveStatus.set(id, { status, progress, step });
  db.updatePipelineRun(id, status, progress, step);
}

function checkCancelled(pipelineId: string) {
  const ac = abortControllers.get(pipelineId);
  if (ac?.signal.aborted) throw new Error('사용자에 의해 취소됨');
}

export async function runPipeline(pipelineId: string, projectId: string, input: PipelineInput): Promise<void> {
  const category = getCategoryById(input.category);
  if (!category) {
    update(pipelineId, 'error', 0, `알 수 없는 카테고리: ${input.category}`);
    return;
  }

  const ac = new AbortController();
  abortControllers.set(pipelineId, ac);

  try {
    // === Step 1: 제품 분석 (20%) ===
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

    update(pipelineId, 'analyzing', 20, '블록 구성 결정 중...');

    // === Step 2: 블록 순서 결정 (30%) ===
    checkCancelled(pipelineId);
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
      // 기본 순서 사용
    }

    // 블록 구조 생성
    const blocks: BlockDefinition[] = blockOrder.map((type: BlockType, index: number) => ({
      id: uuid(),
      type,
      order: index,
      source: getBlockSource(type),
      data: {} as any,
      images: [],
      videos: [],
      visible: true,
    }));

    update(pipelineId, 'generating_copy', 30, '카피 생성 중...');

    // === Step 3: 카피 생성 (80%) ===
    checkCancelled(pipelineId);
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

      // 카피 데이터를 블록에 병합
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
      update(pipelineId, 'generating_copy', 60, '카피 일부 생성 실패, 계속 진행...');
    }

    update(pipelineId, 'generating_copy', 80, '카피 생성 완료');

    // === Step 4: 블록 조립 + 저장 (90%) ===
    checkCancelled(pipelineId);
    update(pipelineId, 'assembling', 85, '블록 조립 중...');

    // CTA 가격 정보 삽입
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

    // DB 저장
    db.saveBlocks(projectId, blocks);
    db.updateProjectStatus(projectId, 'complete');

    update(pipelineId, 'assembling', 90, '블록 저장 완료');

    // === 완료 ===
    abortControllers.delete(pipelineId);
    update(pipelineId, 'complete', 100, '완료! 생성소에서 이미지/영상을 추가하세요.');

  } catch (error: any) {
    abortControllers.delete(pipelineId);
    if (error.message === '사용자에 의해 취소됨') {
      db.updateProjectStatus(projectId, 'error');
      return;
    }
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
  const ac = abortControllers.get(id);
  if (ac) ac.abort();
  abortControllers.delete(id);
  update(id, 'error', 0, '사용자에 의해 취소됨');
}
