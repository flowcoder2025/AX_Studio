import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/claude/client';
import { buildAnalysisPrompt } from '@/lib/claude/prompts';
import { CategoryId } from '@/lib/templates/categories';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName, category, keyFeatures, imageDescriptions } = body;

    if (!productName || !category) {
      return NextResponse.json(
        { error: 'productName and category are required' },
        { status: 400 }
      );
    }

    const prompt = buildAnalysisPrompt(
      productName,
      category as CategoryId,
      keyFeatures,
      imageDescriptions
    );

    const response = await sendMessage(
      [{ role: 'user', content: prompt }],
      { system: 'You are a Korean e-commerce product analyst. Always respond with valid JSON only.' }
    );

    const text = response.content.find(c => c.type === 'text')?.text || '{}';
    const analysis = JSON.parse(text.replace(/```json\n?|```/g, '').trim());

    return NextResponse.json({
      analysis,
      usage: response.usage,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
