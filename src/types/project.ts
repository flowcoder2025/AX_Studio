import { CategoryId } from '@/lib/templates/categories';
import { BlockDefinition } from './block';

export type Language = 'ko' | 'en' | 'zh';

export interface Project {
  id: string;
  name: string;
  category: CategoryId;
  mode: 'simple' | 'detailed' | 'remake';
  status: 'draft' | 'generating' | 'complete' | 'error';
  blocks: BlockDefinition[];
  input: ProjectInput;
  output?: ProjectOutput;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectInput {
  productName: string;
  productImages: string[];
  keyFeatures?: string;
  price?: string;
  targetAudience?: string;
  specSheet?: Record<string, string>;
  reviews?: { rating: number; text: string }[];
  certifications?: string[];
  priceOptions?: { name: string; price: string; description: string }[];
  sourceUrl?: string;
  languages?: Language[];
}

export interface ProjectOutput {
  htmlPath?: string;
  imagePaths: Record<string, string>;  // platform → path
  videoPaths: string[];
  generatedAt: number;
}
