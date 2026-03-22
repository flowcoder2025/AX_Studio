// SpecBlock — 제품 사양 테이블
import { SpecData } from '@/types/block';

export function SpecBlock({ data }: { data: SpecData }) {
  const specs = data.specs || (data as any).items || [];
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">{data.title || '제품 사양'}</h2>
      <div className="divide-y divide-gray-100">
        {specs.map((s: any, i: number) => (
          <div key={i} className="flex justify-between py-2.5 text-[13px]">
            <span className="text-gray-400">{s.key}</span>
            <span>{s.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// FAQBlock — 자주 묻는 질문
import { FAQData } from '@/types/block';

export function FAQBlock({ data }: { data: FAQData }) {
  const faqs = data.faqs || (data as any).items || [];
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">자주 묻는 질문</h2>
      <div className="divide-y divide-gray-100">
        {faqs.map((f: any, i: number) => (
          <div key={i} className="py-3">
            <p className="text-[13px] font-medium">{f.question}</p>
            <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">{f.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// CTABlock — 패키지 구성 + 구매
import { CTAData } from '@/types/block';

export function CTABlock({ data }: { data: CTAData }) {
  const packages = data.packages || [];
  return (
    <section className="bg-gray-50 px-6 py-8">
      <h2 className="text-[17px] font-medium text-center mb-4">패키지 구성</h2>
      <div className="flex gap-3">
        {packages.map((pkg, i) => (
          <div
            key={i}
            className={`flex-1 bg-white rounded-lg p-4 text-center border
              ${pkg.featured ? 'border-blue-500 border-2' : 'border-gray-200'}`}
          >
            {pkg.featured && (
              <span className="text-[10px] text-blue-600 font-medium">BEST</span>
            )}
            <p className="text-[13px] font-medium">{pkg.name}</p>
            <p className="text-lg font-semibold mt-1">{pkg.price}</p>
            <p className="text-[11px] text-gray-400 mt-1">{pkg.description}</p>
          </div>
        ))}
      </div>
      <button className="w-full mt-4 py-3.5 bg-blue-600 text-white rounded-lg text-[15px] font-medium hover:bg-blue-700 transition-colors">
        {data.buttonText || '구매하기'}
      </button>
    </section>
  );
}
