// Block type definitions for AX Studio

export type BlockType =
  | 'hero' | 'painpoint' | 'solution' | 'feature' | 'ingredient'
  | 'tech' | 'trust' | 'review' | 'spec' | 'faq' | 'howto'
  | 'video_360' | 'video_demo' | 'video_ba' | 'video_short'
  | 'compare' | 'certification' | 'cta'
  | 'size_guide' | 'styling' | 'compatibility' | 'unboxing'
  | 'recipe' | 'pricing' | 'process' | 'material'
  | 'image_block' | 'video_block';

export type DataSource = 'claude' | 'comfyui' | 'ffmpeg' | 'puppeteer' | 'user';

export interface BlockStyleOverride {
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  fontWeight?: number;
  bgColor?: string;
  padding?: number;
}

export interface BlockDefinition {
  id: string;
  type: BlockType;
  order: number;
  source: DataSource;
  data: BlockData | Record<string, never>;
  images: string[];
  videos: string[];
  visible: boolean;
  multiLangData?: Record<string, any>;
  activeLanguage?: string;
  // 스타일은 data와 분리 — Claude가 건드릴 수 없음
  style?: BlockStyleOverride;
  elementStyles?: Record<string, BlockStyleOverride>;
}

// Union type for all block data
export type BlockData =
  | HeroData | PainpointData | SolutionData | FeatureData
  | IngredientData | TrustData | ReviewData | SpecData
  | FAQData | HowtoData | VideoData | CompareData
  | CertificationData | CTAData | SizeGuideData
  | CompatibilityData | RecipeData | PricingData
  | ImageBlockData | VideoBlockData
  | StylingData | UnboxingData | ProcessData | MaterialData;

export interface HeroData {
  headline: string;
  subheadline: string;
  kpis: { value: string; label: string }[];
  heroImageUrl?: string;
}

export interface PainpointData {
  title: string;
  painpoints: string[];
}

export interface SolutionData {
  title: string;
  solutions: { icon?: string; title: string; description: string }[];
}

export interface FeatureData {
  title: string;
  features: { title: string; description: string; imageUrl?: string }[];
}

export interface IngredientData {
  title: string;
  ingredients: { name: string; amount?: string; benefit: string }[];
  imageUrl?: string;
}

export interface TrustData {
  title?: string;
  metrics: { value: string; label: string }[];
}

export interface ReviewData {
  title?: string;
  reviews: {
    rating: number;
    text: string;
    author: string;
    meta?: string;
  }[];
}

export interface SpecData {
  title: string;
  specs: { key: string; value: string }[];
}

export interface FAQData {
  title?: string;
  faqs: { question: string; answer: string }[];
}

export interface HowtoData {
  title: string;
  steps: { title: string; description: string; imageUrl?: string }[];
}

export interface VideoData {
  videoType: 'rotate_360' | 'demo' | 'before_after' | 'shortform';
  videoUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
}

export interface CompareData {
  title: string;
  columns: string[];
  rows: { label: string; values: string[] }[];
  highlightColumn?: number;
}

export interface CertificationData {
  title?: string;
  certifications: { name: string; imageUrl?: string; description?: string }[];
}

export interface CTAData {
  title?: string;
  packages: {
    name: string;
    price: string;
    description: string;
    featured?: boolean;
  }[];
  buttonText: string;
}

export interface SizeGuideData {
  modelInfo?: string;
  headers: string[];
  rows: { label: string; values: string[] }[];
  highlightColumn?: number;
}

export interface CompatibilityData {
  title: string;
  devices: { name: string; compatible: boolean }[];
  note?: string;
}

export interface RecipeData {
  recipes: { title: string; steps: string[]; imageUrl?: string }[];
}

export interface PricingData {
  plans: {
    name: string;
    price: string;
    features: string[];
    featured?: boolean;
  }[];
}

export interface ImageBlockData {
  imageUrl?: string;
  caption?: string;
  galleryItemId?: string;
}

export interface VideoBlockData {
  videoUrl?: string;
  caption?: string;
  galleryItemId?: string;
}

export interface StylingData {
  title?: string;
  images?: string[];
}

export interface UnboxingData {
  items?: { name: string; imageUrl?: string }[];
}

export interface ProcessData {
  title?: string;
  steps?: { title: string; description?: string; imageUrl?: string }[];
}

export interface MaterialData {
  title?: string;
  materials?: { name: string; description: string }[];
  imageUrl?: string;
}
