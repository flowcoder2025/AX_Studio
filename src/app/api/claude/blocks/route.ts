import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/claude/client';
import { buildBlockRecommendationPrompt } from '@/lib/claude/prompts';
import { CategoryId, getCategoryById } from '@/lib/templates/categories';

export async function POST(req: NextRequest) {
  try {
    const { category, analysis, hasUserImages } = await req.json();

    if (!category) {
      return NextResponse.json({ error: 'category required' }, { status: 400 });
    }

    // If no analysis, return default block order
    if (!analysis) {
      const cat = getCategoryById(category as CategoryId);
      return NextResponse.json({
        blockOrder: cat?.blockOrder || [],
        reasoning: '기본 카테고리 순서',
      });
    }

    const prompt = buildBlockRecommendationPrompt(
      category as CategoryId, analysis, hasUserImages ?? false
    );

    const response = await sendMessage(
      [{ role: 'user', content: prompt }],
      { system: 'You are an e-commerce UX expert. Respond with valid JSON only.' }
    );

    const text = response.content.find(c => c.type === 'text')?.text || '{}';
    const recommendation = JSON.parse(text.replace(/```json\n?|```/g, '').trim());

    return NextResponse.json(recommendation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
