import { NextRequest, NextResponse } from 'next/server';
import { BlockDefinition } from '@/types/block';
import { getCategoryById, CategoryId } from '@/lib/templates/categories';
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
    const html = buildDetailPageHtml(visibleBlocks, cat?.heroStyle || 'dark', cat?.nameKo || '');

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

function buildDetailPageHtml(
  blocks: BlockDefinition[],
  heroStyle: string,
  categoryName: string
): string {
  const blockHtmls = blocks.map(b => blockToHtml(b, heroStyle)).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>상세페이지 — ${categoryName}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Pretendard', -apple-system, sans-serif; max-width: 640px; margin: 0 auto; background: #fff; color: #222; -webkit-font-smoothing: antialiased; }
img, video { max-width: 100%; display: block; }
.section { padding: 28px 24px; }
.section-dark { background: #0a0a0a; color: #f5f5f5; padding: 32px 24px; }
.section-gray { background: #f8f7f4; padding: 28px 24px; }
.divider { height: 0.5px; background: #e5e3de; }
.h1 { font-size: 22px; font-weight: 600; line-height: 1.35; }
.h2 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
.h3 { font-size: 14px; font-weight: 600; }
.sub { font-size: 13px; line-height: 1.65; color: #888; margin-top: 8px; }
.kpi-row { display: flex; justify-content: center; gap: 24px; margin-top: 16px; }
.kpi-item { text-align: center; }
.kpi-value { font-size: 22px; font-weight: 600; }
.kpi-label { font-size: 11px; color: #999; margin-top: 2px; }
.placeholder { border: 2px dashed #ddd; border-radius: 8px; padding: 40px; text-align: center; color: #ccc; font-size: 13px; margin-top: 12px; }
.spec-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 0.5px solid #eee; font-size: 13px; }
.spec-key { color: #999; }
.faq-item { padding: 12px 0; border-bottom: 0.5px solid #eee; }
.faq-q { font-size: 14px; font-weight: 600; }
.faq-a { font-size: 13px; color: #777; margin-top: 6px; line-height: 1.6; }
.review-card { background: #f8f7f4; border-radius: 8px; padding: 14px; margin-bottom: 8px; }
.stars { color: #EF9F27; font-size: 14px; }
.cta-btn { display: block; width: 100%; padding: 14px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; cursor: pointer; margin-top: 12px; }
.step-row { display: flex; gap: 12px; margin-top: 12px; }
.step-num { width: 28px; height: 28px; border-radius: 50%; background: #e8f0fe; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }
.pkg-row { display: flex; gap: 8px; margin-top: 12px; }
.pkg-card { flex: 1; border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; }
.pkg-card.featured { border: 2px solid #2563eb; }
</style>
</head>
<body>
${blockHtmls}
</body>
</html>`;
}

function blockToHtml(block: BlockDefinition, heroStyle: string): string {
  const d = block.data as any;
  if (!d || Object.keys(d).length === 0) {
    return `<div class="section"><div class="placeholder">${block.type} block</div></div>`;
  }

  switch (block.type) {
    case 'hero':
      return `<div class="${heroStyle === 'dark' ? 'section-dark' : 'section'}">
        ${d.subheadline ? `<p style="font-size:12px;opacity:.5;margin-bottom:4px">${d.subheadline}</p>` : ''}
        <h1 class="h1">${d.headline || ''}</h1>
        ${d.kpis?.length ? `<div class="kpi-row">${d.kpis.map((k: any) => `<div class="kpi-item"><div class="kpi-value" style="color:${heroStyle === 'dark' ? '#60a5fa' : '#2563eb'}">${k.value}</div><div class="kpi-label">${k.label}</div></div>`).join('')}</div>` : ''}
        ${d.heroImageUrl ? `<img src="${d.heroImageUrl}" style="width:100%;border-radius:8px;margin-top:16px">` : '<div class="placeholder" style="margin-top:16px;height:200px">Hero image</div>'}
      </div>`;

    case 'trust':
      return `<div class="section-gray" style="text-align:center">
        <h2 class="h2">만족도가 다릅니다</h2>
        <div class="kpi-row">${(d.metrics || []).map((m: any) => `<div class="kpi-item"><div class="kpi-value">${m.value}</div><div class="kpi-label">${m.label}</div></div>`).join('')}</div>
      </div>`;

    case 'review':
      return `<div class="section">
        <h2 class="h2">실사용 후기</h2>
        ${(d.reviews || []).map((r: any) => `<div class="review-card"><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><p style="font-size:12px;color:#666;margin-top:6px;line-height:1.6">"${r.text}"</p><p style="font-size:11px;color:#aaa;margin-top:4px">${r.author}${r.meta ? ' · ' + r.meta : ''}</p></div>`).join('')}
      </div>`;

    case 'spec':
      return `<div class="section">
        <h2 class="h2">${d.title || '제품 사양'}</h2>
        ${(d.specs || []).map((s: any) => `<div class="spec-row"><span class="spec-key">${s.key}</span><span>${s.value}</span></div>`).join('')}
      </div>`;

    case 'faq':
      return `<div class="section">
        <h2 class="h2">자주 묻는 질문</h2>
        ${(d.faqs || []).map((f: any) => `<div class="faq-item"><p class="faq-q">${f.question}</p><p class="faq-a">${f.answer}</p></div>`).join('')}
      </div>`;

    case 'cta':
      return `<div class="section-gray">
        <h2 class="h2" style="text-align:center">패키지 구성</h2>
        <div class="pkg-row">${(d.packages || []).map((p: any) => `<div class="pkg-card${p.featured ? ' featured' : ''}">
          ${p.featured ? '<div style="font-size:10px;color:#2563eb;font-weight:600;margin-bottom:2px">BEST</div>' : ''}
          <p style="font-size:13px;font-weight:600">${p.name}</p>
          <p style="font-size:18px;font-weight:600;margin-top:4px">${p.price}</p>
          <p style="font-size:11px;color:#999;margin-top:4px">${p.description}</p>
        </div>`).join('')}</div>
        <button class="cta-btn">${d.buttonText || '구매하기'}</button>
      </div>`;

    case 'painpoint':
      return `<div class="section">
        <h2 class="h2">${d.title || '이런 고민 있으시죠?'}</h2>
        <div class="sub">${(d.painpoints || []).map((p: string) => `<p style="margin-top:8px">· ${p}</p>`).join('')}</div>
      </div>`;

    case 'solution':
      return `<div class="section-gray">
        <h2 class="h2">${d.title || '이래서 다릅니다'}</h2>
        ${(d.solutions || []).map((s: any) => `<div style="margin-top:12px"><p class="h3">${s.title}</p><p class="sub" style="margin-top:4px">${s.description}</p></div>`).join('')}
      </div>`;

    case 'howto':
      return `<div class="section">
        <h2 class="h2">${d.title || '사용 방법'}</h2>
        ${(d.steps || []).map((s: any, i: number) => `<div class="step-row"><div class="step-num">${i + 1}</div><div><p class="h3">${s.title}</p><p class="sub" style="margin-top:2px">${s.description}</p></div></div>`).join('')}
      </div>`;

    default:
      if (block.type.startsWith('video_')) {
        const labels: Record<string, string> = {
          video_360: '360° 제품 회전 영상',
          video_demo: '기능 시연 모션',
          video_ba: 'Before → After',
          video_short: '텍스트 모션그래픽',
        };
        return `<div class="section" style="text-align:center">
          <div class="placeholder" style="height:200px">${labels[block.type] || block.type}</div>
        </div>`;
      }
      return `<div class="section"><div class="placeholder">${block.type} block</div></div>`;
  }
}
