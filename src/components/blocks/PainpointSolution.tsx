import { PainpointData, SolutionData } from '@/types/block';

export function PainpointBlock({ data }: { data: PainpointData }) {
  const items: string[] = data.painpoints
    || ((data as any).items || []).map((it: any) => typeof it === 'string' ? it : it.description || it.title || '');
  return (
    <section className="px-6 py-8">
      <h2 className="text-[17px] font-medium mb-4">{data.title || '이런 고민 있으시죠?'}</h2>
      <div className="space-y-3">
        {items.map((p, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <p className="text-[13px] text-gray-600 leading-relaxed">{p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SolutionBlock({ data }: { data: SolutionData }) {
  const solutions = data.solutions || (data as any).items || [];
  return (
    <section className="bg-gray-50 px-6 py-8">
      <h2 className="text-[17px] font-medium mb-5">{data.title || '이래서 다릅니다'}</h2>
      <div className="grid grid-cols-2 gap-3">
        {solutions.map((s: any, i: number) => (
          <div key={i} className="bg-white rounded-lg p-4">
            {s.icon && (
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-500 mb-2">
                {s.icon}
              </div>
            )}
            <p className="text-[13px] font-medium">{s.title}</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
