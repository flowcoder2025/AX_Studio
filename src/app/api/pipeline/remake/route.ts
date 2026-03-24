import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/puppeteer/renderer';
import { sendMessage } from '@/lib/claude/client';
import { buildRemakeAnalysisPrompt } from '@/lib/claude/prompts';
import { createPipeline, runPipeline } from '@/lib/pipeline/engine';
import { downloadScrapedImages } from '@/lib/utils/image-downloader';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { sourceUrl, category, style, addVideo, targetPlatform } = await req.json();

    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
    }

    // 1. Puppeteer 스크래핑
    const scraped = await scrapeUrl(sourceUrl);

    // 2. Claude로 기존 페이지 분석
    let analysis: any = {};
    try {
      const analysisPrompt = buildRemakeAnalysisPrompt(scraped.texts, scraped.images);
      const analysisRes = await sendMessage(
        [{ role: 'user', content: analysisPrompt }],
        { system: 'You are a Korean e-commerce page analyst. Respond with valid JSON only.' }
      );
      const text = analysisRes.content.find(c => c.type === 'text')?.text || '{}';
      analysis = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    } catch (e: any) {
      console.warn('Remake analysis failed, using defaults:', e.message);
      analysis = {
        productName: 'URL 리메이크',
        category: category || 'living_goods',
        keyFeatures: scraped.texts.slice(0, 5).join(', '),
      };
    }

    // 3. 프로젝트 생성
    const projectId = uuid();
    const finalCategory = category || analysis.category || 'living_goods';
    db.createProject(projectId, analysis.productName || 'URL 리메이크', finalCategory, 'remake', {
      sourceUrl, category: finalCategory, style, addVideo, analysis,
    });

    // 4. 이미지 다운로드
    const productImages = await downloadScrapedImages(scraped.images, projectId);

    // 5. 파이프라인 시작
    const pipelineId = createPipeline(projectId);
    runPipeline(pipelineId, projectId, {
      mode: 'remake',
      category: finalCategory,
      productName: analysis.productName || 'URL 리메이크',
      keyFeatures: analysis.keyFeatures,
      productImages,
      specSheet: analysis.specs,
      sourceUrl,
    }).catch(console.error);

    return NextResponse.json({ projectId, pipelineId, analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
