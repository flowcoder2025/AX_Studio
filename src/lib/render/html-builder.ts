// HTML 빌더 — 서버(내보내기)와 클라이언트(미리보기) 공용
// Node.js API 사용 금지 (순수 문자열 조합만)

import { BlockDefinition } from '@/types/block';

export function buildDetailPageHtml(
  blocks: BlockDefinition[],
  heroStyle: string,
  categoryName: string,
  opts?: { preview?: boolean }
): string {
  const blockHtmls = blocks.map(b => {
    const s = (b.data as any)?.style;
    const styleAttr = s ? ` style="${[
      s.fontSize ? `font-size:${s.fontSize}px` : '',
      s.textAlign ? `text-align:${s.textAlign}` : '',
      s.color ? `color:${s.color}` : '',
      s.fontWeight ? `font-weight:${s.fontWeight}` : '',
      s.bgColor ? `background:${s.bgColor}` : '',
      s.padding ? `padding:${s.padding}px` : '',
    ].filter(Boolean).join(';')}"` : '';
    return `<div id="block-${b.id}" data-block-id="${b.id}" class="ax-block"${styleAttr}>${blockToHtml(b, heroStyle, opts)}</div>`;
  }).join('\n');

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
${opts?.preview ? `<style>.ax-block{cursor:pointer;transition:outline 0.15s}.ax-block:hover{outline:1px solid #93c5fd;outline-offset:-1px}[contenteditable]{outline:none;cursor:text;border-radius:2px}[contenteditable]:hover{background:rgba(59,130,246,0.05)}[contenteditable]:focus{outline:1px dashed #3b82f6!important;outline-offset:2px;background:rgba(59,130,246,0.03)}</style>
<script>
document.addEventListener('click',function(e){
  if(e.target.hasAttribute&&e.target.hasAttribute('contenteditable')){
    var bid=e.target.dataset.blockId;
    var fld=e.target.dataset.field;
    if(bid)window.parent.postMessage({type:'text-focus',blockId:bid,field:fld},'*');
    return;
  }
  var el=e.target;
  while(el&&el!==document.body){
    if(el.dataset&&el.dataset.blockId&&el.classList.contains('ax-block')){
      window.parent.postMessage({type:'block-click',blockId:el.dataset.blockId},'*');
      return;
    }
    el=el.parentElement;
  }
  window.parent.postMessage({type:'block-click',blockId:null},'*');
});
document.addEventListener('input',function(e){
  var el=e.target;
  if(el.dataset&&el.dataset.field&&el.dataset.blockId){
    window.parent.postMessage({type:'inline-edit',blockId:el.dataset.blockId,field:el.dataset.field,value:el.textContent},'*');
  }
});
</script>` : ''}
</body>
</html>`;
}

// contenteditable 속성 생성 (preview 모드에서만)
function ce(blockId: string, field: string, preview?: boolean): string {
  if (!preview) return '';
  return ` contenteditable="true" data-block-id="${blockId}" data-field="${field}"`;
}

// 요소별 스타일 CSS 문자열 생성 (블록 style + elementStyles 병합)
// 기존 inline style과 합치기 위해 CSS 문자열만 반환 (style="" 태그 없이)
function es(blockStyle: any, elementStyles: any, field: string, baseCSS?: string): string {
  const base = blockStyle || {};
  const elem = elementStyles?.[field] || {};
  const parts: string[] = [];
  if (baseCSS) parts.push(baseCSS);
  // 블록 레벨 텍스트 속성
  if (base.fontSize) parts.push(`font-size:${base.fontSize}px`);
  if (base.textAlign) parts.push(`text-align:${base.textAlign}`);
  if (base.color) parts.push(`color:${base.color}`);
  if (base.fontWeight) parts.push(`font-weight:${base.fontWeight}`);
  // 요소 레벨 오버라이드 (우선 — 동일 속성 덮어씀)
  if (elem.fontSize) { parts.push(`font-size:${elem.fontSize}px`); }
  if (elem.textAlign) { parts.push(`text-align:${elem.textAlign}`); }
  if (elem.color) { parts.push(`color:${elem.color}`); }
  if (elem.fontWeight) { parts.push(`font-weight:${elem.fontWeight}`); }
  if (parts.length === 0) return '';
  return ` style="${parts.join(';')}"`;
}

export function blockToHtml(block: BlockDefinition, heroStyle: string, opts?: { preview?: boolean }): string {
  const raw = block.data as any;
  const p = opts?.preview;
  if (!raw || Object.keys(raw).length === 0) {
    return `<div class="section"><div class="placeholder">${block.type} block</div></div>`;
  }

  // 정규화는 page.tsx의 normalizeBlock에서 로드 시점에 처리됨
  // 내보내기(서버) 경로를 위한 최소 fallback만 유지
  const bStyle = raw.style || {};
  const eStyles = raw.elementStyles || {};
  const d = { ...raw };
  if (!d.painpoints && block.type === 'painpoint') { const src = d.points || d.items || []; d.painpoints = src.map((it: any) => typeof it === 'string' ? it : it.text || it.description || it.title || ''); }
  if (!d.solutions && d.items && block.type === 'solution') { d.solutions = d.items; }
  if (!d.features && d.items && block.type === 'feature') { d.features = d.items; }
  if (!d.specs && d.items && block.type === 'spec') { d.specs = d.items; }
  if (!d.faqs && d.items && block.type === 'faq') { d.faqs = d.items; }
  if (!d.reviews && d.items && block.type === 'review') { d.reviews = d.items; }
  if (!d.columns && d.headers && block.type === 'compare') { d.columns = d.headers; }
  if (d.rows?.length && Array.isArray(d.rows[0]) && block.type === 'compare') { d.rows = d.rows.map((r: any) => ({ label: r[0] || '', values: r.slice(1) })); }

  switch (block.type) {
    case 'hero':
      return `<div class="section">
        ${d.subheadline ? `<p${es(bStyle, eStyles, 'subheadline', 'font-size:12px;opacity:.5;margin-bottom:4px')}${ce(block.id, 'subheadline', p)}>${d.subheadline}</p>` : ''}
        <h1 class="h1"${es(bStyle, eStyles, 'headline')}${ce(block.id, 'headline', p)}>${d.headline || ''}</h1>
        ${d.kpis?.length ? `<div class="kpi-row">${d.kpis.map((k: any, i: number) => `<div class="kpi-item"><div class="kpi-value"${es(bStyle, eStyles, `kpis.${i}.value`, 'color:#2563eb')}${ce(block.id, `kpis.${i}.value`, p)}>${k.value}</div><div class="kpi-label"${es(bStyle, eStyles, `kpis.${i}.label`)}${ce(block.id, `kpis.${i}.label`, p)}>${k.label}</div></div>`).join('')}</div>` : ''}
        ${d.heroImageUrl ? `<img src="${d.heroImageUrl}" style="width:100%;border-radius:8px;margin-top:16px">` : '<div class="placeholder" style="margin-top:16px;height:200px">Hero image</div>'}
      </div>`;

    case 'trust':
      return `<div class="section-gray" style="text-align:center">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '만족도가 다릅니다'}</h2>
        <div class="kpi-row">${(d.metrics || []).map((m: any, i: number) => `<div class="kpi-item"><div class="kpi-value"${es(bStyle, eStyles, `metrics.${i}.value`)}${ce(block.id, `metrics.${i}.value`, p)}>${m.value}</div><div class="kpi-label"${es(bStyle, eStyles, `metrics.${i}.label`)}${ce(block.id, `metrics.${i}.label`, p)}>${m.label}</div></div>`).join('')}</div>
      </div>`;

    case 'review':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '실사용 후기'}</h2>
        ${(d.reviews || []).map((r: any, i: number) => `<div class="review-card"><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><p${es(bStyle, eStyles, `reviews.${i}.text`, 'font-size:12px;color:#666;margin-top:6px;line-height:1.6')}${ce(block.id, `reviews.${i}.text`, p)}>${r.text}</p><p${es(bStyle, eStyles, `reviews.${i}.author`, 'font-size:11px;color:#aaa;margin-top:4px')}${ce(block.id, `reviews.${i}.author`, p)}>${r.author}${r.meta ? ' · ' + r.meta : ''}</p></div>`).join('')}
      </div>`;

    case 'spec':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '제품 사양'}</h2>
        ${(d.specs || []).map((s: any, i: number) => `<div class="spec-row"><span class="spec-key"${es(bStyle, eStyles, `specs.${i}.key`)}${ce(block.id, `specs.${i}.key`, p)}>${s.key}</span><span${es(bStyle, eStyles, `specs.${i}.value`)}${ce(block.id, `specs.${i}.value`, p)}>${s.value}</span></div>`).join('')}
      </div>`;

    case 'faq':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '자주 묻는 질문'}</h2>
        ${(d.faqs || []).map((f: any, i: number) => `<div class="faq-item"><p class="faq-q"><span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:#e8f0fe;color:#2563eb;text-align:center;line-height:28px;font-size:12px;font-weight:600;margin-right:8px;flex-shrink:0">Q${i + 1}</span><span${es(bStyle, eStyles, `faqs.${i}.question`)}${ce(block.id, `faqs.${i}.question`, p)}>${f.question}</span></p><p class="faq-a"${es(bStyle, eStyles, `faqs.${i}.answer`, 'padding-left:36px')}${ce(block.id, `faqs.${i}.answer`, p)}>${f.answer}</p></div>`).join('')}
      </div>`;

    case 'cta':
      return `<div class="section-gray">
        <h2 class="h2"${es(bStyle, eStyles, 'title', 'text-align:center')}${ce(block.id, 'title', p)}>${d.title || '패키지 구성'}</h2>
        <div class="pkg-row">${(d.packages || []).map((pk: any, i: number) => `<div class="pkg-card${pk.featured ? ' featured' : ''}">
          ${pk.featured ? '<div style="font-size:10px;color:#2563eb;font-weight:600;margin-bottom:2px">BEST</div>' : ''}
          <p${es(bStyle, eStyles, `packages.${i}.name`, 'font-size:13px;font-weight:600')}${ce(block.id, `packages.${i}.name`, p)}>${pk.name}</p>
          <p${es(bStyle, eStyles, `packages.${i}.price`, 'font-size:18px;font-weight:600;margin-top:4px')}${ce(block.id, `packages.${i}.price`, p)}>${pk.price}</p>
          <p${es(bStyle, eStyles, `packages.${i}.description`, 'font-size:11px;color:#999;margin-top:4px')}${ce(block.id, `packages.${i}.description`, p)}>${pk.description}</p>
        </div>`).join('')}</div>
        <button class="cta-btn"${ce(block.id, 'buttonText', p)}>${d.buttonText || '구매하기'}</button>
      </div>`;

    case 'painpoint':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '이런 고민 있으시죠?'}</h2>
        <div class="sub">${(d.painpoints || []).map((pp: string, i: number) => `<p${es(bStyle, eStyles, `painpoints.${i}`, 'margin-top:8px')}${ce(block.id, `painpoints.${i}`, p)}>· ${pp}</p>`).join('')}</div>
      </div>`;

    case 'solution':
      return `<div class="section-gray">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '이래서 다릅니다'}</h2>
        ${(d.solutions || []).map((s: any, i: number) => `<div style="margin-top:12px">${s.icon ? `<div style="width:36px;height:36px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:16px;margin-bottom:6px">${s.icon}</div>` : ''}<p class="h3"${es(bStyle, eStyles, `solutions.${i}.title`)}${ce(block.id, `solutions.${i}.title`, p)}>${s.title}</p><p class="sub"${es(bStyle, eStyles, `solutions.${i}.description`, 'margin-top:4px')}${ce(block.id, `solutions.${i}.description`, p)}>${s.description}</p></div>`).join('')}
      </div>`;

    case 'howto':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '사용 방법'}</h2>
        ${(d.steps || []).map((s: any, i: number) => `<div class="step-row"><div class="step-num">${i + 1}</div><div><p class="h3"${es(bStyle, eStyles, `steps.${i}.title`)}${ce(block.id, `steps.${i}.title`, p)}>${s.title}</p><p class="sub"${es(bStyle, eStyles, `steps.${i}.description`, 'margin-top:2px')}${ce(block.id, `steps.${i}.description`, p)}>${s.description}</p>${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%;border-radius:8px;margin-top:8px">` : ''}</div></div>`).join('')}
      </div>`;

    case 'feature':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '핵심 기능'}</h2>
        ${(d.features || []).map((f: any, i: number) => `<div style="margin-top:16px">${f.imageUrl ? `<img src="${f.imageUrl}" style="width:100%;border-radius:8px;margin-bottom:8px">` : ''}<p class="h3"${es(bStyle, eStyles, `features.${i}.title`)}${ce(block.id, `features.${i}.title`, p)}>${f.title}</p><p class="sub"${es(bStyle, eStyles, `features.${i}.description`, 'margin-top:4px')}${ce(block.id, `features.${i}.description`, p)}>${f.description}</p></div>`).join('')}
      </div>`;

    case 'ingredient':
    case 'tech':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || (block.type === 'tech' ? '핵심 기술' : '핵심 성분')}</h2>
        ${d.imageUrl ? `<img src="${d.imageUrl}" style="width:100%;border-radius:8px;margin-bottom:12px">` : ''}
        ${(d.ingredients || []).map((ing: any, i: number) => `<div style="background:#f8f7f4;border-radius:8px;padding:12px;margin-top:8px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="h3"${es(bStyle, eStyles, `ingredients.${i}.name`)}${ce(block.id, `ingredients.${i}.name`, p)}>${ing.name}</span>${ing.amount ? `<span${es(bStyle, eStyles, `ingredients.${i}.amount`, 'font-size:11px;color:#2563eb;background:#e8f0fe;padding:2px 8px;border-radius:4px')}${ce(block.id, `ingredients.${i}.amount`, p)}>${ing.amount}</span>` : ''}</div><p${es(bStyle, eStyles, `ingredients.${i}.benefit`, 'font-size:12px;color:#777;line-height:1.6')}${ce(block.id, `ingredients.${i}.benefit`, p)}>${ing.benefit}</p></div>`).join('')}
      </div>`;

    case 'compare':
      return `<div class="section-gray">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '비교'}</h2>
        <table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px;color:#999"></th>${(d.columns || []).map((c: string, ci: number) => `<th style="text-align:center;padding:8px"${ce(block.id, `columns.${ci}`, p)}>${c}</th>`).join('')}</tr></thead><tbody>${(d.rows || []).map((r: any, ri: number) => `<tr style="border-top:1px solid #eee"><td style="padding:8px;color:#999"${ce(block.id, `rows.${ri}.label`, p)}>${r.label}</td>${(r.values || []).map((v: string, vi: number) => `<td style="text-align:center;padding:8px"${ce(block.id, `rows.${ri}.values.${vi}`, p)}>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>`;

    case 'certification':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '인증 및 수상'}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${(d.certifications || []).map((c: any, i: number) => `<div style="background:#f8f7f4;border-radius:8px;padding:10px 14px;flex:1;min-width:140px">${c.imageUrl ? `<img src="${c.imageUrl}" style="width:40px;height:40px;object-fit:contain;margin-bottom:4px">` : ''}<p class="h3"${es(bStyle, eStyles, `certifications.${i}.name`)}${ce(block.id, `certifications.${i}.name`, p)}>${c.name}</p>${c.description ? `<p${es(bStyle, eStyles, `certifications.${i}.description`, 'font-size:10px;color:#999;margin-top:2px')}${ce(block.id, `certifications.${i}.description`, p)}>${c.description}</p>` : ''}</div>`).join('')}</div>
      </div>`;

    case 'size_guide':
      return `<div class="section-gray">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '사이즈 가이드'}</h2>
        ${d.modelInfo ? `<p class="sub">${d.modelInfo}</p>` : ''}
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:8px"><thead><tr><th style="text-align:left;padding:8px;color:#999"></th>${(d.headers || []).map((h: string, i: number) => `<th style="text-align:center;padding:8px;${d.highlightColumn === i ? 'background:#e8f0fe;color:#2563eb' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${(d.rows || []).map((r: any) => `<tr style="border-top:1px solid #eee"><td style="padding:8px;color:#999">${r.label}</td>${(r.values || []).map((v: string, vi: number) => `<td style="text-align:center;padding:8px;${d.highlightColumn === vi ? 'background:#e8f0fe;color:#2563eb;font-weight:600' : ''}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>`;

    case 'compatibility':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '호환 기기'}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${(d.devices || []).map((dev: any, i: number) => `<span style="font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid ${dev.compatible ? '#bbf7d0' : '#e5e7eb'};background:${dev.compatible ? '#f0fdf4' : '#f9fafb'};color:${dev.compatible ? '#15803d' : '#9ca3af'}"${ce(block.id, `devices.${i}.name`, p)}>${dev.name}</span>`).join('')}</div>
        ${d.note ? `<p style="font-size:11px;color:#999;margin-top:8px">${d.note}</p>` : ''}
      </div>`;

    case 'styling':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '코디 제안'}</h2>
        ${(d.images || []).length > 0 ? `<div style="display:flex;gap:8px">${d.images.map((img: string) => `<img src="${img}" style="flex:1;height:200px;object-fit:cover;border-radius:8px">`).join('')}</div>` : '<div class="placeholder" style="height:200px">코디 이미지</div>'}
      </div>`;

    case 'unboxing':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '구성품'}</h2>
        <div style="display:flex;gap:8px">${(d.items || []).map((item: any, i: number) => `<div style="flex:1;text-align:center">${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:80px;object-fit:contain;border-radius:8px;background:#f8f7f4;margin-bottom:4px">` : '<div style="width:100%;height:80px;border-radius:8px;background:#f8f7f4;margin-bottom:4px"></div>'}<p${es(bStyle, eStyles, `items.${i}.name`, 'font-size:10px;color:#666')}${ce(block.id, `items.${i}.name`, p)}>${item.name}</p></div>`).join('')}</div>
      </div>`;

    case 'recipe':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '활용 레시피'}</h2>
        ${(d.recipes || []).map((recipe: any, ri: number) => `<div style="margin-top:12px"><p class="h3"${es(bStyle, eStyles, `recipes.${ri}.title`)}${ce(block.id, `recipes.${ri}.title`, p)}>${recipe.title}</p>${recipe.imageUrl ? `<img src="${recipe.imageUrl}" style="width:100%;border-radius:8px;margin:8px 0">` : ''}<ol style="font-size:12px;color:#666;padding-left:20px;margin-top:6px">${(recipe.steps || []).map((s: string, si: number) => `<li${es(bStyle, eStyles, `recipes.${ri}.steps.${si}`, 'margin-top:4px;line-height:1.6')}${ce(block.id, `recipes.${ri}.steps.${si}`, p)}>${s}</li>`).join('')}</ol></div>`).join('')}
      </div>`;

    case 'pricing':
      return `<div class="section-gray">
        <h2 class="h2"${es(bStyle, eStyles, 'title', 'text-align:center')}${ce(block.id, 'title', p)}>${d.title || '요금제'}</h2>
        <div class="pkg-row">${(d.plans || []).map((pl: any, i: number) => `<div class="pkg-card${pl.featured ? ' featured' : ''}">
          ${pl.featured ? '<div style="font-size:10px;color:#2563eb;font-weight:600;margin-bottom:2px">추천</div>' : ''}
          <p${es(bStyle, eStyles, `plans.${i}.name`, 'font-size:13px;font-weight:600')}${ce(block.id, `plans.${i}.name`, p)}>${pl.name}</p>
          <p${es(bStyle, eStyles, `plans.${i}.price`, 'font-size:18px;font-weight:600;margin-top:4px')}${ce(block.id, `plans.${i}.price`, p)}>${pl.price}</p>
          <ul style="font-size:11px;color:#999;margin-top:8px;text-align:left;list-style:none;padding:0">${(pl.features || []).map((f: string, fi: number) => `<li style="margin-top:4px"${ce(block.id, `plans.${i}.features.${fi}`, p)}>✓ ${f}</li>`).join('')}</ul>
        </div>`).join('')}</div>
      </div>`;

    case 'process':
      return `<div class="section">
        <h2 class="h2"${ce(block.id, 'title', p)}>${d.title || '제조 공정'}</h2>
        ${(d.steps || []).map((s: any, i: number) => `<div class="step-row"><div class="step-num" style="background:#e6f6f0;color:#0d9488">${i + 1}</div><div><p class="h3"${es(bStyle, eStyles, `steps.${i}.title`)}${ce(block.id, `steps.${i}.title`, p)}>${s.title}</p>${s.description ? `<p class="sub"${es(bStyle, eStyles, `steps.${i}.description`, 'margin-top:2px')}${ce(block.id, `steps.${i}.description`, p)}>${s.description}</p>` : ''}${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%;border-radius:8px;margin-top:8px">` : ''}</div></div>`).join('')}
      </div>`;

    case 'material':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '소재 / 원단'}</h2>
        ${d.imageUrl ? `<img src="${d.imageUrl}" style="width:100%;border-radius:8px;margin-bottom:12px">` : ''}
        ${(d.materials || []).map((m: any, i: number) => `<div style="margin-top:8px"><p class="h3"${es(bStyle, eStyles, `materials.${i}.name`)}${ce(block.id, `materials.${i}.name`, p)}>${m.name}</p><p class="sub"${es(bStyle, eStyles, `materials.${i}.description`, 'margin-top:2px')}${ce(block.id, `materials.${i}.description`, p)}>${m.description}</p></div>`).join('')}
      </div>`;

    case 'image_block':
      return d.imageUrl
        ? `<div class="section"><img src="${d.imageUrl}" style="width:100%;border-radius:8px">${d.caption ? `<p${es(bStyle, eStyles, 'caption', 'font-size:11px;color:#999;text-align:center;margin-top:6px')}${ce(block.id, 'caption', p)}>${d.caption}</p>` : ''}</div>`
        : '';

    case 'video_block':
      return d.videoUrl
        ? `<div class="section" style="text-align:center"><video src="${d.videoUrl}" autoplay loop muted playsinline style="width:100%;border-radius:8px"></video>${d.caption ? `<p${es(bStyle, eStyles, 'caption', 'font-size:11px;color:#999;margin-top:6px')}${ce(block.id, 'caption', p)}>${d.caption}</p>` : ''}</div>`
        : '';

    default:
      if (block.type.startsWith('video_')) {
        const labels: Record<string, string> = {
          video_360: '360° 제품 회전 영상',
          video_demo: '기능 시연 모션',
          video_ba: 'Before → After',
          video_short: '텍스트 모션그래픽',
        };
        if (d.videoUrl) {
          return `<div class="section" style="text-align:center">
            <p style="font-size:12px;color:#999;margin-bottom:8px">${labels[block.type] || block.type}</p>
            <video src="${d.videoUrl}" autoplay loop muted playsinline style="width:100%;border-radius:8px"></video>
          </div>`;
        }
        return `<div class="section" style="text-align:center">
          <div class="placeholder" style="height:200px">${labels[block.type] || block.type}</div>
        </div>`;
      }
      return `<div class="section"><div class="placeholder">${block.type} block</div></div>`;
  }
}
