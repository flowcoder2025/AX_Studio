import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { sendMessage } from '@/lib/claude/client';
import { getCategoryById } from '@/lib/templates/categories';
import { getPromptExample } from '@/lib/blocks/schema';

export async function POST(req: NextRequest) {
  try {
    const { projectId, blockId, blockType, userPrompt } = await req.json();

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
    const keyStructure = getPromptExample(blockType);

    const prompt = `You are a top Korean e-commerce copywriter. Regenerate ONLY the "${blockType}" block copy for this product.

Product: ${productName}
Category: ${category?.nameKo || project.category}
Tone: ${category?.tone?.join(', ') || '전문적, 신뢰'}
${inputData.analysis ? `Analysis: ${JSON.stringify(inputData.analysis)}` : ''}
${inputData.keyFeatures ? `Key features: ${inputData.keyFeatures}` : ''}

Generate fresh, compelling copy.
${userPrompt ? `User request: "${userPrompt}" — follow this direction closely.` : 'Use a different angle or emphasis than before.'}

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
