// TrustBlock — 만족도/별점/판매 수치
import { TrustData } from '@/types/block';

export function TrustBlock({ data }: { data: TrustData }) {
  const metrics = data.metrics || [];
  return (
    <section className="bg-gray-50 px-6 py-8 text-center">
      <h2 className="text-[17px] font-medium mb-5">만족도가 다릅니다</h2>
      <div className="flex justify-center gap-8">
        {metrics.map((m, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl font-semibold">{m.value}</div>
            <div className="text-[11px] text-gray-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ReviewBlock — 실사용 후기
import { ReviewData } from '@/types/block';

export function ReviewBlock({ data }: { data: ReviewData }) {
  const reviews = data.reviews || (data as any).items || [];
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">실사용 후기</h2>
      <div className="space-y-3">
        {reviews.map((r: any, i: number) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4">
            <div className="text-amber-400 text-sm tracking-wider mb-1">
              {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
            </div>
            <p className="text-xs leading-relaxed text-gray-600">"{r.text}"</p>
            <p className="text-[11px] text-gray-400 mt-2">{r.author}{r.meta ? ` · ${r.meta}` : ''}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// VideoBlock — 영상 플레이스홀더 or 실제 영상
import { VideoData } from '@/types/block';

const videoLabels: Record<string, string> = {
  rotate_360: '360° 제품 회전 영상',
  demo: '기능 시연 모션',
  before_after: 'Before → After 변화 영상',
  shortform: '텍스트 + 모션그래픽 숏폼',
};

const videoPipeline: Record<string, string> = {
  rotate_360: 'ComfyUI → Kling API → FFmpeg',
  demo: 'ComfyUI + Kling API → FFmpeg',
  before_after: 'ComfyUI → Kling morph → FFmpeg',
  shortform: 'Claude 카피 → FFmpeg 모션',
};

export function VideoBlock({ data }: { data: VideoData }) {
  if (data.videoUrl) {
    return (
      <section className="px-6 py-4">
        <video
          src={data.videoUrl}
          controls
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-lg"
          poster={data.thumbnailUrl}
        />
        {data.caption && (
          <p className="text-xs text-gray-400 text-center mt-2">{data.caption}</p>
        )}
      </section>
    );
  }

  return (
    <section className="px-6 py-4">
      <p className="text-[13px] font-medium text-gray-400 text-center mb-2">
        video — {videoLabels[data.videoType] || data.videoType}
      </p>
      <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50
                      flex items-center justify-center flex-col gap-2 text-gray-300">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span className="text-xs">{videoLabels[data.videoType]}</span>
        <span className="text-[10px] text-gray-300">{videoPipeline[data.videoType]}</span>
      </div>
    </section>
  );
}
