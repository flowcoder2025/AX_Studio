import { HeroData } from '@/types/block';

interface HeroBlockProps {
  data: HeroData;
  style: 'dark' | 'light' | 'pastel' | 'warm';
}

const bgStyles = {
  dark: 'bg-[#0a0a0a] text-white',
  light: 'bg-white text-gray-900',
  pastel: 'bg-[#f0eef8] text-gray-900',
  warm: 'bg-[#fdf6ee] text-gray-900',
};

const kpiColors = {
  dark: 'text-blue-400',
  light: 'text-blue-600',
  pastel: 'text-purple-600',
  warm: 'text-amber-600',
};

export default function HeroBlock({ data, style }: HeroBlockProps) {
  return (
    <section className={`${bgStyles[style]} px-6 py-10`}>
      {data.subheadline && (
        <p className={`text-xs ${style === 'dark' ? 'text-gray-500' : 'text-gray-400'} mb-1`}>
          {data.subheadline}
        </p>
      )}

      <h1 className="text-[22px] font-semibold leading-tight whitespace-pre-line">
        {data.headline}
      </h1>

      {/* KPI row */}
      {data.kpis?.length > 0 && (
        <div className="flex justify-center gap-6 mt-5">
          {data.kpis.map((kpi, i) => (
            <div key={i} className="text-center">
              <div className={`text-xl font-semibold ${kpiColors[style]}`}>
                {kpi.value}
              </div>
              <div className={`text-[10px] mt-0.5 ${style === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero image placeholder */}
      {data.heroImageUrl ? (
        <img
          src={data.heroImageUrl}
          alt={data.headline}
          className="w-full rounded-lg mt-5 object-cover"
        />
      ) : (
        <div className={`w-full h-56 rounded-lg mt-5 border-2 border-dashed flex items-center justify-center flex-col gap-2
          ${style === 'dark' ? 'border-gray-700 text-gray-600' : 'border-gray-200 text-gray-300'}`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-xs">Hero image — ComfyUI</span>
        </div>
      )}
    </section>
  );
}
