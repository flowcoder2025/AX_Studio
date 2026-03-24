// 블록 편집 폼 필드 렌더러
// page.tsx의 우측 컨텍스트 패널에서 직접 사용

import { BlockType } from '@/types/block';

const EMOJI_PRESETS = [
  '💡', '⚡', '🛡️', '✨', '🎯', '🔧', '📦', '🔋',
  '💪', '❤️', '✅', '🏆', '💎', '🔒', '⭐', '👍',
  '🧴', '💧', '🌿', '🔥', '❄️', '💨', '🌊', '☀️',
  '📱', '🚗', '🏠', '🐾', '🏃', '🍽️', '👶', '💄',
];

function ImageSlot({ label, url, onGalleryPick, onClear }: {
  label: string; url?: string;
  onGalleryPick?: () => void; onClear?: () => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-gray-500">{label}</label>
      {url ? (
        <div className="flex items-center gap-2">
          <img src={url} alt="" className="h-16 rounded border object-contain bg-gray-50" />
          <div className="flex flex-col gap-1">
            {onGalleryPick && <button onClick={onGalleryPick} className="text-[10px] text-blue-600 hover:underline">변경</button>}
            {onClear && <button onClick={onClear} className="text-[10px] text-red-400 hover:underline">제거</button>}
          </div>
        </div>
      ) : (
        <button
          onClick={onGalleryPick}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
        >
          갤러리에서 불러오기
        </button>
      )}
    </div>
  );
}

