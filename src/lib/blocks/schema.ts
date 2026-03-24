// Block Schema — 전체 시스템의 Single Source of Truth
// prompts, regenerate, normalize, html-builder, BlockEditor 모두 이 파일에서 파생

export interface FieldDef {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  label: string;
  itemFields?: FieldDef[];  // type === 'array'일 때 배열 항목의 필드 정의
}

export interface BlockSchema {
  type: string;
  nameKo: string;
  // 정규 키 이름 → 레거시 키 이름들 (정규화 시 사용)
  keyAliases?: Record<string, string[]>;
  // Claude 프롬프트용 JSON 예시
  promptExample: string;
  // 편집 가능 필드 정의
  fields: FieldDef[];
}

// === 블록 스키마 정의 ===

export const BLOCK_SCHEMAS: Record<string, BlockSchema> = {
  hero: {
    type: 'hero',
    nameKo: '히어로',
    promptExample: '{ "headline": "", "subheadline": "", "kpis": [{"value":"", "label":""}] }',
    fields: [
      { key: 'headline', type: 'string', label: '헤드라인' },
      { key: 'subheadline', type: 'string', label: '서브헤드라인' },
      { key: 'kpis', type: 'array', label: 'KPI', itemFields: [
        { key: 'value', type: 'string', label: '수치' },
        { key: 'label', type: 'string', label: '라벨' },
      ]},
    ],
  },
  painpoint: {
    type: 'painpoint',
    nameKo: '페인포인트',
    keyAliases: { painpoints: ['items', 'points'] },
    promptExample: '{ "title": "", "painpoints": ["고민1", "고민2", "고민3"] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'painpoints', type: 'array', label: '고민 목록' },
    ],
  },
  solution: {
    type: 'solution',
    nameKo: '솔루션',
    keyAliases: { solutions: ['items'] },
    promptExample: '{ "title": "", "solutions": [{"icon": "", "title": "", "description": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'solutions', type: 'array', label: '차별화 포인트', itemFields: [
        { key: 'icon', type: 'string', label: '아이콘' },
        { key: 'title', type: 'string', label: '제목' },
        { key: 'description', type: 'string', label: '설명' },
      ]},
    ],
  },
  feature: {
    type: 'feature',
    nameKo: '핵심 기능',
    keyAliases: { features: ['items'] },
    promptExample: '{ "title": "", "features": [{"title": "", "description": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'features', type: 'array', label: '기능', itemFields: [
        { key: 'title', type: 'string', label: '기능명' },
        { key: 'description', type: 'string', label: '설명' },
      ]},
    ],
  },
  ingredient: {
    type: 'ingredient',
    nameKo: '핵심 성분',
    keyAliases: { ingredients: ['items'] },
    promptExample: '{ "title": "", "ingredients": [{"name": "", "amount": "", "benefit": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'ingredients', type: 'array', label: '성분', itemFields: [
        { key: 'name', type: 'string', label: '이름' },
        { key: 'amount', type: 'string', label: '함량' },
        { key: 'benefit', type: 'string', label: '효능' },
      ]},
    ],
  },
  tech: {
    type: 'tech',
    nameKo: '핵심 기술',
    keyAliases: { ingredients: ['items'] },
    promptExample: '{ "title": "", "ingredients": [{"name": "", "amount": "", "benefit": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'ingredients', type: 'array', label: '기술', itemFields: [
        { key: 'name', type: 'string', label: '이름' },
        { key: 'amount', type: 'string', label: '수치' },
        { key: 'benefit', type: 'string', label: '설명' },
      ]},
    ],
  },
  trust: {
    type: 'trust',
    nameKo: '신뢰 지표',
    promptExample: '{ "title": "", "metrics": [{"value": "", "label": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'metrics', type: 'array', label: '지표', itemFields: [
        { key: 'value', type: 'string', label: '수치' },
        { key: 'label', type: 'string', label: '라벨' },
      ]},
    ],
  },
  review: {
    type: 'review',
    nameKo: '실사용 후기',
    keyAliases: { reviews: ['items'] },
    promptExample: '{ "title": "", "reviews": [{"rating": 5, "text": "", "author": "", "meta": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'reviews', type: 'array', label: '후기', itemFields: [
        { key: 'rating', type: 'number', label: '별점 (1-5)' },
        { key: 'text', type: 'string', label: '내용' },
        { key: 'author', type: 'string', label: '작성자' },
        { key: 'meta', type: 'string', label: '메타' },
      ]},
    ],
  },
  spec: {
    type: 'spec',
    nameKo: '제품 사양',
    keyAliases: { specs: ['items'] },
    promptExample: '{ "title": "", "specs": [{"key": "", "value": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'specs', type: 'array', label: '스펙', itemFields: [
        { key: 'key', type: 'string', label: '항목' },
        { key: 'value', type: 'string', label: '값' },
      ]},
    ],
  },
  faq: {
    type: 'faq',
    nameKo: 'FAQ',
    keyAliases: { faqs: ['items'] },
    promptExample: '{ "title": "", "faqs": [{"question": "", "answer": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'faqs', type: 'array', label: 'FAQ', itemFields: [
        { key: 'question', type: 'string', label: '질문' },
        { key: 'answer', type: 'string', label: '답변' },
      ]},
    ],
  },
  howto: {
    type: 'howto',
    nameKo: '사용 방법',
    promptExample: '{ "title": "", "steps": [{"title": "", "description": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'steps', type: 'array', label: '단계', itemFields: [
        { key: 'title', type: 'string', label: '단계명' },
        { key: 'description', type: 'string', label: '설명' },
      ]},
    ],
  },
  cta: {
    type: 'cta',
    nameKo: '구매 CTA',
    promptExample: '{ "title": "", "packages": [{"name": "", "price": "", "description": ""}], "buttonText": "" }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'buttonText', type: 'string', label: '버튼 텍스트' },
      { key: 'packages', type: 'array', label: '패키지', itemFields: [
        { key: 'name', type: 'string', label: '패키지명' },
        { key: 'price', type: 'string', label: '가격' },
        { key: 'description', type: 'string', label: '설명' },
      ]},
    ],
  },
  compare: {
    type: 'compare',
    nameKo: '비교',
    keyAliases: { columns: ['headers'] },
    promptExample: '{ "title": "", "columns": ["제품명", "일반 제품"], "rows": [{"label": "", "values": ["", ""]}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'columns', type: 'array', label: '비교 컬럼' },
      { key: 'highlightColumn', type: 'number', label: '강조 컬럼 (0부터)' },
    ],
  },
  certification: {
    type: 'certification',
    nameKo: '인증/수상',
    promptExample: '{ "title": "", "certifications": [{"name": "", "description": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'certifications', type: 'array', label: '인증', itemFields: [
        { key: 'name', type: 'string', label: '인증명' },
        { key: 'description', type: 'string', label: '설명' },
      ]},
    ],
  },
  size_guide: {
    type: 'size_guide',
    nameKo: '사이즈 가이드',
    promptExample: '{ "title": "", "modelInfo": "", "headers": ["S","M","L"], "rows": [{"label": "", "values": []}], "highlightColumn": 1 }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'modelInfo', type: 'string', label: '모델 정보' },
      { key: 'headers', type: 'array', label: '헤더' },
      { key: 'highlightColumn', type: 'number', label: '강조 컬럼 (0부터)' },
    ],
  },
  compatibility: {
    type: 'compatibility',
    nameKo: '호환성',
    promptExample: '{ "title": "", "devices": [{"name": "", "compatible": true}], "note": "" }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'note', type: 'string', label: '비고' },
      { key: 'devices', type: 'array', label: '호환 기기', itemFields: [
        { key: 'name', type: 'string', label: '기기명' },
        { key: 'compatible', type: 'boolean', label: '호환 여부' },
      ]},
    ],
  },
  styling: {
    type: 'styling',
    nameKo: '코디 제안',
    promptExample: '{ "title": "" }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
    ],
  },
  unboxing: {
    type: 'unboxing',
    nameKo: '구성품',
    promptExample: '{ "title": "", "items": [{"name": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'items', type: 'array', label: '구성품', itemFields: [
        { key: 'name', type: 'string', label: '품목명' },
      ]},
    ],
  },
  recipe: {
    type: 'recipe',
    nameKo: '레시피',
    promptExample: '{ "title": "", "recipes": [{"title": "", "steps": ["단계1"]}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'recipes', type: 'array', label: '레시피', itemFields: [
        { key: 'title', type: 'string', label: '레시피명' },
      ]},
    ],
  },
  pricing: {
    type: 'pricing',
    nameKo: '요금제',
    promptExample: '{ "title": "", "plans": [{"name": "", "price": "", "features": ["기능1"], "featured": false}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'plans', type: 'array', label: '요금제', itemFields: [
        { key: 'name', type: 'string', label: '플랜명' },
        { key: 'price', type: 'string', label: '가격' },
      ]},
    ],
  },
  process: {
    type: 'process',
    nameKo: '제조 공정',
    promptExample: '{ "title": "", "steps": [{"title": "", "description": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'steps', type: 'array', label: '공정 단계', itemFields: [
        { key: 'title', type: 'string', label: '단계명' },
        { key: 'description', type: 'string', label: '설명' },
      ]},
    ],
  },
  material: {
    type: 'material',
    nameKo: '소재',
    promptExample: '{ "title": "", "materials": [{"name": "", "description": ""}] }',
    fields: [
      { key: 'title', type: 'string', label: '제목' },
      { key: 'materials', type: 'array', label: '소재', itemFields: [
        { key: 'name', type: 'string', label: '소재명' },
        { key: 'description', type: 'string', label: '설명' },
      ]},
    ],
  },
};

