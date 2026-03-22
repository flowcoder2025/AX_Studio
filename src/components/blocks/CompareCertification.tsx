import { CompareData, CertificationData } from '@/types/block';

export function CompareBlock({ data }: { data: CompareData }) {
  const columns = data.columns || (data as any).headers || [];
  const rawRows = data.rows || [];
  const rows = rawRows.map((row: any) => {
    if (Array.isArray(row)) return { label: row[0] || '', values: row.slice(1) };
    return row;
  });

  return (
    <section className="bg-gray-50 px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">{data.title || '비교'}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-gray-400 font-normal" />
              {columns.map((col: string, i: number) => (
                <th
                  key={i}
                  className={`text-center p-2 font-medium ${
                    data.highlightColumn === i
                      ? 'bg-blue-50 text-blue-700 rounded-t-lg'
                      : 'text-gray-600'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, ri: number) => (
              <tr key={ri} className="border-t border-gray-200">
                <td className="p-2 text-gray-400">{row.label}</td>
                {(row.values || []).map((val: string, vi: number) => (
                  <td
                    key={vi}
                    className={`text-center p-2 ${
                      data.highlightColumn === vi
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : ''
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
    </section>
  );
}

export function CertificationBlock({ data }: { data: CertificationData }) {
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">인증 및 수상</h2>
      <div className="flex flex-wrap gap-3">
        {(data.certifications || []).map((cert, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 flex-1 min-w-[140px]">
            {cert.imageUrl ? (
              <img src={cert.imageUrl} alt={cert.name} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-[12px] font-medium">{cert.name}</p>
              {cert.description && (
                <p className="text-[10px] text-gray-400 mt-0.5">{cert.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
