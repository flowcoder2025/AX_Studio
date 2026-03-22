'use client';

import { useState, useEffect } from 'react';
import { BlockDefinition, BlockType } from '@/types/block';
import { BLOCK_NAMES } from '@/components/blocks';

interface BlockEditorProps {
  block: BlockDefinition | null;
  onSave: (blockId: string, data: any) => void;
  onClose: () => void;
}

export default function BlockEditor({ block, onSave, onClose }: BlockEditorProps) {
  const [formData, setFormData] = useState<any>({});
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');

  useEffect(() => {
    if (block) {
      setFormData(block.data || {});
      setJsonText(JSON.stringify(block.data || {}, null, 2));
    }
  }, [block]);

  if (!block) return null;

  const name = BLOCK_NAMES[block.type] || block.type;

  function handleSave() {
    if (jsonMode) {
      try {
        const parsed = JSON.parse(jsonText);
        onSave(block!.id, parsed);
      } catch {
        alert('JSON 형식이 올바르지 않습니다');
        return;
      }
    } else {
      onSave(block!.id, formData);
    }
    onClose();
  }

  function updateField(path: string, value: any) {
    setFormData((prev: any) => {
      const copy = { ...prev };
      const keys = path.split('.');
      let target = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) target[keys[i]] = {};
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
      return copy;
    });
  }

  function updateArrayItem(arrayPath: string, index: number, field: string, value: any) {
    setFormData((prev: any) => {
      const copy = { ...prev };
      if (!copy[arrayPath]) copy[arrayPath] = [];
      if (!copy[arrayPath][index]) copy[arrayPath][index] = {};
      copy[arrayPath][index] = { ...copy[arrayPath][index], [field]: value };
      return copy;
    });
  }

  function addArrayItem(arrayPath: string, template: any) {
    setFormData((prev: any) => ({
      ...prev,
      [arrayPath]: [...(prev[arrayPath] || []), template],
    }));
  }

  function removeArrayItem(arrayPath: string, index: number) {
    setFormData((prev: any) => ({
      ...prev,
      [arrayPath]: (prev[arrayPath] || []).filter((_: any, i: number) => i !== index),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="absolute inset-y-0 right-0 w-[480px] bg-white border-l border-ax-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ax-border">
          <div>
            <h3 className="text-base font-medium">{name} 편집</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{block.type} · {block.source}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setJsonMode(!jsonMode); if (!jsonMode) setJsonText(JSON.stringify(formData, null, 2)); }}
              className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200"
            >
              {jsonMode ? 'Form' : 'JSON'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {jsonMode ? (
            <textarea
              className="w-full h-full font-mono text-xs p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          ) : (
            renderFormFields(block.type, formData, updateField, updateArrayItem, addArrayItem, removeArrayItem)
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3 border-t border-ax-border">
          <button className="btn-secondary flex-1" onClick={onClose}>취소</button>
          <button className="btn-primary flex-1" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  );
}

// Form field renderer per block type
function renderFormFields(
  type: BlockType,
  data: any,
  update: (path: string, value: any) => void,
  updateArr: (arr: string, idx: number, field: string, value: any) => void,
  addArr: (arr: string, template: any) => void,
  removeArr: (arr: string, idx: number) => void,
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

    case 'solution':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="차별화 포인트"
            items={data.solutions || data.items || []}
            fields={[{ key: 'icon', label: '아이콘' }, { key: 'title', label: '제목' }, { key: 'description', label: '설명' }]}
            onUpdate={(i, f, v) => updateArr('solutions', i, f, v)}
            onAdd={() => addArr('solutions', { icon: '', title: '', description: '' })}
            onRemove={(i) => removeArr('solutions', i)}
          />
        </div>
      );

    case 'feature':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="기능"
            items={data.features || data.items || []}
            fields={[{ key: 'title', label: '기능명' }, { key: 'description', label: '설명' }]}
            onUpdate={(i, f, v) => updateArr('features', i, f, v)}
            onAdd={() => addArr('features', { title: '', description: '' })}
            onRemove={(i) => removeArr('features', i)}
          />
        </div>
      );

    case 'trust':
      return (
        <ArrayField
          label="신뢰 지표"
          items={data.metrics || []}
          fields={[{ key: 'value', label: '수치' }, { key: 'label', label: '라벨' }]}
          onUpdate={(i, f, v) => updateArr('metrics', i, f, v)}
          onAdd={() => addArr('metrics', { value: '', label: '' })}
          onRemove={(i) => removeArr('metrics', i)}
        />
      );

    case 'review':
      return (
        <ArrayField
          label="후기"
          items={data.reviews || data.items || []}
          fields={[
            { key: 'rating', label: '별점 (1-5)', type: 'number' },
            { key: 'text', label: '내용' },
            { key: 'author', label: '작성자' },
            { key: 'meta', label: '메타 (연령/구매인증 등)' },
          ]}
          onUpdate={(i, f, v) => updateArr('reviews', i, f, f === 'rating' ? Number(v) : v)}
          onAdd={() => addArr('reviews', { rating: 5, text: '', author: '', meta: '' })}
          onRemove={(i) => removeArr('reviews', i)}
        />
      );

    case 'spec':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label="스펙"
            items={data.specs || data.items || []}
            fields={[{ key: 'key', label: '항목' }, { key: 'value', label: '값' }]}
            onUpdate={(i, f, v) => updateArr('specs', i, f, v)}
            onAdd={() => addArr('specs', { key: '', value: '' })}
            onRemove={(i) => removeArr('specs', i)}
          />
        </div>
      );

    case 'faq':
      return (
        <ArrayField
          label="FAQ"
          items={data.faqs || data.items || []}
          fields={[{ key: 'question', label: '질문' }, { key: 'answer', label: '답변' }]}
          onUpdate={(i, f, v) => updateArr('faqs', i, f, v)}
          onAdd={() => addArr('faqs', { question: '', answer: '' })}
          onRemove={(i) => removeArr('faqs', i)}
        />
      );

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
    case 'tech':
      return (
        <div className="space-y-4">
          <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
          <ArrayField
            label={type === 'tech' ? '기술' : '성분'}
            items={data.ingredients || data.items || []}
            fields={[{ key: 'name', label: '이름' }, { key: 'amount', label: '함량' }, { key: 'benefit', label: '효능' }]}
            onUpdate={(i, f, v) => updateArr('ingredients', i, f, v)}
            onAdd={() => addArr('ingredients', { name: '', amount: '', benefit: '' })}
            onRemove={(i) => removeArr('ingredients', i)}
          />
        </div>
      );

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
        <Field label="제목" value={data.title} onChange={(v) => update('title', v)} />
      );

    case 'video_360':
    case 'video_demo':
    case 'video_ba':
    case 'video_short':
      return (
        <Field label="캡션" value={data.caption} onChange={(v) => update('caption', v)} />
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
                  <input
                    type={f.type || 'text'}
                    className="input text-xs mt-0.5"
                    value={item[f.key] || ''}
                    onChange={(e) => onUpdate(i, f.key, e.target.value)}
                  />
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
