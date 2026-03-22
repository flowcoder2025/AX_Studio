import { RecipeData, PricingData } from '@/types/block';

// Styling block — image-heavy, ComfyUI generated
export function StylingBlock({ data }: { data: { images?: string[]; title?: string } }) {
  const images = data?.images || [];
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-3">{data?.title || '코디 제안'}</h2>
      <div className="flex gap-2">
        {images.length > 0 ? (
          images.map((img, i) => (
            <img key={i} src={img} alt={`styling ${i + 1}`} className="flex-1 rounded-lg object-cover h-48" />
          ))
        ) : (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex-1 h-48 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[11px]">
                <div className="text-center">
                  <svg className="w-5 h-5 mx-auto mb-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                  </svg>
                  스타일 {n}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

// Unboxing block — shows package contents
export function UnboxingBlock({ data }: { data: { items?: { name: string; imageUrl?: string }[] } }) {
  const items = data?.items || [];
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-3">구성품</h2>
      <div className="flex gap-2">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={i} className="flex-1 text-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-20 object-contain rounded-lg bg-gray-50 mb-1" />
              ) : (
                <div className="w-full h-20 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[10px] mb-1">
                  img
                </div>
              )}
              <span className="text-[10px] text-gray-500">{item.name}</span>
            </div>
          ))
        ) : (
          [1, 2, 3, 4].map((n) => (
            <div key={n} className="flex-1 text-center">
              <div className="w-full h-20 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[10px] mb-1">
                img
              </div>
              <span className="text-[10px] text-gray-400">구성품 {n}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// Recipe block — cooking/usage recipes
export function RecipeBlock({ data }: { data: RecipeData }) {
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">활용 레시피</h2>
      {(data.recipes || []).map((recipe, ri) => (
        <div key={ri} className={`${ri > 0 ? 'mt-5 pt-5 border-t border-gray-100' : ''}`}>
          <h3 className="text-[14px] font-medium mb-3">{recipe.title}</h3>
          {recipe.imageUrl && (
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full rounded-lg mb-3" />
          )}
          <ol className="space-y-2">
            {recipe.steps.map((step, si) => (
              <li key={si} className="flex gap-2 text-[12px]">
                <span className="text-blue-500 font-medium flex-shrink-0">{si + 1}.</span>
                <span className="text-gray-600 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

// Pricing block — plan comparison for digital/subscription products
export function PricingBlock({ data }: { data: PricingData }) {
  return (
    <section className="bg-gray-50 px-6 py-8">
      <h2 className="text-[17px] font-medium text-center mb-4">요금제</h2>
      <div className="flex gap-3">
        {(data.plans || []).map((plan, i) => (
          <div
            key={i}
            className={`flex-1 bg-white rounded-lg p-4 text-center border ${
              plan.featured ? 'border-blue-500 border-2' : 'border-gray-200'
            }`}
          >
            {plan.featured && (
              <span className="text-[10px] text-blue-600 font-medium">추천</span>
            )}
            <p className="text-[13px] font-medium mt-1">{plan.name}</p>
            <p className="text-xl font-semibold mt-2">{plan.price}</p>
            <ul className="mt-3 space-y-1.5 text-left">
              {(plan.features || []).map((f, fi) => (
                <li key={fi} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// Process block — manufacturing/production process (image-heavy)
export function ProcessBlock({ data }: { data: { title?: string; steps?: { title: string; imageUrl?: string; description?: string }[] } }) {
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">{data?.title || '제조 공정'}</h2>
      <div className="space-y-4">
        {(data?.steps || []).map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-[11px] font-medium flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">{step.title}</p>
              {step.description && (
                <p className="text-[12px] text-gray-500 mt-1">{step.description}</p>
              )}
              {step.imageUrl ? (
                <img src={step.imageUrl} alt={step.title} className="w-full rounded-lg mt-2" />
              ) : (
                <div className="w-full h-32 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[11px] mt-2">
                  공정 이미지 — ComfyUI
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Material block — fabric/material info for fashion/furniture
export function MaterialBlock({ data }: { data: { title?: string; materials?: { name: string; description: string }[]; imageUrl?: string } }) {
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-3">{data?.title || '소재 / 원단'}</h2>
      {data?.imageUrl ? (
        <img src={data.imageUrl} alt="material" className="w-full rounded-lg mb-3" />
      ) : (
        <div className="w-full h-32 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[11px] mb-3">
          소재 클로즈업 이미지
        </div>
      )}
      <div className="space-y-2">
        {(data?.materials || []).map((m, i) => (
          <div key={i}>
            <p className="text-[13px] font-medium">{m.name}</p>
            <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{m.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
