import { BlockDefinition, BlockType } from '@/types/block';
import HeroBlock from './HeroBlock';
import { TrustBlock, ReviewBlock, VideoBlock } from './TrustReviewVideo';
import { SpecBlock, FAQBlock, CTABlock } from './SpecFaqCta';
import { PainpointBlock, SolutionBlock } from './PainpointSolution';
import { FeatureBlock, IngredientBlock } from './FeatureIngredient';
import { CompareBlock, CertificationBlock } from './CompareCertification';
import { HowtoBlock, SizeGuideBlock, CompatibilityBlock } from './HowtoSizeCompat';
import { StylingBlock, UnboxingBlock, RecipeBlock, PricingBlock, ProcessBlock, MaterialBlock } from './ExtraBlocks';

export function renderBlock(block: BlockDefinition, heroStyle: 'dark' | 'light' | 'pastel' | 'warm' = 'dark') {
  const { type, data } = block;
  switch (type) {
    case 'hero': return <HeroBlock data={data as any} style={heroStyle} />;
    case 'painpoint': return <PainpointBlock data={data as any} />;
    case 'solution': return <SolutionBlock data={data as any} />;
    case 'feature': return <FeatureBlock data={data as any} />;
    case 'ingredient': return <IngredientBlock data={data as any} />;
    case 'tech': return <IngredientBlock data={data as any} title="핵심 기술" />;
    case 'trust': return <TrustBlock data={data as any} />;
    case 'review': return <ReviewBlock data={data as any} />;
    case 'spec': return <SpecBlock data={data as any} />;
    case 'faq': return <FAQBlock data={data as any} />;
    case 'howto': return <HowtoBlock data={data as any} />;
    case 'cta': return <CTABlock data={data as any} />;
    case 'video_360': return <VideoBlock data={{ videoType: 'rotate_360', ...data } as any} />;
    case 'video_demo': return <VideoBlock data={{ videoType: 'demo', ...data } as any} />;
    case 'video_ba': return <VideoBlock data={{ videoType: 'before_after', ...data } as any} />;
    case 'video_short': return <VideoBlock data={{ videoType: 'shortform', ...data } as any} />;
    case 'compare': return <CompareBlock data={data as any} />;
    case 'certification': return <CertificationBlock data={data as any} />;
    case 'size_guide': return <SizeGuideBlock data={data as any} />;
    case 'compatibility': return <CompatibilityBlock data={data as any} />;
    case 'styling': return <StylingBlock data={data as any} />;
    case 'unboxing': return <UnboxingBlock data={data as any} />;
    case 'recipe': return <RecipeBlock data={data as any} />;
    case 'pricing': return <PricingBlock data={data as any} />;
    case 'process': return <ProcessBlock data={data as any} />;
    case 'material': return <MaterialBlock data={data as any} />;
    default:
      return <section className="px-6 py-6"><div className="w-full py-8 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-sm">{type} block</div></section>;
  }
}

export function getSourceBadge(type: BlockType): { label: string; className: string } {
  const map: Partial<Record<BlockType, { label: string; className: string }>> = {
    video_360: { label: 'ComfyUI + Kling', className: 'badge-coral' },
    video_demo: { label: 'ComfyUI + Kling', className: 'badge-coral' },
    video_ba: { label: 'ComfyUI + Kling', className: 'badge-coral' },
    video_short: { label: 'FFmpeg', className: 'badge-amber' },
    styling: { label: 'ComfyUI', className: 'badge-coral' },
    unboxing: { label: 'ComfyUI', className: 'badge-coral' },
    process: { label: 'ComfyUI', className: 'badge-coral' },
    feature: { label: 'Claude + ComfyUI', className: 'badge-blue' },
    hero: { label: 'Claude + ComfyUI', className: 'badge-blue' },
  };
  return map[type] || { label: 'Claude', className: 'badge-blue' };
}

export const BLOCK_NAMES: Record<string, string> = {
  hero: '히어로', painpoint: '페인포인트', solution: '솔루션', feature: '핵심 기능',
  ingredient: '성분', tech: '기술', trust: '신뢰 지표', review: '후기',
  spec: '제품 사양', faq: 'FAQ', howto: '사용법', video_360: '360° 영상',
  video_demo: '기능 시연', video_ba: 'Before→After', video_short: '텍스트 숏폼',
  compare: '비교', certification: '인증', cta: '구매 CTA', size_guide: '사이즈 가이드',
  styling: '코디 제안', compatibility: '호환성', unboxing: '구성품', recipe: '레시피',
  pricing: '요금제', process: '제조 공정', material: '소재',
};
