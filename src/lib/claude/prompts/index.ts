// Claude prompt templates for AX Studio pipeline

import { CategoryId, getCategoryById } from '@/lib/templates/categories';

// Product analysis prompt — extracts structured data from product info
export function buildAnalysisPrompt(
  productName: string,
  category: CategoryId,
  keyFeatures?: string,
  imageDescriptions?: string[]
): string {
  const cat = getCategoryById(category);
  return `You are a Korean e-commerce product analyst. Analyze this product and extract structured data.

Product: ${productName}
Category: ${cat.nameKo} (${cat.subcategories})
Key features: ${keyFeatures || 'Not provided'}
${imageDescriptions ? `Image descriptions: ${imageDescriptions.join(', ')}` : ''}

Return a JSON object with:
{
  "productSummary": "한줄 요약",
  "targetAudience": "타겟 고객",
  "keySellingPoints": ["포인트1", "포인트2", "포인트3"],
  "painpoints": ["고민1", "고민2", "고민3"],
  "competitiveAdvantages": ["차별화1", "차별화2", "차별화3"],
  "suggestedKpis": [{"value": "수치", "label": "라벨"}],
  "toneRecommendation": "추천 톤/무드",
  "categorySpecificNotes": "카테고리 특화 메모"
}

Respond ONLY with valid JSON, no markdown or explanation.`;
}

// Copy generation prompt — generates all block copy at once
export function buildCopyPrompt(
  productName: string,
  category: CategoryId,
  analysis: any,
  blockTypes: string[],
  languages: string[] = ['ko']
): string {
  const cat = getCategoryById(category);

  const langInstructions = languages.length > 1
    ? `Generate copy in ALL of these languages: ${languages.map(l => ({
        ko: 'Korean (한국어)',
        en: 'English',
        zh: 'Chinese (中文)',
      }[l] || l)).join(', ')}.

Return JSON where each block has sub-keys per language:
{
  "hero": {
    "ko": { "headline": "한국어 헤드라인", ... },
    "en": { "headline": "English headline", ... },
    "zh": { "headline": "中文标题", ... }
  }
}

IMPORTANT: Each language version should be culturally adapted, not just translated.
Korean: 감성적, 한국 소비자 맞춤
English: Direct, benefit-focused
Chinese: 信任导向, 强调品质`
    : `All text in Korean (한국어).

Return a JSON object where each key is the block type and the value is the block data.`;

  return `You are a top e-commerce copywriter. Generate compelling copy for a ${cat.nameKo} product detail page.

Product: ${productName}
Tone: ${cat.tone.join(', ')}
Analysis: ${JSON.stringify(analysis)}

Generate copy for these blocks: ${blockTypes.join(', ')}

${langInstructions}
Follow these rules:
- hero: headline (2 lines max), subheadline, 3 KPIs
- painpoint: title + 3-4 customer pain points
- solution: title + 3-4 differentiators with short descriptions
- feature: title + 2-3 features with title and description
- ingredient/tech: title + 2-3 items with name, amount (if applicable), benefit
- trust: 3 metrics (value + label)
- review: 2-3 realistic reviews with rating, text, author, meta
- spec: title + 6-8 spec key-value pairs
- faq: 3-4 Q&A pairs
- howto: title + 3 steps with title and description
- cta: 1-2 packages with name, price, description + button text
- compare: title + comparison table headers and rows

Respond ONLY with valid JSON.`;
}

