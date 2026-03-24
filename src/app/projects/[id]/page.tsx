'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { v4 as uuid } from 'uuid';
import { BLOCK_NAMES } from '@/components/blocks';
import { buildDetailPageHtml } from '@/lib/render/html-builder';
import { renderFormFields } from '@/components/editor/BlockEditor';
import BlockSortable from '@/components/editor/BlockSortable';
import StudioPanel from '@/components/studio/StudioPanel';
import GalleryPanel from '@/components/studio/GalleryPanel';
import OutputGallery from '@/components/preview/OutputGallery';
import { BlockDefinition, BlockType } from '@/types/block';
import { CATEGORIES, CategoryId } from '@/lib/templates/categories';

// 정규화/스타일 추출은 db/client.ts getBlocks에서 처리 (schema.ts SSOT 기반)
// hero 기본 스타일은 DB에서 로드 후 style이 없을 때만 적용
function applyHeroDefaults(blocks: BlockDefinition[], heroStyle: string): BlockDefinition[] {
  return blocks.map(b => {
    if (b.type === 'hero' && !b.style?.bgColor) {
      const isDark = heroStyle === 'dark';
      return { ...b, style: {
        ...(b.style || {}),
        bgColor: isDark ? '#0a0a0a' : '#ffffff',
        color: isDark ? '#f5f5f5' : '#222222',
      }};
    }
    return b;
  });
}

