// CSS Generator — ThemeDefinition → CSS 문자열 변환
// 순수 함수, 외부 의존성 없음 (types.ts만 참조)

import { ThemeDefinition } from './types';

export function generateThemeCSS(theme: ThemeDefinition): string {
  return [
    generateVariables(theme),
    generateBaseStyles(theme),
    generateBlockVariantStyles(theme),
    generateUtilityStyles(theme),
  ].join('\n');
}

// CSS Custom Properties
function generateVariables(t: ThemeDefinition): string {
  return `:root {
  --c-primary: ${t.colors.primary};
  --c-secondary: ${t.colors.secondary};
  --c-accent: ${t.colors.accent};
  --c-bg: ${t.colors.background};
  --c-surface: ${t.colors.surface};
  --c-surface-alt: ${t.colors.surfaceAlt};
  --c-text: ${t.colors.text};
  --c-text-sub: ${t.colors.textSub};
  --c-text-muted: ${t.colors.textMuted};
  --c-border: ${t.colors.border};
  --font: ${t.typography.fontFamily};
  --h1: ${t.typography.h1};
  --h2: ${t.typography.h2};
  --h3: ${t.typography.h3};
  --body: ${t.typography.body};
  --small: ${t.typography.small};
  --lh: ${t.typography.lineHeight};
  --hw: ${t.typography.headingWeight};
  --section-pad: ${t.spacing.sectionPadding};
  --item-gap: ${t.spacing.itemGap};
  --card-pad: ${t.spacing.cardPadding};
  --card-r: ${t.decorations.cardRadius};
  --section-r: ${t.decorations.sectionRadius};
  --shadow: ${t.decorations.shadow || 'none'};
}`;
}

// Base element styles
function generateBaseStyles(t: ThemeDefinition): string {
  return `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); max-width: 640px; margin: 0 auto; background: var(--c-bg); color: var(--c-text); font-size: var(--body); line-height: var(--lh); -webkit-font-smoothing: antialiased; }
img, video { max-width: 100%; display: block; }
.section { padding: var(--section-pad); }
.section-alt { padding: var(--section-pad); background: var(--c-surface-alt); }
.h1 { font-size: var(--h1); font-weight: var(--hw); line-height: 1.35; }
.h2 { font-size: var(--h2); font-weight: var(--hw); margin-bottom: 12px; }
.h3 { font-size: var(--h3); font-weight: 600; }
.sub { font-size: var(--body); line-height: var(--lh); color: var(--c-text-sub); margin-top: 8px; }
.placeholder { border: 2px dashed var(--c-border); border-radius: var(--card-r); padding: 40px; text-align: center; color: var(--c-text-muted); font-size: var(--body); margin-top: 12px; }`;
}

