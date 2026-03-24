import { NextRequest, NextResponse } from 'next/server';
import { BlockDefinition } from '@/types/block';
import { getCategoryById, CategoryId } from '@/lib/templates/categories';
import { buildDetailPageHtml } from '@/lib/render/html-builder';
import { saveOutput } from '@/lib/db/client';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { projectId, blocks, category } = await req.json() as {
      projectId: string;
      blocks: BlockDefinition[];
      category: CategoryId;
    };

    const cat = getCategoryById(category);
    const visibleBlocks = blocks.filter(b => b.visible).sort((a, b) => a.order - b.order);
    let html = buildDetailPageHtml(visibleBlocks, cat?.heroStyle || 'dark', cat?.nameKo || '');

    // serve URL을 base64 인라인으로 변환
    html = await inlineAssets(html);

    const outDir = path.join(process.cwd(), 'output', projectId, 'html');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, 'detail-page.html');
    await fs.writeFile(outPath, html, 'utf-8');

    saveOutput(uuid(), projectId, 'html', null, outPath, html.length);

    return NextResponse.json({ htmlPath: outPath, size: html.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// serve URL → base64 인라인 변환
async function inlineAssets(html: string): Promise<string> {
  // /api/output/serve?path=output/xxx/yyy.png 패턴 찾기
  const urlPattern = /(?:src=")([^"]*\/api\/output\/serve\?path=([^"]*))(?:")/g;
  const matches: { full: string; url: string; filePath: string }[] = [];

  let match;
  while ((match = urlPattern.exec(html)) !== null) {
    matches.push({ full: match[0], url: match[1], filePath: match[2] });
  }

  for (const m of matches) {
    try {
      // output/projectId/gallery/xxx.png → 절대경로
      const absPath = path.resolve(process.cwd(), m.filePath);
      const buf = await fs.readFile(absPath);
      const ext = path.extname(absPath).toLowerCase();

      let mime = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.webp') mime = 'image/webp';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.mp4') mime = 'video/mp4';

      const base64 = buf.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;

      html = html.replace(m.url, dataUri);
    } catch {
      // 파일 못 찾으면 원본 URL 유지
    }
  }

  return html;
}

