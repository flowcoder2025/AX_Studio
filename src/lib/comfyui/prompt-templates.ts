// ComfyUI 프롬프트 템플릿 — 카테고리별 사전 검증된 프롬프트
// Claude는 {product} 변수만 채우고, 나머지는 템플릿이 제어

export interface CategoryPromptTemplate {
  t2i: {
    positive: string;
    negative: string;
  };
  beforeAfter: {
    before: string;
    after: string;
    negative: string;
  };
  featureDemo: {
    background: string;
    negative: string;
  };
  background: {
    positive: string;
    negative: string;
  };
}

// {product} — Claude가 생성하는 제품 묘사 (예: "a sleek black electric shaver with 6D rotating head")
// {scene} — Claude가 생성하는 씬 묘사 (예: "modern bathroom counter")

export const PROMPT_TEMPLATES: Record<string, CategoryPromptTemplate> = {
  grooming: {
    t2i: {
      positive: 'professional product photo of {product}, sleek modern design, dark matte background, dramatic studio lighting, high quality, 4k, commercial photography, centered composition',
      negative: 'blurry, low quality, watermark, text, logo, distorted, cartoon, anime, painting, multiple objects, cluttered background',
    },
    beforeAfter: {
      before: 'close-up portrait of a man with heavy stubble and unshaved beard, rough skin texture, tired look, morning natural light, realistic photography, shallow depth of field',
      after: 'close-up portrait of the same man with perfectly clean-shaved smooth face, fresh healthy glowing skin, no stubble, confident smile, morning natural light, realistic photography, shallow depth of field',
      negative: 'blurry, cartoon, anime, painting, watermark, text, deformed face, extra fingers, bad anatomy',
    },
    featureDemo: {
      background: 'modern minimalist bathroom counter, dark marble surface, soft warm lighting, premium grooming setup, clean and elegant, product showcase environment',
      negative: 'blurry, text, watermark, low quality, cluttered, ugly, people',
    },
    background: {
      positive: 'abstract dark gradient background with subtle metallic silver accents, premium masculine aesthetic, soft spotlight from above, product showcase backdrop, minimalist',
      negative: 'text, watermark, object, product, person, busy, cluttered, colorful',
    },
  },

  beauty: {
    t2i: {
      positive: 'professional product photo of {product}, elegant feminine design, soft pastel background, beauty studio lighting, high quality, 4k, cosmetics commercial photography',
      negative: 'blurry, low quality, watermark, text, logo, distorted, cartoon, dark, masculine',
    },
    beforeAfter: {
      before: 'close-up portrait of a woman with dull dry skin, visible pores, uneven skin tone, no makeup, flat lighting, realistic photography',
      after: 'close-up portrait of the same woman with dewy glowing hydrated skin, even skin tone, radiant complexion, soft beauty lighting, realistic photography',
      negative: 'blurry, cartoon, anime, painting, watermark, text, deformed face, bad anatomy',
    },
    featureDemo: {
      background: 'elegant vanity table with soft pink marble surface, warm diffused lighting, luxury skincare setting, bokeh background, clean feminine aesthetic',
      negative: 'blurry, text, watermark, low quality, cluttered, dark, masculine',
    },
    background: {
      positive: 'abstract soft gradient background with pastel pink and cream tones, gentle glow, beauty product showcase backdrop, clean minimalist',
      negative: 'text, watermark, object, product, person, busy, dark, harsh',
    },
  },

  food: {
    t2i: {
      positive: 'professional food product photo of {product}, appetizing presentation, natural warm lighting, wooden surface, high quality, 4k, food commercial photography',
      negative: 'blurry, low quality, watermark, text, distorted, artificial looking, plastic, unappetizing',
    },
    beforeAfter: {
      before: 'person looking tired and sluggish, pale complexion, low energy posture, dull expression, indoor natural light, realistic photography',
      after: 'same person looking energetic and vibrant, healthy glowing complexion, confident posture, bright expression, indoor natural light, realistic photography',
      negative: 'blurry, cartoon, anime, painting, watermark, text, deformed, bad anatomy',
    },
    featureDemo: {
      background: 'clean modern kitchen counter, natural morning light through window, fresh ingredients around, healthy lifestyle setting, warm tones',
      negative: 'blurry, text, watermark, low quality, cluttered, dark, dirty',
    },
    background: {
      positive: 'abstract warm gradient background with natural green and earth tones, organic texture, health food showcase backdrop, clean fresh feeling',
      negative: 'text, watermark, object, product, person, busy, artificial, cold',
    },
  },

  living_appliance: {
    t2i: {
      positive: 'professional product photo of {product}, modern industrial design, clean white background, studio lighting with soft shadows, high quality, 4k, home appliance commercial',
      negative: 'blurry, low quality, watermark, text, distorted, cartoon, cluttered background',
    },
    beforeAfter: {
      before: 'dirty dusty living room floor with visible debris and pet hair, messy carpet, dull surface, realistic indoor photography',
      after: 'same living room with perfectly clean spotless floor, pristine carpet, shiny surface, fresh and tidy, realistic indoor photography',
      negative: 'blurry, cartoon, anime, painting, watermark, text, different room',
    },
    featureDemo: {
      background: 'modern bright living room interior, clean hardwood floor, natural daylight, minimalist Scandinavian design, home appliance showcase',
      negative: 'blurry, text, watermark, low quality, dark, cluttered, old fashioned',
    },
    background: {
      positive: 'abstract clean gradient background with cool gray and white tones, subtle geometric lines, technology product showcase backdrop, modern minimalist',
      negative: 'text, watermark, object, product, person, busy, colorful, warm',
    },
  },

  electronics: {
    t2i: {
      positive: 'professional product photo of {product}, high-tech modern design, dark background with blue accent lighting, studio photography, high quality, 4k, tech commercial',
      negative: 'blurry, low quality, watermark, text, distorted, cartoon, old, cheap looking',
    },
    beforeAfter: {
      before: 'cluttered messy desk with tangled cables, old devices, disorganized workspace, dim lighting, realistic photography',
      after: 'same desk perfectly organized with clean cable management, modern setup, organized workspace, good lighting, realistic photography',
      negative: 'blurry, cartoon, anime, painting, watermark, text, different desk',
    },
    featureDemo: {
      background: 'modern tech workspace with dark desk surface, RGB ambient lighting, clean minimal setup, premium gadget display environment',
      negative: 'blurry, text, watermark, low quality, cluttered, old, cheap',
    },
    background: {
      positive: 'abstract dark gradient background with neon blue and purple accents, futuristic tech aesthetic, subtle grid pattern, electronics showcase backdrop',
      negative: 'text, watermark, object, product, person, busy, warm tones, organic',
    },
  },
};

// 카테고리 ID → 템플릿 매핑 (없는 카테고리는 가장 가까운 것으로 fallback)
const CATEGORY_MAP: Record<string, string> = {
  grooming: 'grooming',
  beauty: 'beauty',
  food: 'food',
  living_appliance: 'living_appliance',
  living_goods: 'beauty',         // 생활용품 → 뷰티 톤 유사
  baby: 'beauty',                 // 유아용품 → 클린/소프트
  auto: 'living_appliance',       // 자동차용품 → 가전 톤 유사
  fashion: 'beauty',              // 패션 → 뷰티 톤
  electronics: 'electronics',
  pet: 'food',                    // 반려동물 → 건강식품 톤 유사
  sports: 'grooming',             // 스포츠 → 다크/파워
  kitchen: 'food',                // 주방 → 음식 톤
  furniture: 'living_appliance',  // 가구 → 가전 톤
  digital: 'electronics',         // 디지털 → 전자기기 톤
};

export function getPromptTemplate(categoryId: string): CategoryPromptTemplate {
  const key = CATEGORY_MAP[categoryId] || 'grooming';
  return PROMPT_TEMPLATES[key];
}