// Form field renderer per block type — exported for inline panel use
export function renderFormFields(
  type: BlockType,
  data: any,
  update: (path: string, value: any) => void,
  updateArr: (arr: string, idx: number, field: string, value: any) => void,
  addArr: (arr: string, template: any) => void,
  removeArr: (arr: string, idx: number) => void,
  galleryPick?: (field: string) => void,
) {
  switch (type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <Field label="헤드라인" value={data.headline} onChange={(v) => update('headline', v)} multiline />
          <Field label="서브헤드라인" value={data.subheadline} onChange={(v) => update('subheadline', v)} />
          <ArrayField
            label="KPI"
            items={data.kpis || []}
            fields={[{ key: 'value', label: '수치' }, { key: 'label', label: '라벨' }]}
            onUpdate={(i, f, v) => updateArr('kpis', i, f, v)}
            onAdd={() => addArr('kpis', { value: '', label: '' })}
            onRemove={(i) => removeArr('kpis', i)}
          />
          <ImageSlot
            label="히어로 이미지"
            url={data.heroImageUrl}
            onGalleryPick={() => galleryPick?.('heroImageUrl')}
            onClear={() => update('heroImageUrl', undefined)}
          />
        </div>
      );

    case 'painpoint':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <StringArrayField
            label="고민 목록"
            items={data.painpoints || (data.items || []).map((it: any) => typeof it === 'string' ? it : it.description || it.title || '')}
            onChange={(items) => update('painpoints', items)}
          />
        </div>
      );

    case 'solution': {
      const solKey = data.solutions ? 'solutions' : 'items';
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="차별화 포인트"
            items={data[solKey] || []}
            fields={[{ key: 'icon', label: '아이콘 (이모지/텍스트)' }, { key: 'title', label: '제목' }, { key: 'description', label: '설명' }]}
            onUpdate={(i, f, v) => updateArr(solKey, i, f, v)}
            onAdd={() => addArr(solKey, { icon: '', title: '', description: '' })}
            onRemove={(i) => removeArr(solKey, i)}
          />
        </div>
      );
    }

    case 'feature': {
      const featureItems = data.features || data.items || [];
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="기능"
            items={featureItems}
            fields={[{ key: 'title', label: '기능명' }, { key: 'description', label: '설명' }]}
            onUpdate={(i, f, v) => updateArr(data.features ? 'features' : 'items', i, f, v)}
            onAdd={() => addArr(data.features ? 'features' : 'items', { title: '', description: '' })}
            onRemove={(i) => removeArr(data.features ? 'features' : 'items', i)}
          />
          {featureItems.map((item: any, i: number) => (
            <ImageSlot
              key={i}
              label={`${item.title || `기능 ${i + 1}`} 이미지`}
              url={item.imageUrl}
              onGalleryPick={() => galleryPick?.(`${data.features ? 'features' : 'items'}.${i}.imageUrl`)}
              onClear={() => updateArr(data.features ? 'features' : 'items', i, 'imageUrl', undefined)}
            />
          ))}
        </div>
      );
    }

    case 'trust':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="신뢰 지표"
            items={data.metrics || []}
            fields={[{ key: 'value', label: '수치' }, { key: 'label', label: '라벨' }]}
            onUpdate={(i, f, v) => updateArr('metrics', i, f, v)}
            onAdd={() => addArr('metrics', { value: '', label: '' })}
            onRemove={(i) => removeArr('metrics', i)}
          />
        </div>
      );

    case 'review': {
      const revKey = data.reviews ? 'reviews' : 'items';
      return (
        <ArrayField
          label="후기"
          items={data[revKey] || []}
          fields={[
            { key: 'rating', label: '별점 (1-5)', type: 'number' },
            { key: 'text', label: '내용' },
            { key: 'author', label: '작성자' },
            { key: 'meta', label: '메타 (연령/구매인증 등)' },
          ]}
          onUpdate={(i, f, v) => updateArr(revKey, i, f, f === 'rating' ? Number(v) : v)}
          onAdd={() => addArr(revKey, { rating: 5, text: '', author: '', meta: '' })}
          onRemove={(i) => removeArr(revKey, i)}
        />
      );
    }

    case 'spec': {
      const specKey = data.specs ? 'specs' : 'items';
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="스펙"
            items={data[specKey] || []}
            fields={[{ key: 'key', label: '항목' }, { key: 'value', label: '값' }]}
            onUpdate={(i, f, v) => updateArr(specKey, i, f, v)}
            onAdd={() => addArr(specKey, { key: '', value: '' })}
            onRemove={(i) => removeArr(specKey, i)}
          />
        </div>
      );
    }

    case 'faq': {
      const faqKey = data.faqs ? 'faqs' : 'items';
      return (
        <ArrayField
          label="FAQ"
          items={data[faqKey] || []}
          fields={[{ key: 'question', label: '질문' }, { key: 'answer', label: '답변' }]}
          onUpdate={(i, f, v) => updateArr(faqKey, i, f, v)}
          onAdd={() => addArr(faqKey, { question: '', answer: '' })}
          onRemove={(i) => removeArr(faqKey, i)}
        />
      );
    }

    case 'cta':
      return (
        <div className="space-y-4">
          <Field label="버튼 텍스트" value={data.buttonText} onChange={(v) => update('buttonText', v)} />
          <ArrayField
            label="패키지"
            items={data.packages || []}
            fields={[
              { key: 'name', label: '패키지명' },
              { key: 'price', label: '가격' },
              { key: 'description', label: '설명' },
            ]}
            onUpdate={(i, f, v) => updateArr('packages', i, f, v)}
            onAdd={() => addArr('packages', { name: '', price: '', description: '' })}
            onRemove={(i) => removeArr('packages', i)}
          />
        </div>
      );

    case 'howto':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="단계"
            items={data.steps || []}
            fields={[{ key: 'title', label: '단계명' }, { key: 'description', label: '설명' }]}
            onUpdate={(i, f, v) => updateArr('steps', i, f, v)}
            onAdd={() => addArr('steps', { title: '', description: '' })}
            onRemove={(i) => removeArr('steps', i)}
          />
        </div>
      );

    case 'compare': {
      const cols: string[] = data.columns || data.headers || [];
      const rawRows = data.rows || [];
      const rows: { label: string; values: string[] }[] = rawRows.map((r: any) =>
        Array.isArray(r) ? { label: r[0] || '', values: r.slice(1) } : r
      );
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <StringArrayField
            label="비교 컬럼"
            items={cols}
            onChange={(items) => update('columns', items)}
          />
          <CompareRowsEditor
            columns={cols}
            rows={rows}
            onChange={(newRows) => update('rows', newRows)}
          />
          <Field label="강조 컬럼 (0부터)" value={data.highlightColumn} onChange={(v) => update('highlightColumn', Number(v))} type="number" />
        </div>
      );
    }

    case 'certification':
      return (
        <ArrayField
          label="인증/수상"
          items={data.certifications || []}
          fields={[{ key: 'name', label: '인증명' }, { key: 'description', label: '설명' }]}
          onUpdate={(i, f, v) => updateArr('certifications', i, f, v)}
          onAdd={() => addArr('certifications', { name: '', description: '' })}
          onRemove={(i) => removeArr('certifications', i)}
        />
      );

    case 'ingredient':
    case 'tech': {
      const ingKey = data.ingredients ? 'ingredients' : 'items';
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ImageSlot
            label={type === 'tech' ? '기술 이미지' : '성분 이미지'}
            url={data.imageUrl}
            onGalleryPick={() => galleryPick?.('imageUrl')}
            onClear={() => update('imageUrl', undefined)}
          />
          <ArrayField
            label={type === 'tech' ? '기술' : '성분'}
            items={data[ingKey] || []}
            fields={[{ key: 'name', label: '이름' }, { key: 'amount', label: '함량' }, { key: 'benefit', label: '효능' }]}
            onUpdate={(i, f, v) => updateArr(ingKey, i, f, v)}
            onAdd={() => addArr(ingKey, { name: '', amount: '', benefit: '' })}
            onRemove={(i) => removeArr(ingKey, i)}
          />
        </div>
      );
    }

    case 'compatibility':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="호환 기기"
            items={data.devices || []}
            fields={[{ key: 'name', label: '기기명' }, { key: 'compatible', label: '호환 (true/false)' }]}
            onUpdate={(i, f, v) => updateArr('devices', i, f, f === 'compatible' ? v === 'true' : v)}
            onAdd={() => addArr('devices', { name: '', compatible: true })}
            onRemove={(i) => removeArr('devices', i)}
          />
          <Field label="비고" value={data.note} onChange={(v) => update('note', v)} />
        </div>
      );

    case 'size_guide':
      return (
        <div className="space-y-4">
          <Field label="모델 정보" value={data.modelInfo} onChange={(v) => update('modelInfo', v)} />
          <StringArrayField
            label="헤더"
            items={data.headers || []}
            onChange={(items) => update('headers', items)}
          />
          <ArrayField
            label="사이즈 행"
            items={data.rows || []}
            fields={[{ key: 'label', label: '라벨' }]}
            onUpdate={(i, f, v) => updateArr('rows', i, f, v)}
            onAdd={() => addArr('rows', { label: '', values: [] })}
            onRemove={(i) => removeArr('rows', i)}
          />
          <Field label="강조 컬럼 (0부터)" value={data.highlightColumn} onChange={(v) => update('highlightColumn', Number(v))} type="number" />
        </div>
      );

    case 'unboxing':
      return (
        <ArrayField
          label="구성품"
          items={data.items || []}
          fields={[{ key: 'name', label: '품목명' }]}
          onUpdate={(i, f, v) => updateArr('items', i, f, v)}
          onAdd={() => addArr('items', { name: '' })}
          onRemove={(i) => removeArr('items', i)}
        />
      );

    case 'recipe':
      return (
        <ArrayField
          label="레시피"
          items={data.recipes || []}
          fields={[{ key: 'title', label: '레시피명' }]}
          onUpdate={(i, f, v) => updateArr('recipes', i, f, v)}
          onAdd={() => addArr('recipes', { title: '', steps: [] })}
          onRemove={(i) => removeArr('recipes', i)}
        />
      );

    case 'pricing':
      return (
        <ArrayField
          label="요금제"
          items={data.plans || []}
          fields={[{ key: 'name', label: '플랜명' }, { key: 'price', label: '가격' }]}
          onUpdate={(i, f, v) => updateArr('plans', i, f, v)}
          onAdd={() => addArr('plans', { name: '', price: '', features: [], featured: false })}
          onRemove={(i) => removeArr('plans', i)}
        />
      );

    case 'process':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="공정 단계"
            items={data.steps || []}
            fields={[{ key: 'title', label: '단계명' }, { key: 'description', label: '설명' }]}
            onUpdate={(i, f, v) => updateArr('steps', i, f, v)}
            onAdd={() => addArr('steps', { title: '', description: '' })}
            onRemove={(i) => removeArr('steps', i)}
          />
        </div>
      );

    case 'material':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="소재"
            items={data.materials || []}
            fields={[{ key: 'name', label: '소재명' }, { key: 'description', label: '설명' }]}
            onUpdate={(i, f, v) => updateArr('materials', i, f, v)}
            onAdd={() => addArr('materials', { name: '', description: '' })}
            onRemove={(i) => removeArr('materials', i)}
          />
        </div>
      );

    case 'styling':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <div>
            <label className="text-xs text-gray-500 block mb-1">코디 이미지 ({(data.images || []).length}개)</label>
            <div className="grid grid-cols-3 gap-2">
              {(data.images || []).map((img: string, i: number) => (
                <div key={i} className="relative group">
                  <img src={img} alt="" className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                  <button
                    onClick={() => {
                      const imgs = [...(data.images || [])];
                      imgs.splice(i, 1);
                      update('images', imgs);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => galleryPick?.(`images.${(data.images || []).length}.url`)}
                className="h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-blue-300 hover:text-blue-400 transition-colors"
              >
                <span className="text-lg">+</span>
              </button>
            </div>
          </div>
        </div>
      );

    case 'video_360':
    case 'video_demo':
    case 'video_ba':
    case 'video_short':
      return (
        <div className="space-y-4">
          <ImageSlot
            label="영상"
            url={data.videoUrl}
            onGalleryPick={() => galleryPick?.('videoUrl')}
            onClear={() => update('videoUrl', undefined)}
          />
          <Field label="캡션" value={data.caption} onChange={(v) => update('caption', v)} />
        </div>
      );

    case 'image_block':
      return (
        <div className="space-y-4">
          <ImageSlot
            label="이미지"
            url={data.imageUrl}
            onGalleryPick={() => galleryPick?.('imageUrl')}
            onClear={() => update('imageUrl', undefined)}
          />
          <Field label="캡션" value={data.caption} onChange={(v) => update('caption', v)} />
        </div>
      );

    case 'video_block':
      return (
        <div className="space-y-4">
          <ImageSlot
            label="동영상"
            url={data.videoUrl}
            onGalleryPick={() => galleryPick?.('videoUrl')}
            onClear={() => update('videoUrl', undefined)}
          />
          <Field label="캡션" value={data.caption} onChange={(v) => update('caption', v)} />
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-400 text-center py-8">
          이 블록은 JSON 모드로 편집해주세요
        </div>
      );
  }
}

// === Reusable form components ===

function Field({ label, value, onChange, multiline, type = 'text' }: {
  label: string; value: any; onChange: (v: string) => void; multiline?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="text-[12px] text-gray-500 block mb-1">{label}</label>
      {multiline ? (
        <textarea
          className="input text-sm"
          rows={3}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className="input text-sm"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ArrayField({ label, items, fields, onUpdate, onAdd, onRemove }: {
  label: string;
  items: any[];
  fields: { key: string; label: string; type?: string }[];
  onUpdate: (index: number, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12px] text-gray-500">{label}</label>
        <button onClick={onAdd} className="text-[11px] text-blue-600 hover:text-blue-700">+ 추가</button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 relative">
            <button
              onClick={() => onRemove(i)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-xs"
            >
              삭제
            </button>
            <div className="space-y-2 pr-8">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-[10px] text-gray-400">{f.label}</label>
                  {f.key === 'icon' ? (
                    <div>
                      <input
                        type="text"
                        className="input text-xs mt-0.5"
                        value={item[f.key] || ''}
                        onChange={(e) => onUpdate(i, f.key, e.target.value)}
                      />
                      <div className="flex flex-wrap gap-1 mt-1">
                        {EMOJI_PRESETS.map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => onUpdate(i, f.key, em)}
                            className="w-7 h-7 text-sm rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      className="input text-xs mt-0.5"
                      value={item[f.key] || ''}
                      onChange={(e) => onUpdate(i, f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareRowsEditor({ columns, rows, onChange }: {
  columns: string[];
  rows: { label: string; values: string[] }[];
  onChange: (rows: { label: string; values: string[] }[]) => void;
}) {
  function updateRow(ri: number, field: 'label' | number, value: string) {
    const copy = rows.map((r, i) => i === ri ? { ...r, values: [...r.values] } : { ...r, values: [...r.values] });
    if (field === 'label') {
      copy[ri].label = value;
    } else {
      while (copy[ri].values.length <= field) copy[ri].values.push('');
      copy[ri].values[field] = value;
    }
    onChange(copy);
  }

  function addRow() {
    onChange([...rows, { label: '', values: columns.map(() => '') }]);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12px] text-gray-500">비교 행</label>
        <button onClick={addRow} className="text-[11px] text-blue-600 hover:text-blue-700">+ 추가</button>
      </div>
      <div className="space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="bg-gray-50 rounded-lg p-3 relative">
            <button onClick={() => removeRow(ri)} className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-xs">삭제</button>
            <div className="space-y-1.5 pr-8">
              <div>
                <label className="text-[10px] text-gray-400">항목명</label>
                <input className="input text-xs mt-0.5" value={row.label} onChange={(e) => updateRow(ri, 'label', e.target.value)} />
              </div>
              {columns.map((col, ci) => (
                <div key={ci}>
                  <label className="text-[10px] text-gray-400">{col}</label>
                  <input className="input text-xs mt-0.5" value={row.values?.[ci] || ''} onChange={(e) => updateRow(ri, ci, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StringArrayField({ label, items, onChange }: {
  label: string; items: string[]; onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12px] text-gray-500">{label}</label>
        <button onClick={() => onChange([...items, ''])} className="text-[11px] text-blue-600">+ 추가</button>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input text-xs flex-1"
              value={item}
              onChange={(e) => {
                const copy = [...items];
                copy[i] = e.target.value;
                onChange(copy);
              }}
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-gray-300 hover:text-red-400 text-xs px-1"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