// === 스키마에서 파생되는 유틸리티 ===

// Claude 프롬프트용 키 구조 목록 생성
export function buildPromptKeyStructures(blockTypes: string[]): string {
  return blockTypes
    .map(type => {
      const schema = BLOCK_SCHEMAS[type];
      if (!schema) return null;
      return `- ${type}: ${schema.promptExample}`;
    })
    .filter(Boolean)
    .join('\n');
}

// 단일 블록 프롬프트용 키 구조
export function getPromptExample(type: string): string {
  return BLOCK_SCHEMAS[type]?.promptExample || '{}';
}

// 블록 데이터 정규화 — 레거시 키를 정규 키로 변환
export function normalizeBlockData(type: string, data: any): any {
  if (!data || typeof data !== 'object') return data;
  const schema = BLOCK_SCHEMAS[type];
  if (!schema?.keyAliases) return data;

  const normalized = { ...data };
  for (const [canonicalKey, aliases] of Object.entries(schema.keyAliases)) {
    if (!normalized[canonicalKey]) {
      for (const alias of aliases) {
        if (normalized[alias]) {
          // painpoint 특수 처리: items가 객체 배열이면 문자열 배열로 변환
          if (type === 'painpoint' && alias !== 'painpoints') {
            const src = normalized[alias];
            normalized[canonicalKey] = Array.isArray(src)
              ? src.map((it: any) => typeof it === 'string' ? it : it.text || it.description || it.title || '')
              : src;
          } else {
            normalized[canonicalKey] = normalized[alias];
          }
          delete normalized[alias];
          break;
        }
      }
    }
  }

  // compare rows 배열→객체 변환
  if (type === 'compare' && normalized.rows?.length && Array.isArray(normalized.rows[0])) {
    normalized.rows = normalized.rows.map((r: any) => ({ label: r[0] || '', values: r.slice(1) }));
  }

  return normalized;
}
