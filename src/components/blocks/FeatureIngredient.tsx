import { FeatureData, IngredientData } from '@/types/block';

export function FeatureBlock({ data }: { data: FeatureData }) {
  const features = data.features || (data as any).items || [];
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">{data.title || '핵심 기능'}</h2>
      <div className="space-y-5">
        {features.map((f: any, i: number) => (
          <div key={i}>
            {f.imageUrl ? (
              <img src={f.imageUrl} alt={f.title} className="w-full rounded-lg mb-3" />
            ) : (
              <div className="w-full h-44 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50
                flex items-center justify-center text-gray-300 text-xs mb-3">
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  기능 이미지 — ComfyUI
                </div>
              </div>
            )}
            <h3 className="text-[14px] font-medium">{f.title}</h3>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function IngredientBlock({ data, title }: { data: IngredientData; title?: string }) {
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">{title || data.title || '핵심 성분'}</h2>
      {data.imageUrl ? (
        <img src={data.imageUrl} alt="ingredient" className="w-full rounded-lg mb-4" />
      ) : (
        <div className="w-full h-36 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50
          flex items-center justify-center text-gray-300 text-xs mb-4">
          성분/기술 이미지
        </div>
      )}
      <div className="space-y-3">
        {(data.ingredients || []).map((ing, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium">{ing.name}</span>
              {ing.amount && (
                <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                  {ing.amount}
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 leading-relaxed">{ing.benefit}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
