// HTML 빌더 — 서버(내보내기)와 클라이언트(미리보기) 공용
// 테마 시스템 기반 렌더링 — generateThemeCSS로 CSS 생성, blockToHtml로 variant 적용

import { BlockDefinition } from '@/types/block';
import { ThemeDefinition } from '@/lib/themes/types';
import { generateThemeCSS } from '@/lib/themes/css-generator';

export function buildDetailPageHtml(
  blocks: BlockDefinition[],
  theme: ThemeDefinition,
  categoryName: string,
  opts?: { preview?: boolean }
): string {
  const blockHtmls = blocks.map(b => {
    const s = b.style;
    const styleAttr = s ? ` style="${[
      s.bgColor ? `background:${s.bgColor}` : '',
      s.padding ? `padding:${s.padding}px` : '',
    ].filter(Boolean).join(';')}"` : '';
    return `<div id="block-${b.id}" data-block-id="${b.id}" class="ax-block"${styleAttr}>${blockToHtml(b, theme, opts)}</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>상세페이지 — ${categoryName}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>
${generateThemeCSS(theme)}
</style>
</head>
<body>
${blockHtmls}
${opts?.preview ? `<style>.ax-block{cursor:pointer;transition:outline 0.15s}.ax-block:hover{outline:1px solid var(--c-primary);outline-offset:-1px;opacity:0.95}[contenteditable]{outline:none;cursor:text;border-radius:2px}[contenteditable]:hover{background:rgba(59,130,246,0.05)}[contenteditable]:focus{outline:1px dashed var(--c-primary)!important;outline-offset:2px;background:rgba(59,130,246,0.03)}</style>
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

// === 유틸리티 함수 ===

// contenteditable 속성 (preview 모드에서만)
function ce(blockId: string, field: string, preview?: boolean): string {
  if (!preview) return '';
  return ` contenteditable="true" data-block-id="${blockId}" data-field="${field}"`;
}

// 요소별 스타일 (블록 style + elementStyles 병합, CSS 변수 기반 baseCSS)
function es(blockStyle: any, elementStyles: any, field: string, baseCSS?: string): string {
  const base = blockStyle || {};
  const elem = elementStyles?.[field] || {};
  const parts: string[] = [];
  if (baseCSS) parts.push(baseCSS);
  const fontSize = elem.fontSize || base.fontSize;
  const textAlign = elem.textAlign || base.textAlign;
  const color = elem.color || base.color;
  const fontWeight = elem.fontWeight || base.fontWeight;
  if (fontSize) parts.push(`font-size:${fontSize}px`);
  if (textAlign) parts.push(`text-align:${textAlign}`);
  if (color) parts.push(`color:${color}`);
  if (fontWeight) parts.push(`font-weight:${fontWeight}`);
  if (parts.length === 0) return '';
  return ` style="${parts.join(';')}"`;
}

// === 블록 렌더러 ===

export function blockToHtml(block: BlockDefinition, theme: ThemeDefinition, opts?: { preview?: boolean }): string {
  const raw = block.data as any;
  const p = opts?.preview;
  if (!raw || Object.keys(raw).length === 0) {
    return `<div class="section"><div class="placeholder">${block.type} block</div></div>`;
  }

  const bStyle = block.style || {};
  const eStyles = block.elementStyles || {};
  const d = { ...raw };
  const v = theme.blockVariants;

  switch (block.type) {
    case 'hero':
      return `<div class="section hero-${v.hero}">
        ${d.subheadline ? `<p${es(bStyle, eStyles, 'subheadline', 'font-size:var(--small);opacity:.5;margin-bottom:4px')}${ce(block.id, 'subheadline', p)}>${d.subheadline}</p>` : ''}
        <h1 class="h1"${es(bStyle, eStyles, 'headline')}${ce(block.id, 'headline', p)}>${d.headline || ''}</h1>
        ${d.kpis?.length ? `<div class="kpi-row">${d.kpis.map((k: any, i: number) => `<div class="kpi-item"><div class="kpi-value"${es(bStyle, eStyles, `kpis.${i}.value`)}${ce(block.id, `kpis.${i}.value`, p)}>${k.value}</div><div class="kpi-label"${es(bStyle, eStyles, `kpis.${i}.label`)}${ce(block.id, `kpis.${i}.label`, p)}>${k.label}</div></div>`).join('')}</div>` : ''}
        ${d.heroImageUrl ? `<img src="${d.heroImageUrl}" style="width:100%;border-radius:var(--card-r);margin-top:16px">` : '<div class="placeholder" style="margin-top:16px;height:200px">Hero image</div>'}
      </div>`;

    case 'trust':
      return `<div class="section-alt" style="text-align:center">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '만족도가 다릅니다'}</h2>
        <div class="${v.trust === 'cards' ? 'trust-grid' : 'trust-grid'}">${(d.metrics || []).map((m: any, i: number) => `<div class="trust-item"><div class="kpi-value"${es(bStyle, eStyles, `metrics.${i}.value`)}${ce(block.id, `metrics.${i}.value`, p)}>${m.value}</div><div class="kpi-label"${es(bStyle, eStyles, `metrics.${i}.label`)}${ce(block.id, `metrics.${i}.label`, p)}>${m.label}</div></div>`).join('')}</div>
      </div>`;

    case 'review':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '실사용 후기'}</h2>
        ${(d.reviews || []).map((r: any, i: number) => `<div class="review-item"><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div><p class="review-text"${es(bStyle, eStyles, `reviews.${i}.text`)}${ce(block.id, `reviews.${i}.text`, p)}>${r.text}</p><p class="review-author"${es(bStyle, eStyles, `reviews.${i}.author`)}${ce(block.id, `reviews.${i}.author`, p)}>${r.author}${r.meta ? ' · ' + r.meta : ''}</p></div>`).join('')}
      </div>`;

    case 'spec':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '제품 사양'}</h2>
        ${(d.specs || []).map((s: any, i: number) => `<div class="spec-row"><span class="spec-key"${es(bStyle, eStyles, `specs.${i}.key`)}${ce(block.id, `specs.${i}.key`, p)}>${s.key}</span><span${es(bStyle, eStyles, `specs.${i}.value`)}${ce(block.id, `specs.${i}.value`, p)}>${s.value}</span></div>`).join('')}
      </div>`;

    case 'faq':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '자주 묻는 질문'}</h2>
        ${(d.faqs || []).map((f: any, i: number) => `<div class="faq-item"><p class="faq-q"><span class="q-badge">Q${i + 1}</span><span${es(bStyle, eStyles, `faqs.${i}.question`)}${ce(block.id, `faqs.${i}.question`, p)}>${f.question}</span></p><p class="faq-a"${es(bStyle, eStyles, `faqs.${i}.answer`, 'padding-left:36px')}${ce(block.id, `faqs.${i}.answer`, p)}>${f.answer}</p></div>`).join('')}
      </div>`;

    case 'cta':
      return `<div class="section-alt">
        <h2 class="h2"${es(bStyle, eStyles, 'title', 'text-align:center')}${ce(block.id, 'title', p)}>${d.title || '패키지 구성'}</h2>
        <div class="pkg-row">${(d.packages || []).map((pk: any, i: number) => `<div class="pkg-card${pk.featured ? ' featured' : ''}">
          ${pk.featured && v.cta !== 'highlight' ? '<div style="font-size:var(--small);color:var(--c-primary);font-weight:600;margin-bottom:2px">BEST</div>' : ''}
          <p${es(bStyle, eStyles, `packages.${i}.name`, 'font-size:var(--h3);font-weight:600')}${ce(block.id, `packages.${i}.name`, p)}>${pk.name}</p>
          <p${es(bStyle, eStyles, `packages.${i}.price`, 'font-size:var(--h2);font-weight:var(--hw);margin-top:4px')}${ce(block.id, `packages.${i}.price`, p)}>${pk.price}</p>
          <p${es(bStyle, eStyles, `packages.${i}.description`, 'font-size:var(--small);color:var(--c-text-muted);margin-top:4px')}${ce(block.id, `packages.${i}.description`, p)}>${pk.description}</p>
        </div>`).join('')}</div>
        <button class="cta-btn"${ce(block.id, 'buttonText', p)}>${d.buttonText || '구매하기'}</button>
      </div>`;

    case 'painpoint':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '이런 고민 있으시죠?'}</h2>
        <div>${(d.painpoints || []).map((pp: string, i: number) => `<div class="painpoint-item"><p class="sub"${es(bStyle, eStyles, `painpoints.${i}`)}${ce(block.id, `painpoints.${i}`, p)}>· ${pp}</p></div>`).join('')}</div>
      </div>`;

    case 'solution':
      return `<div class="section-alt">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '이래서 다릅니다'}</h2>
        <div class="solution-grid">${(d.solutions || []).map((s: any, i: number) => `<div class="solution-item">${s.icon ? `<div style="width:36px;height:36px;border-radius:50%;background:var(--c-surface);display:flex;align-items:center;justify-content:center;font-size:16px;margin-bottom:6px">${s.icon}</div>` : ''}<p class="h3"${es(bStyle, eStyles, `solutions.${i}.title`)}${ce(block.id, `solutions.${i}.title`, p)}>${s.title}</p><p class="sub"${es(bStyle, eStyles, `solutions.${i}.description`, 'margin-top:4px')}${ce(block.id, `solutions.${i}.description`, p)}>${s.description}</p></div>`).join('')}</div>
      </div>`;

    case 'howto':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '사용 방법'}</h2>
        ${(d.steps || []).map((s: any, i: number) => `<div class="howto-step"><div class="step-num">${i + 1}</div><div><p class="h3"${es(bStyle, eStyles, `steps.${i}.title`)}${ce(block.id, `steps.${i}.title`, p)}>${s.title}</p><p class="sub"${es(bStyle, eStyles, `steps.${i}.description`, 'margin-top:2px')}${ce(block.id, `steps.${i}.description`, p)}>${s.description}</p>${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%;border-radius:var(--card-r);margin-top:8px">` : ''}</div></div>`).join('')}
      </div>`;

    case 'feature':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '핵심 기능'}</h2>
        ${(d.features || []).map((f: any, i: number) => {
          const img = f.imageUrl ? `<div class="feature-img"><img src="${f.imageUrl}" style="width:100%;border-radius:var(--card-r)"></div>` : '';
          const text = `<div class="feature-text"><p class="h3"${es(bStyle, eStyles, `features.${i}.title`)}${ce(block.id, `features.${i}.title`, p)}>${f.title}</p><p class="sub"${es(bStyle, eStyles, `features.${i}.description`, 'margin-top:4px')}${ce(block.id, `features.${i}.description`, p)}>${f.description}</p></div>`;
          return `<div class="feature-item">${v.feature === 'alternating' ? img + text : (f.imageUrl ? img : '') + text}</div>`;
        }).join('')}
      </div>`;

    case 'ingredient':
    case 'tech':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || (block.type === 'tech' ? '핵심 기술' : '핵심 성분')}</h2>
        ${d.imageUrl ? `<img src="${d.imageUrl}" style="width:100%;border-radius:var(--card-r);margin-bottom:12px">` : ''}
        ${(d.ingredients || []).map((ing: any, i: number) => `<div style="background:var(--c-surface);border-radius:var(--card-r);padding:var(--card-pad);margin-top:8px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="h3"${es(bStyle, eStyles, `ingredients.${i}.name`)}${ce(block.id, `ingredients.${i}.name`, p)}>${ing.name}</span>${ing.amount ? `<span${es(bStyle, eStyles, `ingredients.${i}.amount`, 'font-size:var(--small);color:var(--c-primary);background:var(--c-surface-alt);padding:2px 8px;border-radius:4px')}${ce(block.id, `ingredients.${i}.amount`, p)}>${ing.amount}</span>` : ''}</div><p${es(bStyle, eStyles, `ingredients.${i}.benefit`, 'font-size:var(--body);color:var(--c-text-sub);line-height:var(--lh)')}${ce(block.id, `ingredients.${i}.benefit`, p)}>${ing.benefit}</p></div>`).join('')}
      </div>`;

    case 'compare':
      return `<div class="section-alt">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '비교'}</h2>
        <table><thead><tr><th></th>${(d.columns || []).map((c: string, ci: number) => `<th${ce(block.id, `columns.${ci}`, p)}>${c}</th>`).join('')}</tr></thead><tbody>${(d.rows || []).map((r: any, ri: number) => `<tr><td${ce(block.id, `rows.${ri}.label`, p)}>${r.label}</td>${(r.values || []).map((val: string, vi: number) => `<td${ce(block.id, `rows.${ri}.values.${vi}`, p)}>${val}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>`;

    case 'certification':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '인증 및 수상'}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${(d.certifications || []).map((c: any, i: number) => `<div style="background:var(--c-surface);border-radius:var(--card-r);padding:10px 14px;flex:1;min-width:140px">${c.imageUrl ? `<img src="${c.imageUrl}" style="width:40px;height:40px;object-fit:contain;margin-bottom:4px">` : ''}<p class="h3"${es(bStyle, eStyles, `certifications.${i}.name`)}${ce(block.id, `certifications.${i}.name`, p)}>${c.name}</p>${c.description ? `<p${es(bStyle, eStyles, `certifications.${i}.description`, 'font-size:var(--small);color:var(--c-text-muted);margin-top:2px')}${ce(block.id, `certifications.${i}.description`, p)}>${c.description}</p>` : ''}</div>`).join('')}</div>
      </div>`;

    case 'size_guide':
      return `<div class="section-alt">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '사이즈 가이드'}</h2>
        ${d.modelInfo ? `<p class="sub">${d.modelInfo}</p>` : ''}
        <table style="margin-top:8px"><thead><tr><th></th>${(d.headers || []).map((h: string) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${(d.rows || []).map((r: any) => `<tr><td>${r.label}</td>${(r.values || []).map((val: string) => `<td>${val}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>`;

    case 'compatibility':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '호환 기기'}</h2>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${(d.devices || []).map((dev: any, i: number) => `<span style="font-size:var(--small);padding:6px 12px;border-radius:6px;border:1px solid ${dev.compatible ? '#bbf7d0' : 'var(--c-border)'};background:${dev.compatible ? '#f0fdf4' : 'var(--c-surface)'};color:${dev.compatible ? '#15803d' : 'var(--c-text-muted)'}"${ce(block.id, `devices.${i}.name`, p)}>${dev.name}</span>`).join('')}</div>
        ${d.note ? `<p style="font-size:var(--small);color:var(--c-text-muted);margin-top:8px">${d.note}</p>` : ''}
      </div>`;

    case 'styling':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '코디 제안'}</h2>
        ${(d.images || []).length > 0 ? `<div style="display:flex;gap:8px">${d.images.map((img: string) => `<img src="${img}" style="flex:1;height:200px;object-fit:cover;border-radius:var(--card-r)">`).join('')}</div>` : '<div class="placeholder" style="height:200px">코디 이미지</div>'}
      </div>`;

    case 'unboxing':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '구성품'}</h2>
        <div style="display:flex;gap:8px">${(d.items || []).map((item: any, i: number) => `<div style="flex:1;text-align:center">${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:80px;object-fit:contain;border-radius:var(--card-r);background:var(--c-surface);margin-bottom:4px">` : `<div style="width:100%;height:80px;border-radius:var(--card-r);background:var(--c-surface);margin-bottom:4px"></div>`}<p${es(bStyle, eStyles, `items.${i}.name`, 'font-size:var(--small);color:var(--c-text-sub)')}${ce(block.id, `items.${i}.name`, p)}>${item.name}</p></div>`).join('')}</div>
      </div>`;

    case 'recipe':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '활용 레시피'}</h2>
        ${(d.recipes || []).map((recipe: any, ri: number) => `<div style="margin-top:12px"><p class="h3"${es(bStyle, eStyles, `recipes.${ri}.title`)}${ce(block.id, `recipes.${ri}.title`, p)}>${recipe.title}</p>${recipe.imageUrl ? `<img src="${recipe.imageUrl}" style="width:100%;border-radius:var(--card-r);margin:8px 0">` : ''}<ol style="font-size:var(--body);color:var(--c-text-sub);padding-left:20px;margin-top:6px">${(recipe.steps || []).map((s: string, si: number) => `<li${es(bStyle, eStyles, `recipes.${ri}.steps.${si}`, 'margin-top:4px;line-height:var(--lh)')}${ce(block.id, `recipes.${ri}.steps.${si}`, p)}>${s}</li>`).join('')}</ol></div>`).join('')}
      </div>`;

    case 'pricing':
      return `<div class="section-alt">
        <h2 class="h2"${es(bStyle, eStyles, 'title', 'text-align:center')}${ce(block.id, 'title', p)}>${d.title || '요금제'}</h2>
        <div class="pkg-row">${(d.plans || []).map((pl: any, i: number) => `<div class="pkg-card${pl.featured ? ' featured' : ''}">
          ${pl.featured ? '<div style="font-size:var(--small);color:var(--c-primary);font-weight:600;margin-bottom:2px">추천</div>' : ''}
          <p${es(bStyle, eStyles, `plans.${i}.name`, 'font-size:var(--h3);font-weight:600')}${ce(block.id, `plans.${i}.name`, p)}>${pl.name}</p>
          <p${es(bStyle, eStyles, `plans.${i}.price`, 'font-size:var(--h2);font-weight:var(--hw);margin-top:4px')}${ce(block.id, `plans.${i}.price`, p)}>${pl.price}</p>
          <ul style="font-size:var(--small);color:var(--c-text-muted);margin-top:8px;text-align:left;list-style:none;padding:0">${(pl.features || []).map((f: string, fi: number) => `<li style="margin-top:4px"${ce(block.id, `plans.${i}.features.${fi}`, p)}>✓ ${f}</li>`).join('')}</ul>
        </div>`).join('')}</div>
      </div>`;

    case 'process':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '제조 공정'}</h2>
        ${(d.steps || []).map((s: any, i: number) => `<div class="howto-step"><div class="step-num">${i + 1}</div><div><p class="h3"${es(bStyle, eStyles, `steps.${i}.title`)}${ce(block.id, `steps.${i}.title`, p)}>${s.title}</p>${s.description ? `<p class="sub"${es(bStyle, eStyles, `steps.${i}.description`, 'margin-top:2px')}${ce(block.id, `steps.${i}.description`, p)}>${s.description}</p>` : ''}${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%;border-radius:var(--card-r);margin-top:8px">` : ''}</div></div>`).join('')}
      </div>`;

    case 'material':
      return `<div class="section">
        <h2 class="h2"${es(bStyle, eStyles, 'title')}${ce(block.id, 'title', p)}>${d.title || '소재 / 원단'}</h2>
        ${d.imageUrl ? `<img src="${d.imageUrl}" style="width:100%;border-radius:var(--card-r);margin-bottom:12px">` : ''}
        ${(d.materials || []).map((m: any, i: number) => `<div style="margin-top:8px"><p class="h3"${es(bStyle, eStyles, `materials.${i}.name`)}${ce(block.id, `materials.${i}.name`, p)}>${m.name}</p><p class="sub"${es(bStyle, eStyles, `materials.${i}.description`, 'margin-top:2px')}${ce(block.id, `materials.${i}.description`, p)}>${m.description}</p></div>`).join('')}
      </div>`;

    case 'image_block':
      return d.imageUrl
        ? `<div class="section"><img src="${d.imageUrl}" style="width:100%;border-radius:var(--card-r)">${d.caption ? `<p${es(bStyle, eStyles, 'caption', 'font-size:var(--small);color:var(--c-text-muted);text-align:center;margin-top:6px')}${ce(block.id, 'caption', p)}>${d.caption}</p>` : ''}</div>`
        : '';

    case 'video_block':
      return d.videoUrl
        ? `<div class="section" style="text-align:center"><video src="${d.videoUrl}" autoplay loop muted playsinline style="width:100%;border-radius:var(--card-r)"></video>${d.caption ? `<p${es(bStyle, eStyles, 'caption', 'font-size:var(--small);color:var(--c-text-muted);margin-top:6px')}${ce(block.id, 'caption', p)}>${d.caption}</p>` : ''}</div>`
        : '';

    default:
      if (block.type.startsWith('video_')) {
        const labels: Record<string, string> = {
          video_360: '360° 제품 회전 영상', video_demo: '기능 시연 모션',
          video_ba: 'Before → After', video_short: '텍스트 모션그래픽',
        };
        if (d.videoUrl) {
          return `<div class="section" style="text-align:center">
            <p style="font-size:var(--body);color:var(--c-text-muted);margin-bottom:8px">${labels[block.type] || block.type}</p>
            <video src="${d.videoUrl}" autoplay loop muted playsinline style="width:100%;border-radius:var(--card-r)"></video>
          </div>`;
        }
        return `<div class="section" style="text-align:center"><div class="placeholder" style="height:200px">${labels[block.type] || block.type}</div></div>`;
      }
      return `<div class="section"><div class="placeholder">${block.type} block</div></div>`;
  }
}
