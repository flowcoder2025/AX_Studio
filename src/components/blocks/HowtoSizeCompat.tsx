import { HowtoData, SizeGuideData, CompatibilityData } from '@/types/block';

export function HowtoBlock({ data }: { data: HowtoData }) {
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">{data.title || '사용 방법'}</h2>
      <div className="space-y-4">
        {(data.steps || []).map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[13px] font-medium flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">{step.title}</p>
              <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{step.description}</p>
              {step.imageUrl ? (
                <img src={step.imageUrl} alt={step.title} className="w-full rounded-lg mt-2" />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SizeGuideBlock({ data }: { data: SizeGuideData }) {
  return (
    <section className="bg-gray-50 px-6 py-8">
      <h2 className="text-[17px] font-medium mb-2">사이즈 가이드</h2>
      {data.modelInfo && (
        <p className="text-[12px] text-gray-500 mb-3">{data.modelInfo}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-gray-400 font-normal" />
              {(data.headers || []).map((h, i) => (
                <th
                  key={i}
                  className={`text-center p-2 font-medium ${
                    data.highlightColumn === i ? 'bg-blue-50 text-blue-700 rounded-t' : ''
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((row, ri) => (
              <tr key={ri} className="border-t border-gray-200">
                <td className="p-2 text-gray-400">{row.label}</td>
                {row.values.map((val, vi) => (
                  <td
                    key={vi}
                    className={`text-center p-2 ${
                      data.highlightColumn === vi ? 'bg-blue-50 text-blue-700 font-medium' : ''
                    }`}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">단위: cm / 오차범위 1-2cm</p>
    </section>
  );
}

export function CompatibilityBlock({ data }: { data: CompatibilityData }) {
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-3">{data.title || '호환 기기'}</h2>
      <div className="flex flex-wrap gap-2">
        {(data.devices || []).map((d, i) => (
          <span
            key={i}
            className={`text-[11px] px-3 py-1.5 rounded-md border ${
              d.compatible
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-50 text-gray-400 border-gray-200'
            }`}
          >
            {d.name}
          </span>
        ))}
      </div>
      {data.note && (
        <p className="text-[11px] text-gray-400 mt-3">{data.note}</p>
      )}
    </section>
  );
}