// Block variant styles
function generateBlockVariantStyles(t: ThemeDefinition): string {
  const parts: string[] = [];

  // Hero variants
  parts.push(`.hero-centered { text-align: center; }
.hero-left { text-align: left; }`);

  // KPI row
  parts.push(`.kpi-row { display: flex; justify-content: center; gap: 24px; margin-top: 16px; }
.kpi-item { text-align: center; }
.kpi-value { font-size: 22px; font-weight: var(--hw); color: var(--c-primary); }
.kpi-label { font-size: var(--small); color: var(--c-text-muted); margin-top: 2px; }`);

  // Feature variants
  if (t.blockVariants.feature === 'cards') {
    parts.push(`.feature-item { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--card-r); padding: var(--card-pad); margin-top: var(--item-gap); ${t.decorations.shadow !== 'none' ? `box-shadow: ${t.decorations.shadow};` : ''} }`);
  } else if (t.blockVariants.feature === 'alternating') {
    parts.push(`.feature-item { display: flex; gap: 16px; align-items: center; margin-top: 20px; }
.feature-item:nth-child(even) { flex-direction: row-reverse; }
.feature-item .feature-text { flex: 1; }
.feature-item .feature-img { flex: 1; }`);
  } else {
    parts.push(`.feature-item { margin-top: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--c-border); }
.feature-item:last-child { border-bottom: none; }`);
  }

  // Painpoint variants
  if (t.blockVariants.painpoint === 'cards') {
    parts.push(`.painpoint-item { background: var(--c-surface); border-radius: var(--card-r); padding: var(--card-pad); margin-top: var(--item-gap); }`);
  } else {
    parts.push(`.painpoint-item { margin-top: 8px; }`);
  }

  // Solution variants
  if (t.blockVariants.solution === 'cards') {
    parts.push(`.solution-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--item-gap); margin-top: 12px; }
.solution-item { background: var(--c-bg); border-radius: var(--card-r); padding: var(--card-pad); ${t.decorations.shadow !== 'none' ? `box-shadow: ${t.decorations.shadow};` : `border: 1px solid var(--c-border);`} }`);
  } else {
    parts.push(`.solution-grid { margin-top: 12px; }
.solution-item { margin-top: var(--item-gap); padding-bottom: var(--item-gap); border-bottom: 1px solid var(--c-border); }
.solution-item:last-child { border-bottom: none; }`);
  }

  // Review variants
  if (t.blockVariants.review === 'quotes') {
    parts.push(`.review-item { position: relative; padding: 16px 16px 16px 28px; margin-top: var(--item-gap); }
.review-item::before { content: '"'; position: absolute; left: 0; top: 8px; font-size: 36px; color: var(--c-primary); opacity: 0.3; line-height: 1; }
.review-text { font-size: var(--body); color: var(--c-text-sub); line-height: var(--lh); font-style: italic; }
.review-author { font-size: var(--small); color: var(--c-text-muted); margin-top: 6px; }`);
  } else {
    parts.push(`.review-item { background: var(--c-surface); border-radius: var(--card-r); padding: var(--card-pad); margin-bottom: 8px; }
.review-text { font-size: var(--body); color: var(--c-text-sub); margin-top: 6px; line-height: var(--lh); }
.review-author { font-size: var(--small); color: var(--c-text-muted); margin-top: 4px; }`);
  }

  // Spec variants
  if (t.blockVariants.spec === 'striped') {
    parts.push(`.spec-row { display: flex; justify-content: space-between; padding: 10px 12px; font-size: var(--body); }
.spec-row:nth-child(odd) { background: var(--c-surface); border-radius: 4px; }
.spec-key { color: var(--c-text-muted); }`);
  } else {
    parts.push(`.spec-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 0.5px solid var(--c-border); font-size: var(--body); }
.spec-key { color: var(--c-text-muted); }`);
  }

  // FAQ variants
  if (t.blockVariants.faq === 'cards') {
    parts.push(`.faq-item { background: var(--c-surface); border-radius: var(--card-r); padding: var(--card-pad); margin-top: var(--item-gap); }
.faq-q { font-size: var(--h3); font-weight: 600; }
.faq-a { font-size: var(--body); color: var(--c-text-sub); margin-top: 6px; line-height: var(--lh); }`);
  } else {
    parts.push(`.faq-item { padding: 12px 0; border-bottom: 0.5px solid var(--c-border); }
.faq-q { font-size: var(--h3); font-weight: 600; }
.faq-a { font-size: var(--body); color: var(--c-text-sub); margin-top: 6px; line-height: var(--lh); }`);
  }

  // Trust variants
  if (t.blockVariants.trust === 'cards') {
    parts.push(`.trust-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: var(--item-gap); margin-top: 16px; }
.trust-item { background: var(--c-bg); border-radius: var(--card-r); padding: var(--card-pad); text-align: center; ${t.decorations.shadow !== 'none' ? `box-shadow: ${t.decorations.shadow};` : `border: 1px solid var(--c-border);`} }`);
  } else {
    parts.push(`.trust-grid { display: flex; justify-content: center; gap: 24px; margin-top: 16px; }
.trust-item { text-align: center; }`);
  }

  // Howto variants
  if (t.blockVariants.howto === 'timeline') {
    parts.push(`.howto-step { display: flex; gap: 16px; margin-top: 16px; position: relative; padding-left: 28px; }
.howto-step::before { content: ''; position: absolute; left: 12px; top: 32px; bottom: -16px; width: 2px; background: var(--c-border); }
.howto-step:last-child::before { display: none; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--c-primary); color: var(--c-bg); display: flex; align-items: center; justify-content: center; font-size: var(--small); font-weight: 600; flex-shrink: 0; position: absolute; left: 0; }`);
  } else {
    parts.push(`.howto-step { display: flex; gap: 12px; margin-top: 12px; }
.step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--c-surface); color: var(--c-primary); display: flex; align-items: center; justify-content: center; font-size: var(--body); font-weight: 600; flex-shrink: 0; }`);
  }

  // CTA variants
  if (t.blockVariants.cta === 'highlight') {
    parts.push(`.pkg-row { display: flex; gap: 8px; margin-top: 12px; }
.pkg-card { flex: 1; border: 1px solid var(--c-border); border-radius: var(--card-r); padding: var(--card-pad); text-align: center; }
.pkg-card.featured { border: 2px solid var(--c-primary); background: var(--c-surface); position: relative; }
.pkg-card.featured::after { content: 'BEST'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--c-primary); color: var(--c-bg); font-size: 10px; font-weight: 600; padding: 2px 10px; border-radius: 10px; }`);
  } else {
    parts.push(`.pkg-row { display: flex; gap: 8px; margin-top: 12px; }
.pkg-card { flex: 1; border: 1px solid var(--c-border); border-radius: var(--card-r); padding: var(--card-pad); text-align: center; }
.pkg-card.featured { border: 2px solid var(--c-primary); }`);
  }

  // CTA button
  parts.push(`.cta-btn { display: block; width: 100%; padding: 14px; background: var(--c-primary); color: ${isLightColor(t.colors.primary) ? '#000' : '#fff'}; border: none; border-radius: var(--card-r); font-size: 16px; font-weight: 600; text-align: center; cursor: pointer; margin-top: 12px; }`);

  // Stars
  parts.push(`.stars { color: #EF9F27; font-size: 14px; }`);

  // Q badge
  parts.push(`.q-badge { display: inline-flex; width: 28px; height: 28px; border-radius: 50%; background: var(--c-surface); color: var(--c-primary); align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 8px; flex-shrink: 0; }`);

  return parts.join('\n');
}

// Utility styles
function generateUtilityStyles(t: ThemeDefinition): string {
  const parts: string[] = [];

  // Divider
  if (t.decorations.divider === 'gradient') {
    parts.push(`.divider { height: 1px; background: linear-gradient(to right, transparent, var(--c-border), transparent); margin: 4px 0; }`);
  } else if (t.decorations.divider === 'line') {
    parts.push(`.divider { height: 0.5px; background: var(--c-border); }`);
  }

  // Compare table
  parts.push(`table { width: 100%; font-size: var(--body); border-collapse: collapse; }
th { text-align: center; padding: 8px; color: var(--c-text-muted); }
th:first-child { text-align: left; }
td { text-align: center; padding: 8px; }
td:first-child { text-align: left; color: var(--c-text-muted); }
tr + tr { border-top: 1px solid var(--c-border); }`);

  return parts.join('\n');
}

// Helper: 밝은 색인지 판단 (CTA 버튼 텍스트 색상용)
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}
