import { NextRequest, NextResponse } from 'next/server';
import { parseSpecSheet } from '@/lib/utils/excel-parser';
import { sendMessage } from '@/lib/claude/client';
import { buildExcelParsingPrompt } from '@/lib/claude/prompts';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // 임시 저장
    const tempDir = path.join(process.cwd(), 'output', 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `upload_${Date.now()}.xlsx`);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPath, buf);

    // SheetJS 파싱
    const parsed = parseSpecSheet(tempPath);

    // rawData가 있으면 Claude로 구조화 보완
    let structured: any = {};
    if (parsed.rawData.length > 0) {
      try {
        const prompt = buildExcelParsingPrompt(parsed.rawData);
        const res = await sendMessage([{ role: 'user', content: prompt }], {
          system: 'You are a product data parser. Respond with valid JSON only.',
        });
        const text = res.content.find(c => c.type === 'text')?.text || '{}';
        structured = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      } catch (e: any) {
        console.warn('Claude excel parsing failed:', e.message);
      }
    }

    // 임시 파일 삭제
    await fs.unlink(tempPath).catch(() => {});

    return NextResponse.json({ ...parsed, ...structured });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
