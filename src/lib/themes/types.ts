// Theme Type Definitions — 테마 모듈의 기반 타입
// 이 파일은 외부 의존성 없음 (순수 타입)

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;       // 카드/섹션 배경
  surfaceAlt: string;    // 교대 섹션 배경 (solution, compare 등)
  text: string;
  textSub: string;       // 부제, 설명 텍스트
  textMuted: string;     // 라벨, 메타 텍스트
  border: string;
}

export interface ThemeTypography {
  fontFamily: string;
  h1: string;
  h2: string;
  h3: string;
  body: string;
  small: string;
  lineHeight: string;
  headingWeight: number;
}

export interface ThemeSpacing {
  sectionPadding: string;
  itemGap: string;
  cardPadding: string;
}

export interface ThemeDecorations {
  cardRadius: string;
  sectionRadius: string;
  divider: 'line' | 'gradient' | 'none';
  badge: 'pill' | 'square' | 'outline';
  shadow: string;
}

export type HeroVariant = 'centered' | 'left';
export type FeatureVariant = 'cards' | 'list' | 'alternating';
export type PainpointVariant = 'bullets' | 'cards';
export type SolutionVariant = 'cards' | 'list';
export type ReviewVariant = 'cards' | 'quotes';
export type SpecVariant = 'table' | 'striped';
export type FaqVariant = 'list' | 'cards';
export type TrustVariant = 'row' | 'cards';
export type HowtoVariant = 'steps' | 'timeline';
export type CtaVariant = 'cards' | 'highlight';
export type CompareVariant = 'table' | 'cards';

export interface ThemeBlockVariants {
  hero: HeroVariant;
  feature: FeatureVariant;
  painpoint: PainpointVariant;
  solution: SolutionVariant;
  review: ReviewVariant;
  spec: SpecVariant;
  faq: FaqVariant;
  trust: TrustVariant;
  howto: HowtoVariant;
  cta: CtaVariant;
  compare: CompareVariant;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  tone: string;            // Claude 카피 톤 지시
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  decorations: ThemeDecorations;
  blockVariants: ThemeBlockVariants;
}