// Video script prompt — generates scripts for video blocks
export function buildVideoScriptPrompt(
  productName: string,
  category: CategoryId,
  videoType: 'rotate_360' | 'demo' | 'before_after' | 'shortform',
  productAnalysis: any
): string {
  const cat = getCategoryById(category);

  const typeInstructions: Record<string, string> = {
    rotate_360: `Generate a Kling API prompt for a smooth 360-degree product rotation.
Return: { "klingPrompt": "...", "background": "background description for SDXL", "duration": 4 }`,

    demo: `Generate a feature demo motion script. Each scene shows one key feature.
Return: { "scenes": [{ "feature": "기능명", "klingPrompt": "motion description", "backgroundPrompt": "SDXL background", "overlayText": "화면 텍스트", "duration": 4 }] }`,

    before_after: `Generate before/after image prompts specific to ${cat.nameKo}.
Return: { "beforePrompt": "SDXL prompt for problem state", "afterPrompt": "SDXL prompt for improved state", "klingMorphPrompt": "morph transition description", "beforeLabel": "BEFORE 텍스트", "afterLabel": "AFTER 텍스트" }`,

    shortform: `Generate a text motion graphics shortform script (15-30 seconds).
Return: { "scenes": [{ "text": "화면 텍스트", "kpiValue": null or number, "kpiLabel": null or "라벨", "animation": "fade|slide|zoom", "duration": 4, "backgroundPrompt": "SDXL abstract bg" }], "totalDuration": 20, "aspectRatio": "9:16" }`,
  };

  return `You are a Korean e-commerce video director. Create a ${videoType} video script.

Product: ${productName}
Category: ${cat.nameKo}
Tone: ${cat.tone.join(', ')}
Analysis: ${JSON.stringify(productAnalysis)}

${typeInstructions[videoType]}

Respond ONLY with valid JSON.`;
}

// Remake analysis prompt — analyzes existing product page for remaking
export function buildRemakeAnalysisPrompt(
  texts: string[],
  imageUrls: string[]
): string {
  return `You are an e-commerce detail page analyst. Analyze this existing product page content.

Extracted text (from the page):
${texts.slice(0, 100).join('\n')}

Number of images found: ${imageUrls.length}

Analyze and return JSON:
{
  "productName": "제품명",
  "category": "추천 카테고리 (grooming/beauty/food/living_appliance/living_goods/baby/auto/fashion/electronics/pet/sports/kitchen/furniture/digital)",
  "keyFeatures": "핵심 특징",
  "existingBlocks": ["hero", "feature", ...],
  "missingBlocks": ["video_360", ...],
  "improvements": ["개선점1", "개선점2"],
  "specs": { "항목": "값" },
  "toneAnalysis": "현재 톤 분석",
  "remakeStrategy": "리메이크 전략 요약"
}

Respond ONLY with valid JSON.`;
}

// Excel parsing assist prompt — structures raw data from spec sheets
export function buildExcelParsingPrompt(rawData: Record<string, any>[]): string {
  return `You are a product data parser. This is raw data extracted from a Korean e-commerce product spec sheet.

Raw data (first 20 rows):
${JSON.stringify(rawData.slice(0, 20), null, 2)}

Parse this into structured product data. Return JSON:
{
  "productName": "제품명",
  "specs": { "항목": "값", ... },
  "reviews": [{ "rating": 5, "text": "..." }] or null,
  "certifications": ["인증1"] or null,
  "priceOptions": [{ "name": "옵션명", "price": "가격", "description": "설명" }] or null,
  "keyFeatures": "핵심 특징 요약"
}

Respond ONLY with valid JSON.`;
}

// Block recommendation prompt — suggests optimal block order
export function buildBlockRecommendationPrompt(
  category: CategoryId,
  productAnalysis: any,
  hasUserImages: boolean
): string {
  const cat = getCategoryById(category);
  return `You are an e-commerce UX expert. Recommend the optimal block order for this product's detail page.

Category: ${cat.nameKo}
Default order: ${cat.blockOrder.join(' → ')}
Has product images: ${hasUserImages}
Analysis: ${JSON.stringify(productAnalysis)}

Should the default order be modified? Consider:
1. Which blocks are most important for this specific product?
2. Should any blocks be removed or reordered?
3. Which video types would work best?

Return: {
  "blockOrder": ["block1", "block2", ...],
  "removedBlocks": ["block"],
  "reasoning": "이유 설명",
  "videoRecommendations": ["video_type1", "video_type2"]
}

Respond ONLY with valid JSON.`;
}