const BLOCK_GROUPS = [
  { label: '미디어', types: ['image_block', 'video_block'] as BlockType[] },
  { label: '텍스트', types: ['hero', 'painpoint', 'solution', 'feature', 'ingredient', 'tech', 'trust', 'review', 'spec', 'faq', 'howto', 'cta'] as BlockType[] },
  { label: '비교/인증', types: ['compare', 'certification', 'size_guide', 'compatibility', 'pricing'] as BlockType[] },
  { label: '특수', types: ['styling', 'unboxing', 'recipe', 'process', 'material'] as BlockType[] },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const [blocks, setBlocks] = useState<BlockDefinition[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState('');
  const [pipelineActive, setPipelineActive] = useState(false);
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pipelineWarnings, setPipelineWarnings] = useState<string[]>([]);
  const [projectCategory, setProjectCategory] = useState('grooming');
  const [activeLanguage, setActiveLanguage] = useState<'ko' | 'en' | 'zh'>('ko');
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showOverlay, setShowOverlay] = useState<'json' | 'output' | 'templates' | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [galleryPickerFor, setGalleryPickerFor] = useState<{ blockId: string; field: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // 인라인 편집용 state
  const [formData, setFormData] = useState<any>({});
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const hasMultiLang = blocks.some(b => b.multiLangData);
  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  // 블록 선택 시 formData/style 동기화 (저장 없이 화면만 갱신)
  function selectBlock(blockId: string | null) {
    setSelectedBlockId(blockId);
    setInlineEditing(false);
    setEditingField(null);
    if (blockId) {
      const block = blocks.find(b => b.id === blockId);
      if (block) {
        setFormData(block.data || {});
        setJsonText(JSON.stringify(block.data || {}, null, 2));
        setJsonMode(false);
      }
    }
  }

  useEffect(() => {
    loadProject();
    const pipelineId = searchParams.get('pipeline');
    if (pipelineId) {
      startPipelineListener(pipelineId);
      window.history.replaceState({}, '', `/projects/${projectId}`);
    }
  }, [projectId]);

  // iframe postMessage 리스너
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'block-click') {
        selectBlock(e.data.blockId || null);
      }
      if (e.data?.type === 'text-focus') {
        // 텍스트 클릭 시 블록도 선택하되, inlineEditing 모드 활성화
        const bid = e.data.blockId;
        if (bid !== selectedBlockId) selectBlock(bid);
        setInlineEditing(true);
        setEditingField(e.data.field || null);
      }
      if (e.data?.type === 'inline-edit') {
        const { blockId, field, value } = e.data;
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;
        const data = JSON.parse(JSON.stringify(block.data || {}));
        const parts = field.split('.');
        let target = data;
        for (let i = 0; i < parts.length - 1; i++) {
          const key = isNaN(Number(parts[i])) ? parts[i] : Number(parts[i]);
          if (target[key] === undefined) target[key] = typeof parts[i + 1] === 'string' && isNaN(Number(parts[i + 1])) ? {} : [];
          target = target[key];
        }
        target[parts[parts.length - 1]] = value;
        const updated = blocks.map(b => b.id === blockId ? { ...b, data } : b);
        setBlocks(updated);
        saveBlocks(updated);
        if (selectedBlockId === blockId) setFormData(data);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [blocks, selectedBlockId]);

  async function loadProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.category) setProjectCategory(data.category);
        if (data.blocks?.length) {
          const cat = CATEGORIES[data.category as CategoryId];
          setBlocks(applyHeroDefaults(data.blocks, cat?.heroStyle || 'dark'));
        }
      }
    } catch {}
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveBlocks = useCallback((updatedBlocks: BlockDefinition[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}/blocks`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks: updatedBlocks }),
        });
      } catch (e) { console.error('Save failed:', e); }
      setSaving(false);
    }, 500);
  }, [projectId]);

  function handleReorder(reordered: BlockDefinition[]) { setBlocks(reordered); saveBlocks(reordered); }
  function handleToggle(blockId: string) {
    const updated = blocks.map(b => b.id === blockId ? { ...b, visible: !b.visible } : b);
    setBlocks(updated); saveBlocks(updated);
  }
  function handleDeleteBlock(blockId: string) {
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    const updated = blocks.filter(b => b.id !== blockId).map((b, i) => ({ ...b, order: i }));
    setBlocks(updated); saveBlocks(updated);
  }
  function handleAddBlock(type: BlockType) {
    const newBlock: BlockDefinition = {
      id: uuid(), type, order: blocks.length,
      source: type === 'image_block' || type === 'video_block' ? 'user' : 'claude',
      data: {} as any, images: [], videos: [], visible: true,
    };
    const updated = [...blocks, newBlock];
    setBlocks(updated); saveBlocks(updated); setShowAddBlock(false);
  }

  // 블록 레벨 스타일 변경 (style/elementStyles는 data 밖에 존재)
  function updateBlockStyle(style: any) {
    if (!selectedBlockId || !selectedBlock) return;
    // 변경된 속성을 모든 elementStyles에서 제거 (캐스케이드)
    const oldStyle = selectedBlock.style || {};
    const changedKeys = Object.keys(style).filter(k => (style as any)[k] !== (oldStyle as any)[k]);
    let newElementStyles = selectedBlock.elementStyles ? { ...selectedBlock.elementStyles } : undefined;
    if (changedKeys.length > 0 && newElementStyles) {
      for (const field of Object.keys(newElementStyles)) {
        const copy = { ...newElementStyles[field] };
        for (const ck of changedKeys) { delete (copy as any)[ck]; }
        if (Object.keys(copy).length > 0) { newElementStyles[field] = copy; } else { delete newElementStyles[field]; }
      }
      if (Object.keys(newElementStyles).length === 0) newElementStyles = undefined;
    }
    const updated = blocks.map(b => b.id === selectedBlockId
      ? { ...b, style: Object.keys(style).length > 0 ? style : undefined, elementStyles: newElementStyles }
      : b);
    setBlocks(updated); saveBlocks(updated);
  }

  function updateElementStyle(field: string, style: any) {
    if (!selectedBlockId || !selectedBlock) return;
    const es = { ...(selectedBlock.elementStyles || {}) };
    if (Object.keys(style).length > 0) { es[field] = style; } else { delete es[field]; }
    const updated = blocks.map(b => b.id === selectedBlockId
      ? { ...b, elementStyles: Object.keys(es).length > 0 ? es : undefined }
      : b);
    setBlocks(updated); saveBlocks(updated);
  }

  // 편집 후 formData + blocks + saveBlocks를 원자적으로 처리하는 헬퍼
  function commitFormData(newData: any) {
    setFormData(newData);
    if (!selectedBlockId) return;
    const updated = blocks.map(b => b.id === selectedBlockId ? { ...b, data: newData } : b);
    setBlocks(updated);
    saveBlocks(updated);
  }

  // 인라인 편집 함수들 — useEffect 순환 없이 명시적 커밋
  function updateField(path: string, value: any) {
    const copy = JSON.parse(JSON.stringify(formData));
    const keys = path.split('.');
    let target = copy;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    commitFormData(copy);
  }
  function updateArrayItem(arrayPath: string, index: number, field: string, value: any) {
    const copy = JSON.parse(JSON.stringify(formData));
    if (!copy[arrayPath]) copy[arrayPath] = [];
    if (!copy[arrayPath][index]) copy[arrayPath][index] = {};
    copy[arrayPath][index] = { ...copy[arrayPath][index], [field]: value };
    commitFormData(copy);
  }
  function addArrayItem(arrayPath: string, template: any) {
    const copy = { ...formData, [arrayPath]: [...(formData[arrayPath] || []), template] };
    commitFormData(copy);
  }
  function removeArrayItem(arrayPath: string, index: number) {
    const copy = { ...formData, [arrayPath]: (formData[arrayPath] || []).filter((_: any, i: number) => i !== index) };
    commitFormData(copy);
  }

  function handleGallerySelect(item: { fileUrl: string; type: string }) {
    if (!galleryPickerFor) return;
    const { blockId, field } = galleryPickerFor;
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const data = JSON.parse(JSON.stringify(block.data || {}));
    if (!field.includes('.')) {
      data[field] = item.fileUrl;
    } else {
      const parts = field.split('.');
      if (parts.length === 3) {
        const [arrKey, indexStr, prop] = parts;
        const arr = data[arrKey] || data.items;
        const idx = parseInt(indexStr);
        if (arr?.[idx]) arr[idx][prop] = item.fileUrl;
      }
    }
    const updated = blocks.map(b => b.id === blockId ? { ...b, data } : b);
    setBlocks(updated); saveBlocks(updated); setGalleryPickerFor(null);
    if (selectedBlockId === blockId) setFormData(data);
  }

  // SSE
  function startPipelineListener(pipelineId: string) {
    setPipelineActive(true); setCurrentPipelineId(pipelineId); setPipelineWarnings([]);
    const es = new EventSource(`/api/pipeline/status?id=${pipelineId}`);
    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setPipelineProgress(event.progress); setPipelineStep(event.currentStep);
      if (event.currentStep?.includes('실패') || event.currentStep?.includes('건너뜀'))
        setPipelineWarnings(prev => [...prev, event.currentStep]);
      if (event.status === 'complete') { setPipelineActive(false); es.close(); loadProject(); }
      if (event.status === 'error') { setPipelineActive(false); es.close(); }
    };
    es.onerror = () => { setPipelineActive(false); es.close(); };
  }

  async function handleCancelPipeline() {
    if (!currentPipelineId) return;
    await fetch('/api/pipeline/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineId: currentPipelineId }),
    }).catch(() => {});
  }

  async function handleExport(type: 'html' | 'image') {
    if (blocks.length === 0) return;
    try {
      await fetch('/api/render/html', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, blocks, category: projectCategory }),
      });
      if (type === 'image') {
        await fetch('/api/render/image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, platform: 'coupang' }),
        });
        triggerDownload(`/api/output/download?id=${projectId}&type=image&platform=coupang`, `상세페이지_coupang.png`);
      } else {
        triggerDownload(`/api/output/download?id=${projectId}&type=html`, `상세페이지.html`);
      }
    } catch (e) { console.error('Export failed:', e); }
  }

  async function triggerDownload(url: string, filename: string) {
    const res = await fetch(url); const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // 블록 단위 카피 재생성
  async function handleRegenerate() {
    if (!selectedBlock || regenerating) return;
    setRegenerating(true);
    setShowRegenInput(false);
    try {
      const res = await fetch('/api/studio/regenerate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, blockId: selectedBlock.id, blockType: selectedBlock.type,
          userPrompt: regenPrompt.trim() || undefined,
        }),
      });
      if (!res.ok) { setRegenerating(false); return; }
      const { data } = await res.json();
      // 기존 이미지/영상 URL 유지 (style/elementStyles는 block 최상위 필드 — data와 무관)
      const merged = { ...data };
      const old = selectedBlock.data as any;
      if (old?.heroImageUrl) merged.heroImageUrl = old.heroImageUrl;
      if (old?.imageUrl) merged.imageUrl = old.imageUrl;
      if (old?.videoUrl) merged.videoUrl = old.videoUrl;
      const updated = blocks.map(b => b.id === selectedBlock.id ? { ...b, data: merged } : b);
      setBlocks(updated); saveBlocks(updated); setFormData(merged);
    } catch (e) { console.error('Regenerate failed:', e); }
    setRegenerating(false);
    setRegenPrompt('');
  }

  // JSON 저장 (인라인 JSON 편집용)
  function handleJsonSave() {
    if (!selectedBlock) return;
    try {
      const parsed = JSON.parse(jsonText);
      commitFormData(parsed);
    } catch { alert('JSON 형식이 올바르지 않습니다'); }
  }

  const visibleBlocks = blocks.filter(b => b.visible).sort((a, b) => a.order - b.order);
  const heroStyle = CATEGORIES[projectCategory as CategoryId]?.heroStyle || 'dark';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 파이프라인 진행 */}
      {pipelineActive && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-blue-700 font-medium">{pipelineStep}</span>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">{pipelineProgress}%</span>
              <button onClick={handleCancelPipeline} className="text-red-400 hover:text-red-600 text-[10px]">취소</button>
            </div>
          </div>
          <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pipelineProgress}%` }} />
          </div>
        </div>
      )}
      {pipelineWarnings.length > 0 && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100">
          {pipelineWarnings.map((w, i) => <p key={i} className="text-[10px] text-amber-700">{w}</p>)}
        </div>
      )}

      {/* 헤더 바 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-ax-border">
        {saving && <span className="text-[10px] text-blue-500">저장 중...</span>}
        <div className="flex-1" />
        {hasMultiLang && (
          <div className="flex gap-1 mr-2">
            {(['ko', 'en', 'zh'] as const).map(lang => (
              <button key={lang} onClick={() => setActiveLanguage(lang)}
                className={`px-1.5 py-1 text-[10px] rounded border ${activeLanguage === lang ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-400 border-gray-200'}`}
              >{{ ko: '한국어', en: 'EN', zh: '中文' }[lang]}</button>
            ))}
          </div>
        )}
        <button onClick={() => setShowOverlay('json')} className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">JSON</button>
        <button onClick={() => setShowOverlay('output')} className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">출력</button>
        <button className="text-[11px] text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded" onClick={() => handleExport('html')}>HTML 내보내기</button>
        <button className="text-[11px] text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-200" onClick={() => handleExport('image')}>이미지 내보내기</button>
      </div>

      {/* 3컬럼 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">

        {/* === 좌측: 블록 목록 === */}
        <div className="w-56 border-r border-ax-border bg-white flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-ax-border flex items-center justify-between">
            <span className="text-[11px] text-gray-500">{blocks.length}개 블록</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowOverlay('templates')} className="text-[11px] text-gray-400 hover:text-gray-600">템플릿</button>
              <button onClick={() => setShowAddBlock(true)} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">+ 추가</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {blocks.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">
                <p>블록이 없습니다</p>
                <button className="btn-secondary mt-3 text-xs" onClick={() => setShowAddBlock(true)}>블록 추가</button>
              </div>
            ) : (
              <BlockSortable
                blocks={blocks}
                onReorder={handleReorder}
                onToggle={handleToggle}
                onEdit={(block) => selectBlock(block.id)}
                onDelete={handleDeleteBlock}
                selectedBlockId={selectedBlockId}
              />
            )}
          </div>
        </div>

        {/* === 중앙: 미리보기 === */}
        <div className="flex-1 bg-gray-100 overflow-auto">
          <PreviewIframe
            blocks={visibleBlocks}
            heroStyle={heroStyle}
            categoryName={CATEGORIES[projectCategory as CategoryId]?.nameKo || ''}
            hasMultiLang={hasMultiLang}
            activeLanguage={activeLanguage}
            selectedBlockId={selectedBlockId}
          />
        </div>

        {/* === 우측: 컨텍스트 패널 === */}
        <div className="w-80 border-l border-ax-border bg-white flex flex-col flex-shrink-0 overflow-hidden">
          {selectedBlock ? (
            <>
              {/* 선택된 블록 헤더 */}
              <div className="px-4 py-3 border-b border-ax-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">{BLOCK_NAMES[selectedBlock.type] || selectedBlock.type}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">{selectedBlock.type} · {selectedBlock.source}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowRegenInput(!showRegenInput)}
                    disabled={regenerating}
                    className="text-[10px] text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 disabled:opacity-50"
                  >{regenerating ? '생성 중...' : '카피 재생성'}</button>
                  <button
                    onClick={() => { setJsonMode(!jsonMode); if (!jsonMode) setJsonText(JSON.stringify(formData, null, 2)); }}
                    className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded border border-gray-200"
                  >{jsonMode ? 'Form' : 'JSON'}</button>
                  <button onClick={() => selectBlock(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* 재생성 프롬프트 입력 */}
              {showRegenInput && (
                <div className="px-4 py-3 border-b border-ax-border bg-blue-50/50">
                  <textarea
                    className="w-full text-xs p-2.5 border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    rows={2}
                    placeholder="어떻게 바꾸고 싶은지 설명하세요 (비우면 자동 재작성)"
                    value={regenPrompt}
                    onChange={e => setRegenPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRegenerate(); } }}
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={handleRegenerate} disabled={regenerating}
                      className="text-[11px] bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >{regenerating ? '생성 중...' : '재생성'}</button>
                    <button onClick={() => { setShowRegenInput(false); setRegenPrompt(''); }}
                      className="text-[11px] text-gray-400 px-2 py-1 rounded hover:text-gray-600"
                    >취소</button>
                  </div>
                </div>
              )}
              {/* 편집 폼 */}
              <div className="flex-1 overflow-y-auto p-4">
                {jsonMode ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full h-64 font-mono text-xs p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                    />
                    <button onClick={handleJsonSave} className="btn-primary w-full text-xs">JSON 적용</button>
                  </div>
                ) : (
                  <>
                    {inlineEditing && editingField ? (
                      <div>
                        <p className="text-[10px] text-blue-500 mb-2">요소: {editingField}</p>
                        <StyleControls
                          style={(selectedBlock.elementStyles || {})[editingField] || {}}
                          onChange={(s) => updateElementStyle(editingField!, s)}
                          mode="element"
                        />
                      </div>
                    ) : (
                      <StyleControls
                        style={selectedBlock.style || {}}
                        onChange={(s) => updateBlockStyle(s)}
                        mode="block"
                      />
                    )}
                    {!inlineEditing && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {renderFormFields(
                          selectedBlock.type, formData,
                          updateField, updateArrayItem, addArrayItem, removeArrayItem,
                          (field: string) => setGalleryPickerFor({ blockId: selectedBlock.id, field })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* 생성소 + 미니 갤러리 */}
              <div className="flex-1 overflow-y-auto">
                <StudioPanel
                  projectId={projectId}
                  onGenerated={() => window.dispatchEvent(new Event('gallery-reload'))}
                />
                <div className="border-t border-ax-border">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <span className="text-[11px] text-gray-500 font-medium">갤러리</span>
                  </div>
                  <GalleryPanel
                    projectId={projectId}
                    blocks={blocks}
                    onBlocksUpdate={loadProject}
                    compact={true}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 블록 추가 모달 */}
      {showAddBlock && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddBlock(false)}>
          <div className="bg-white rounded-xl shadow-xl w-96 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-medium">블록 추가</h4>
            </div>
            {BLOCK_GROUPS.map(group => (
              <div key={group.label} className="p-3">
                <p className="text-[10px] text-gray-400 font-medium mb-1.5">{group.label}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {group.types.map(type => (
                    <button key={type} onClick={() => handleAddBlock(type)}
                      className="px-2 py-1.5 text-[11px] text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >{BLOCK_NAMES[type] || type}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => setShowAddBlock(false)} className="btn-secondary w-full text-xs">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 갤러리 선택 모달 */}
      {galleryPickerFor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]" onClick={() => setGalleryPickerFor(null)}>
          <div className="bg-white rounded-xl shadow-xl w-[700px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <GalleryPanel
              projectId={projectId}
              blocks={blocks}
              onBlocksUpdate={loadProject}
              selectMode={true}
              selectType={galleryPickerFor.field === 'videoUrl' ? 'video' : 'image'}
              onSelect={(item) => handleGallerySelect(item)}
            />
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => setGalleryPickerFor(null)} className="btn-secondary w-full text-xs">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 저장 모달 */}
      {showSaveTemplate && (
        <SaveTemplateModal
          projectId={projectId}
          onSaved={() => setShowSaveTemplate(false)}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}

      {/* JSON / 출력 / 템플릿 오버레이 */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowOverlay(null)}>
          <div className="bg-white rounded-xl shadow-xl w-[800px] max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h4 className="text-sm font-medium">
                {{ json: 'JSON 데이터', output: '출력 결과', templates: '템플릿' }[showOverlay!]}
              </h4>
              <div className="flex items-center gap-2">
                {showOverlay === 'templates' && blocks.length > 0 && (
                  <button onClick={() => { setShowOverlay(null); setShowSaveTemplate(true); }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200">현재 블록 템플릿 저장</button>
                )}
                <button onClick={() => setShowOverlay(null)} className="text-gray-400 hover:text-gray-600 text-sm">닫기</button>
              </div>
            </div>
            <div className="overflow-auto max-h-[75vh] p-5">
              {showOverlay === 'json' && (
                <JsonEditor blocks={blocks} onApply={(updated) => { setBlocks(updated); saveBlocks(updated); setShowOverlay(null); }} />
              )}
              {showOverlay === 'output' && <OutputGallery projectId={projectId} />}
              {showOverlay === 'templates' && (
                <TemplateList onLoad={(templateBlocks) => {
                  const withIds = templateBlocks.map((b: any, i: number) => ({
                    ...b, id: b.id || uuid(), order: i,
                    data: b.data || {}, images: b.images || [], videos: b.videos || [], visible: b.visible !== false,
                  }));
                  setBlocks(withIds); saveBlocks(withIds); setShowOverlay(null);
                }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 내보내기 HTML과 동일한 미리보기 (iframe + srcdoc + 클릭 선택)
function PreviewIframe({ blocks, heroStyle, categoryName, hasMultiLang, activeLanguage, selectedBlockId }: {
  blocks: BlockDefinition[];
  heroStyle: string;
  categoryName: string;
  hasMultiLang: boolean;
  activeLanguage: 'ko' | 'en' | 'zh';
  selectedBlockId?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewBlocks = useMemo(() => {
    if (!hasMultiLang) return blocks;
    return blocks.map(b => (b.multiLangData?.[activeLanguage])
      ? { ...b, data: b.multiLangData[activeLanguage] } : b);
  }, [blocks, hasMultiLang, activeLanguage]);

  const html = useMemo(() =>
    buildDetailPageHtml(previewBlocks, heroStyle, categoryName, { preview: true }),
    [previewBlocks, heroStyle, categoryName]
  );

  // iframe 높이를 콘텐츠에 맞춤
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) iframe.style.height = doc.body.scrollHeight + 'px';
      } catch {}
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [html]);

  // 선택된 블록 하이라이트
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const tryHighlight = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        doc.querySelectorAll('[data-highlight]').forEach(el => {
          (el as HTMLElement).style.outline = '';
          (el as HTMLElement).style.outlineOffset = '';
          el.removeAttribute('data-highlight');
        });
        if (selectedBlockId) {
          const el = doc.getElementById(`block-${selectedBlockId}`);
          if (el) {
            el.style.outline = '2px solid #3b82f6';
            el.style.outlineOffset = '-2px';
            el.setAttribute('data-highlight', '1');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } catch {}
    };
    const timer = setTimeout(tryHighlight, 100);
    return () => clearTimeout(timer);
  }, [selectedBlockId, html]);

  if (blocks.length === 0) {
    return <div className="py-24 text-center text-sm text-gray-400">미리보기할 블록이 없습니다</div>;
  }

  return (
    <div className="flex justify-center pb-8 pt-4">
      <div className="bg-white rounded-xl border border-ax-border overflow-hidden shadow-sm" style={{ width: 640 }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ width: 640, minHeight: 400, border: 'none', display: 'block' }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

// JSON 편집기 (전체 블록 가져오기/내보내기)
function JsonEditor({ blocks, onApply }: { blocks: BlockDefinition[]; onApply: (blocks: BlockDefinition[]) => void }) {
  const [text, setText] = useState(JSON.stringify(blocks, null, 2));
  const [error, setError] = useState('');

  function handleApply() {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) { setError('배열 형식이어야 합니다'); return; }
      setError('');
      // 시스템 필드 자동 보정
      const normalized = parsed.map((b: any, i: number) => ({
        id: b.id || uuid(),
        type: b.type || 'hero',
        order: i,
        source: b.source || 'user',
        data: b.data || {},
        images: b.images || [],
        videos: b.videos || [],
        visible: b.visible !== undefined ? b.visible : true,
        multiLangData: b.multiLangData || undefined,
        ...(b.style ? { style: b.style } : {}),
        ...(b.elementStyles ? { elementStyles: b.elementStyles } : {}),
      }));
      onApply(normalized);
    } catch (e: any) {
      setError(`JSON 파싱 오류: ${e.message}`);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full h-[55vh] font-mono text-[11px] p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50"
        value={text}
        onChange={e => { setText(e.target.value); setError(''); }}
        spellCheck={false}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleApply} className="btn-primary text-sm px-6">적용</button>
        <button onClick={() => setText(JSON.stringify(blocks, null, 2))} className="btn-secondary text-xs">초기화</button>
        <button onClick={() => { navigator.clipboard.writeText(text); }} className="btn-secondary text-xs">복사</button>
        <label className="btn-secondary text-xs cursor-pointer">
          파일 가져오기
          <input type="file" accept=".json" className="hidden" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setText(reader.result as string);
            reader.readAsText(file);
            e.target.value = '';
          }} />
        </label>
      </div>
    </div>
  );
}

// 템플릿 저장 모달
function SaveTemplateModal({ projectId, onSaved, onClose }: { projectId: string; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [includeCopy, setIncludeCopy] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), projectId, includeCopy }),
      });
      if (res.ok) onSaved();
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <h4 className="text-sm font-medium mb-4">현재 블록을 템플릿으로 저장</h4>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">템플릿 이름</label>
            <input className="input text-sm" placeholder="예: 가전제품 기본 레이아웃" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }} autoFocus />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeCopy} onChange={e => setIncludeCopy(e.target.checked)} className="rounded" />
            <span className="text-xs text-gray-600">카피(텍스트) 포함</span>
          </label>
          <p className="text-[10px] text-gray-400">
            {includeCopy ? '블록 구조 + 스타일 + 카피 텍스트가 저장됩니다.' : '블록 구조 + 스타일만 저장됩니다. 카피는 새로 생성해야 합니다.'}
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 text-xs">취소</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary flex-1 text-xs disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 템플릿 목록 + 불러오기
function TemplateList({ onLoad }: { onLoad: (blocks: any[]) => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(d => { setTemplates(d.templates || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleLoad(id: string) {
    const res = await fetch(`/api/templates/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    onLoad(data.blocks || []);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  if (loading) return <div className="text-center py-12 text-sm text-gray-400">불러오는 중...</div>;
  if (templates.length === 0) return <div className="text-center py-12 text-sm text-gray-400">저장된 템플릿이 없습니다</div>;

  return (
    <div className="space-y-2">
      {templates.map(t => (
        <div key={t.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
          <div>
            <p className="text-sm font-medium">{t.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {t.blockCount}개 블록 · {t.includeCopy ? '카피 포함' : '구조만'}{t.category ? ` · ${t.category}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleLoad(t.id)} className="text-[11px] text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200">불러오기</button>
            <button onClick={() => handleDelete(t.id)} className="text-[11px] text-red-400 hover:text-red-600 px-1.5 py-1">삭제</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// 스타일 오버라이드 컨트롤
function StyleControls({ style, onChange, mode = 'block' }: {
  style: Record<string, any>;
  onChange: (s: Record<string, any>) => void;
  mode?: 'block' | 'element';
}) {
  function set(key: string, value: any) {
    const next = { ...style, [key]: value || undefined };
    // undefined 값 제거
    Object.keys(next).forEach(k => { if (next[k] === undefined || next[k] === '') delete next[k]; });
    onChange(Object.keys(next).length > 0 ? next : {});
  }

  return (
    <div className={mode === 'element' ? '' : 'mt-6 pt-4 border-t border-gray-100'}>
      <p className="text-[11px] text-gray-400 font-medium mb-3">
        {mode === 'element' ? '텍스트 스타일' : '블록 스타일'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* 텍스트 속성 — 블록/요소 공통 */}
        <div>
          <label className="text-[10px] text-gray-400">글자 크기 (px)</label>
          <input type="number" className="input text-xs mt-0.5" placeholder="기본값"
            value={style.fontSize || ''} onChange={e => set('fontSize', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400">글자 굵기</label>
          <select className="input text-xs mt-0.5" value={style.fontWeight || ''} onChange={e => set('fontWeight', e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">기본값</option>
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">SemiBold (600)</option>
            <option value="700">Bold (700)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-400">정렬</label>
          <div className="flex gap-1 mt-0.5">
            {(['left', 'center', 'right'] as const).map(align => (
              <button key={align} onClick={() => set('textAlign', style.textAlign === align ? undefined : align)}
                className={`flex-1 py-1 text-[10px] rounded border transition-colors ${style.textAlign === align ? 'bg-blue-50 border-blue-400 text-blue-600' : 'border-gray-200 text-gray-400'}`}
              >{{ left: '좌', center: '중', right: '우' }[align]}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-400">글자 색</label>
          <div className="flex gap-1 mt-0.5">
            <input type="color" className="w-7 h-7 rounded border border-gray-200 cursor-pointer"
              value={style.color || '#222222'} onChange={e => set('color', e.target.value === '#222222' ? undefined : e.target.value)} />
            {style.color && <button onClick={() => set('color', undefined)} className="text-[9px] text-red-400">초기화</button>}
          </div>
        </div>
        {/* 블록 전용 속성 */}
        {mode === 'block' && (
          <>
            <div>
              <label className="text-[10px] text-gray-400">여백 (px)</label>
              <input type="number" className="input text-xs mt-0.5" placeholder="기본값"
                value={style.padding || ''} onChange={e => set('padding', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">배경색</label>
              <div className="flex gap-1 mt-0.5">
                <input type="color" className="w-7 h-7 rounded border border-gray-200 cursor-pointer"
                  value={style.bgColor || '#ffffff'} onChange={e => set('bgColor', e.target.value === '#ffffff' ? undefined : e.target.value)} />
                {style.bgColor && <button onClick={() => set('bgColor', undefined)} className="text-[9px] text-red-400">초기화</button>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
