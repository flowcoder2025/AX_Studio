import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { sendMessage } from '@/lib/claude/client';
import { getCategoryById } from '@/lib/templates/categories';

// buildCopyPrompt와 동일한 키 구조 — SSOT
const BLOCK_KEY_STRUCTURES: Record<string, string> = {
  hero: '{ "headline": "", "subheadline": "", "kpis": [{"value":"", "label":""}] }',
  painpoint: '{ "title": "", "painpoints": ["고민1", "고민2", "고민3"] }',
  solution: '{ "title": "", "solutions": [{"title": "", "description": ""}] }',
  feature: '{ "title": "", "features": [{"title": "", "description": ""}] }',
  ingredient: '{ "title": "", "ingredients": [{"name": "", "amount": "", "benefit": ""}] }',
  tech: '{ "title": "", "ingredients": [{"name": "", "amount": "", "benefit": ""}] }',
  trust: '{ "title": "", "metrics": [{"value": "", "label": ""}] }',
  review: '{ "title": "", "reviews": [{"rating": 5, "text": "", "author": "", "meta": ""}] }',
  spec: '{ "title": "", "specs": [{"key": "", "value": ""}] }',
  faq: '{ "title": "", "faqs": [{"question": "", "answer": ""}] }',
  howto: '{ "title": "", "steps": [{"title": "", "description": ""}] }',
  cta: '{ "title": "", "packages": [{"name": "", "price": "", "description": ""}], "buttonText": "" }',
  compare: '{ "title": "", "columns": ["제품명", "일반 제품"], "rows": [{"label": "", "values": ["", ""]}] }',
  certification: '{ "title": "", "certifications": [{"name": "", "description": ""}] }',
  size_guide: '{ "title": "", "modelInfo": "", "headers": [], "rows": [{"label": "", "values": []}] }',
  compatibility: '{ "title": "", "devices": [{"name": "", "compatible": true}], "note": "" }',
  recipe: '{ "title": "", "recipes": [{"title": "", "steps": ["단계1"]}] }',
  pricing: '{ "title": "", "plans": [{"name": "", "price": "", "features": ["기능1"], "featured": false}] }',
  material: '{ "title": "", "materials": [{"name": "", "description": ""}] }',
};

export async function POST(req: NextRequest) {
  try {
    const { projectId, blockId, blockType } = await req.json();

    if (!projectId || !blockId || !blockType) {
      return NextResponse.json({ error: 'projectId, blockId, blockType 필수' }, { status: 400 });
    }

    const project = db.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    const inputData = project.input_data ? JSON.parse(project.input_data) : {};
    const category = getCategoryById(project.category);
    const productName = project.name || '제품';
    const keyStructure = BLOCK_KEY_STRUCTURES[blockType] || '{}';

    const prompt = `You are a top Korean e-commerce copywriter. Regenerate ONLY the "${blockType}" block copy for this product.

Product: ${productName}
Category: ${category?.nameKo || project.category}
Tone: ${category?.tone?.join(', ') || '전문적, 신뢰'}
${inputData.analysis ? `Analysis: ${JSON.stringify(inputData.analysis)}` : ''}
${inputData.keyFeatures ? `Key features: ${inputData.keyFeatures}` : ''}

Generate fresh, compelling copy. Use a different angle or emphasis than before.

Return ONLY a JSON object with EXACTLY this key structure:
${keyStructure}

IMPORTANT:
- Do NOT include "style" or "elementStyles" fields — only content data
- Do NOT change key names — use the EXACT keys shown above
- All text in Korean

Respond ONLY with valid JSON, no markdown.`;

    const res = await sendMessage(
      [{ role: 'user', content: prompt }],
      { system: 'You are a Korean e-commerce copywriter. Return valid JSON only.' }
    );

    const text = res.content.find(c => c.type === 'text')?.text || '{}';
    const newData = JSON.parse(text.replace(/```json\n?|```/g, '').trim());

    return NextResponse.json({ data: newData });
  } catch (error: any) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
