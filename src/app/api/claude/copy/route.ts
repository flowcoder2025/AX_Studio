import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/claude/client';
import { buildCopyPrompt } from '@/lib/claude/prompts';
import { CategoryId } from '@/lib/templates/categories';

export async function POST(req: NextRequest) {
  try {
    const { productName, category, analysis, blockTypes } = await req.json();

    if (!productName || !category || !blockTypes?.length) {
      return NextResponse.json(
        { error: 'productName, category, blockTypes are required' },
        { status: 400 }
      );
    }

    const prompt = buildCopyPrompt(
      productName,
      category as CategoryId,
      analysis || {},
      blockTypes
    );

    const response = await sendMessage(
      [{ role: 'user', content: prompt }],
      {
        system: 'You are a top Korean e-commerce copywriter. Respond with valid JSON only.',
        maxTokens: 8192,
      }
    );

    const text = response.content.find(c => c.type === 'text')?.text || '{}';
    const copyData = JSON.parse(text.replace(/```json\n?|```/g, '').trim());

    return NextResponse.json({
      blocks: copyData,
      usage: response.usage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
