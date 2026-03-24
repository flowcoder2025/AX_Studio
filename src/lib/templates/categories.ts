import { BlockType } from '@/types/block';

export type CategoryId =
  | 'grooming' | 'beauty' | 'food' | 'living_appliance'
  | 'living_goods' | 'kids' | 'auto' | 'fashion'
  | 'electronics' | 'pet' | 'sports' | 'kitchen'
  | 'furniture' | 'digital';

export interface CategoryTemplate {
  id: CategoryId;
  name: string;
  nameKo: string;
  subcategories: string;
  tone: string[];
  heroStyle: 'dark' | 'light' | 'pastel' | 'warm';
  blockOrder: BlockType[];
  videoSlots: string[];
  notes: string;
}

export const CATEGORIES: Record<CategoryId, CategoryTemplate> = {
  grooming: {
    id: 'grooming',
    name: 'Grooming',
    nameKo: '그루밍',
    subcategories: '면도기 / 트리머 / 미용기기',
    tone: ['프리미엄', '기술력', '남성타겟'],
    heroStyle: 'dark',
    blockOrder: [
      'hero', 'painpoint', 'solution', 'feature',
      'tech', 'trust', 'review', 'spec',
      'faq', 'howto', 'cta'
    ],
    videoSlots: ['360° 제품 회전', '면도 시연 모션', '텍스트 모션그래픽'],
    notes: '다크 톤 히어로, 스펙 강조, 남성 타겟 카피',
  },

  beauty: {
    id: 'beauty',
    name: 'Beauty',
    nameKo: '뷰티',
    subcategories: '스킨케어 / 메이크업 / 헤어',
    tone: ['클린', '수분감', '여성타겟'],
    heroStyle: 'pastel',
    blockOrder: [
      'hero', 'painpoint', 'solution', 'ingredient', 'feature',
      'trust', 'review', 'compare', 'howto',
      'spec', 'certification', 'faq', 'cta'
    ],
    videoSlots: ['Before→After 변화', '성분 설명 모션', '텍스트 숏폼'],
    notes: '라이트 파스텔 톤, 성분 깊이 강조, Before→After 필수',
  },

  food: {
    id: 'food',
    name: '건강식품',
    nameKo: '건강식품',
    subcategories: '프로바이오틱스 / 비타민 / 건강즙',
    tone: ['신뢰', '건강', '자연'],
    heroStyle: 'light',
    blockOrder: [
      'hero', 'trust', 'review', 'ingredient', 'process',
      'certification', 'feature', 'compare',
      'howto', 'spec', 'faq', 'cta'
    ],
    videoSlots: ['제조 공정 영상', '성분 설명 모션'],
    notes: '신뢰 지표 상단 배치, 인증/GMP 강조, 성분 함량 상세',
  },

  living_appliance: {
    id: 'living_appliance',
    name: '생활가전',
    nameKo: '생활가전',
    subcategories: '청소기 / 공기청정기 / 건조기',
    tone: ['스펙', '파워', '실용'],
    heroStyle: 'dark',
    blockOrder: [
      'hero', 'painpoint', 'solution', 'feature',
      'compare', 'trust', 'review', 'spec',
      'howto', 'faq', 'cta'
    ],
    videoSlots: ['360° 회전', '흡입력 시연', '텍스트 숏폼'],
    notes: '스펙 수치 대형 표시, 경쟁사 비교 테이블, 기능 시연 필수',
  },

  living_goods: {
    id: 'living_goods',
    name: '생활용품',
    nameKo: '생활용품',
    subcategories: '세제 / 섬유유연제 / 방향제',
    tone: ['감성', '일상', '부드러움'],
    heroStyle: 'warm',
    blockOrder: [
      'hero', 'trust', 'review', 'painpoint', 'solution',
      'ingredient', 'feature', 'certification',
      'spec', 'faq', 'cta'
    ],
    videoSlots: ['세탁 전후 비교', '텍스처 모션'],
    notes: '감성 카피 중심, 향 설명 특화, 대용량 번들 CTA',
  },

  kids: {
    id: 'kids',
    name: '유아용품',
    nameKo: '유아용품',
    subcategories: '로션 / 세정제 / 기저귀 / 이유식',
    tone: ['안전', '순한', '엄마타겟'],
    heroStyle: 'warm',
    blockOrder: [
      'hero', 'trust', 'review', 'painpoint', 'solution',
      'ingredient', 'certification', 'feature', 'howto',
      'spec', 'faq', 'cta'
    ],
    videoSlots: ['사용 장면 모션'],
    notes: '안전/인증 최우선, EWG 등급 표시, 부모 신뢰 카피',
  },

  auto: {
    id: 'auto',
    name: '자동차용품',
    nameKo: '자동차용품',
    subcategories: '충전기 / 거치대 / 세차용품',
    tone: ['실용', '호환성', '운전'],
    heroStyle: 'dark',
    blockOrder: [
      'hero', 'painpoint', 'solution', 'feature',
      'compare', 'trust', 'review', 'spec', 'howto', 'faq', 'cta'
    ],
    videoSlots: ['설치 시연 모션', '대시보드 장착 360°'],
    notes: '호환성 테이블 필수, 설치 가이드 상세, 차량 내부 연출',
  },

  fashion: {
    id: 'fashion',
    name: '패션/의류',
    nameKo: '패션/의류',
    subcategories: '의류 / 신발 / 가방 / 악세서리',
    tone: ['스타일', '핏감', '트렌드'],
    heroStyle: 'light',
    blockOrder: [
      'hero', 'feature', 'material', 'size_guide',
      'styling', 'trust', 'review', 'spec', 'faq', 'cta'
    ],
    videoSlots: ['360° 착용 회전', '코디 제안 숏폼'],
    notes: '사이즈 가이드 필수, 착용샷 T2I 활용, 컬러 바리에이션',
  },

  electronics: {
    id: 'electronics',
    name: '전자기기/IT',
    nameKo: '전자기기/IT',
    subcategories: '이어폰 / 키보드 / 모니터 / 태블릿',
    tone: ['테크', '디테일', '비교'],
    heroStyle: 'dark',
    blockOrder: [
      'hero', 'feature', 'compare',
      'tech', 'trust', 'review', 'compatibility', 'spec',
      'unboxing', 'faq', 'cta'
    ],
    videoSlots: ['360° 회전', '기능 시연', '스펙 비교 숏폼'],
    notes: '스펙 비교 테이블 대형, 호환성 필수, 언박싱 구성품',
  },

  pet: {
    id: 'pet',
    name: '반려동물',
    nameKo: '반려동물',
    subcategories: '사료 / 간식 / 용품 / 영양제',
    tone: ['사랑', '안전', '건강'],
    heroStyle: 'warm',
    blockOrder: [
      'hero', 'painpoint', 'ingredient', 'certification', 'feature',
      'trust', 'review', 'compare', 'howto',
      'spec', 'faq', 'cta'
    ],
    videoSlots: ['급여 시연 모션', '성분 설명'],
    notes: '성분 안전성 최우선, 급여량 가이드, 정기구독 CTA',
  },

  sports: {
    id: 'sports',
    name: '스포츠/피트니스',
    nameKo: '스포츠/피트니스',
    subcategories: '운동기구 / 웨어 / 보충제 / 매트',
    tone: ['액티브', '성과', '도전'],
    heroStyle: 'dark',
    blockOrder: [
      'hero', 'painpoint', 'solution', 'feature',
      'trust', 'review', 'spec', 'howto',
      'faq', 'cta'
    ],
    videoSlots: ['운동 시연', 'Before→After 체형', '운동 숏폼'],
    notes: '액션 영상 중심, Before→After 체형 변화, 운동 가이드',
  },

  kitchen: {
    id: 'kitchen',
    name: '주방/조리',
    nameKo: '주방/조리',
    subcategories: '조리도구 / 밀키트 / 식기 / 소형가전',
    tone: ['맛있는', '편리', '홈쿡'],
    heroStyle: 'warm',
    blockOrder: [
      'hero', 'painpoint', 'solution', 'feature',
      'recipe', 'trust', 'review', 'spec', 'howto', 'faq', 'cta'
    ],
    videoSlots: ['조리 시연 모션', '레시피 숏폼'],
    notes: '조리 시연 영상 핵심, 레시피 블록 특화, 세척 편의성',
  },

  furniture: {
    id: 'furniture',
    name: '가구/인테리어',
    nameKo: '가구/인테리어',
    subcategories: '의자 / 책상 / 수납 / 조명',
    tone: ['공간', '디자인', '실용'],
    heroStyle: 'light',
    blockOrder: [
      'hero', 'feature', 'material', 'size_guide',
      'styling', 'trust', 'review', 'howto', 'spec', 'faq', 'cta'
    ],
    videoSlots: ['360° 회전', '공간 배치 연출'],
    notes: '공간 연출 T2I 핵심, 치수 가이드 필수, 조립 가이드',
  },

  digital: {
    id: 'digital',
    name: '디지털/구독',
    nameKo: '디지털/구독',
    subcategories: '앱 / SaaS / 온라인강의 / 멤버십',
    tone: ['효율', '성장', '가치'],
    heroStyle: 'light',
    blockOrder: [
      'hero', 'painpoint', 'solution', 'feature',
      'pricing', 'trust', 'review', 'faq', 'cta'
    ],
    videoSlots: ['서비스 시연', '소개 숏폼'],
    notes: 'UI 스크린샷 중심, 요금제 비교 특화, 무료체험 CTA',
  },
};

export const getCategoryList = () => Object.values(CATEGORIES);

export const getCategoryById = (id: CategoryId) => CATEGORIES[id];
