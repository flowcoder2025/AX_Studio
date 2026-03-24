import { BlockType } from '@/types/block';

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
    image_block: { label: '이미지', className: 'badge-green' },
    video_block: { label: '동영상', className: 'badge-coral' },
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
  image_block: '이미지', video_block: '동영상',
};
