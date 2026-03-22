'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { renderBlock, BLOCK_NAMES } from '@/components/blocks';
import BlockSortable from '@/components/editor/BlockSortable';
import BlockEditor from '@/components/editor/BlockEditor';
import OutputGallery from '@/components/preview/OutputGallery';
import { BlockDefinition } from '@/types/block';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [blocks, setBlocks] = useState<BlockDefinition[]>([]);
  const [editingBlock, setEditingBlock] = useState<BlockDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'json' | 'output'>('preview');
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState('');
  const [pipelineActive, setPipelineActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<'ko' | 'en' | 'zh'>('ko');
  const hasMultiLang = blocks.some(b => b.multiLangData);

  // Load project data
  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.blocks?.length) setBlocks(data.blocks);
      }
    } catch {
      // Project may not exist in DB yet
    }
  }

  // Auto-save blocks to DB
  const saveBlocks = useCallback(async (updatedBlocks: BlockDefinition[]) => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/blocks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: updatedBlocks }),
      });
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  }, [projectId]);

  function handleReorder(reordered: BlockDefinition[]) {
    setBlocks(reordered);
    saveBlocks(reordered);
  }

  function handleToggle(blockId: string) {
    const updated = blocks.map(b =>
      b.id === blockId ? { ...b, visible: !b.visible } : b
    );
    setBlocks(updated);
    saveBlocks(updated);
  }

  function handleBlockSave(blockId: string, data: any) {
    const updated = blocks.map(b =>
      b.id === blockId ? { ...b, data } : b
    );
    setBlocks(updated);
    saveBlocks(updated);
  }

  // SSE pipeline listener
  function startPipelineListener(pipelineId: string) {
    setPipelineActive(true);
    const es = new EventSource(`/api/pipeline/status?id=${pipelineId}`);
    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setPipelineProgress(event.progress);
      setPipelineStep(event.currentStep);
      if (event.status === 'complete') {
        setPipelineActive(false);
        es.close();
        loadProject(); // Reload blocks
      }
      if (event.status === 'error') {
        setPipelineActive(false);
        es.close();
      }
    };
    es.onerror = () => {
      setPipelineActive(false);
      es.close();
    };
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.projectId) window.location.href = `/projects/${data.projectId}`;
    } catch (e) {
      console.error('Duplicate failed:', e);
    }
  }

  async function handleSaveTemplate() {
    const name = prompt('템플릿 이름을 입력하세요');
    if (!name) return;
    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, projectId }),
      });
      alert('템플릿이 저장되었습니다');
    } catch (e) {
      console.error('Save template failed:', e);
    }
  }

  async function handleExport(type: 'html' | 'image') {
    if (blocks.length === 0) return;
    try {
      // Generate HTML first
      await fetch('/api/render/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, blocks, category: 'grooming' }),
      });

      if (type === 'image') {
        await fetch('/api/render/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, platform: 'coupang' }),
        });
        window.open(`/api/output/download?id=${projectId}&type=image&platform=coupang`);
      } else {
        window.open(`/api/output/download?id=${projectId}&type=html`);
      }
    } catch (e) {
      console.error('Export failed:', e);
    }
  }

  function loadDemoBlocks() {
    const demo: BlockDefinition[] = [
      { id: 'd1', type: 'hero', order: 0, source: 'claude', visible: true, images: [], videos: [],
        data: { headline: '3초 만에 완성하는\n프로 헨소닉', subheadline: '당신의 피부를 위한 선택', kpis: [{ value: '14,000RPM', label: '모터' }, { value: 'IPX7', label: '방수' }, { value: '60분', label: '사용시간' }] } },
      { id: 'd2', type: 'video_360', order: 1, source: 'comfyui', visible: true, images: [], videos: [], data: { videoType: 'rotate_360' } },
      { id: 'd3', type: 'painpoint', order: 2, source: 'claude', visible: true, images: [], videos: [],
        data: { title: '이런 고민 있으시죠?', painpoints: ['면도할 때 피부가 당기고 따가운 느낌', '얼굴 굴곡을 따라 밀착되지 않는 면도기', '충전이 금방 닳아서 불편한 경험'] } },
      { id: 'd4', type: 'solution', order: 3, source: 'claude', visible: true, images: [], videos: [],
        data: { title: '이래서 다릅니다', solutions: [{ icon: '6D', title: '6D 자유 회전', description: '얼굴 굴곡을 따라 자동 밀착' }, { icon: 'IPX7', title: '완전 방수', description: '샤워 중에도 사용 가능' }, { icon: '60m', title: '장시간 사용', description: '1회 충전 60분 연속 사용' }] } },
      { id: 'd5', type: 'feature', order: 4, source: 'claude', visible: true, images: [], videos: [],
        data: { title: '핵심 기능', features: [{ title: '6D 플렉스 헤드', description: '얼굴의 모든 굴곡을 따라 자유롭게 움직이는 6방향 플렉스 헤드 시스템' }, { title: '3중 블레이드', description: '일본산 스테인리스 3중 블레이드로 한 번에 깔끔하게' }] } },
      { id: 'd6', type: 'video_demo', order: 5, source: 'comfyui', visible: true, images: [], videos: [], data: { videoType: 'demo' } },
      { id: 'd7', type: 'trust', order: 6, source: 'claude', visible: true, images: [], videos: [],
        data: { metrics: [{ value: '10만+', label: '누적 판매' }, { value: '4.8', label: '평균 별점' }, { value: '98%', label: '만족도' }] } },
      { id: 'd8', type: 'review', order: 7, source: 'claude', visible: true, images: [], videos: [],
        data: { reviews: [{ rating: 5, text: '밀착력이 다른 제품과 비교할 수 없을 정도입니다.', author: '김**', meta: '30대' }, { rating: 5, text: '충전 한 번으로 한 달 넘게 쓰고 있습니다.', author: '박**', meta: '40대' }] } },
      { id: 'd9', type: 'spec', order: 8, source: 'claude', visible: true, images: [], videos: [],
        data: { title: '제품 사양', specs: [{ key: '모델명', value: 'PRO-HS6000' }, { key: '모터', value: '14,000 RPM' }, { key: '방수', value: 'IPX7' }, { key: '배터리', value: '800mAh' }, { key: '사용시간', value: '60분' }, { key: '무게', value: '178g' }] } },
      { id: 'd10', type: 'faq', order: 9, source: 'claude', visible: true, images: [], videos: [],
        data: { faqs: [{ question: '물 세척이 가능한가요?', answer: 'IPX7 등급 완전 방수로 흐르는 물에 직접 세척 가능합니다.' }, { question: '교체 날 구매처는?', answer: '공식 스토어에서 구매 가능, 교체 주기 약 6개월입니다.' }] } },
      { id: 'd11', type: 'howto', order: 10, source: 'claude', visible: true, images: [], videos: [],
        data: { title: '사용 방법', steps: [{ title: '전원 ON', description: '하단 버튼을 1초간 눌러 작동' }, { title: '피부에 밀착', description: '6D 헤드가 얼굴 굴곡에 자동 밀착' }, { title: '물 세척', description: '사용 후 흐르는 물에 바로 세척' }] } },
      { id: 'd12', type: 'video_short', order: 11, source: 'ffmpeg', visible: true, images: [], videos: [], data: { videoType: 'shortform' } },
      { id: 'd13', type: 'cta', order: 12, source: 'claude', visible: true, images: [], videos: [],
        data: { packages: [{ name: '단품', price: '89,000원', description: '본체 + 충전독' }, { name: '풀패키지', price: '119,000원', description: '본체 + 충전독 + 교체날 2개 + 파우치', featured: true }], buttonText: '구매하기' } },
    ];
    setBlocks(demo);
  }

  const visibleBlocks = blocks.filter(b => b.visible).sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel */}
      <div className="w-80 border-r border-ax-border bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-ax-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">블록 편집</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {blocks.length}개 블록 · {visibleBlocks.length}개 표시
              {saving && <span className="text-blue-500 ml-2">저장 중...</span>}
            </p>
          </div>
          <button onClick={loadDemoBlocks} className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1">
            Demo
          </button>
        </div>

        {/* Pipeline progress */}
        {pipelineActive && (
          <div className="px-4 py-3 border-b border-ax-border bg-blue-50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-blue-700 font-medium">{pipelineStep}</span>
              <span className="text-blue-500">{pipelineProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pipelineProgress}%` }} />
            </div>
          </div>
        )}

        {/* Block list with drag-and-drop */}
        <div className="flex-1 overflow-y-auto p-2">
          {blocks.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
              <p>블록이 없습니다</p>
              <button className="btn-secondary mt-3 text-xs" onClick={loadDemoBlocks}>데모 불러오기</button>
            </div>
          ) : (
            <BlockSortable
              blocks={blocks}
              onReorder={handleReorder}
              onToggle={handleToggle}
              onEdit={(block) => setEditingBlock(block)}
            />
          )}
        </div>

        {/* Export actions */}
        <div className="p-3 border-t border-ax-border space-y-2">
          <button className="btn-primary w-full text-sm" onClick={() => handleExport('html')}>
            HTML 내보내기
          </button>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1 text-xs" onClick={() => handleExport('image')}>이미지 (쿠팡)</button>
            <button className="btn-secondary flex-1 text-xs" disabled>영상 내보내기</button>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1 text-xs" onClick={handleDuplicate}>복제</button>
            <button className="btn-secondary flex-1 text-xs" onClick={handleSaveTemplate}>템플릿 저장</button>
          </div>
        </div>
      </div>

      {/* Right panel — preview */}
      <div className="flex-1 bg-gray-100 overflow-auto">
        {/* Tab bar */}
        <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 max-w-[520px] mx-auto">
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-ax-border flex-1">
              {(['preview', 'json', 'output'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                    activeTab === tab ? 'bg-gray-100 font-medium' : 'text-gray-400'
                  }`}
                >
                  {{ preview: '미리보기', json: 'JSON', output: '출력' }[tab]}
                </button>
              ))}
            </div>
            {hasMultiLang && (
              <div className="flex gap-1">
                {(['ko', 'en', 'zh'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setActiveLanguage(lang)}
                    className={`px-2 py-1.5 text-[10px] rounded-md border transition-colors ${
                      activeLanguage === lang ? 'bg-blue-50 text-blue-600 border-blue-200 font-medium' : 'text-gray-400 border-gray-200'
                    }`}
                  >
                    {{ ko: '한국어', en: 'EN', zh: '中文' }[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center pb-8 px-6">
          <div className="w-[420px]">
            {activeTab === 'preview' && (
              <div className="bg-white rounded-xl border border-ax-border overflow-hidden shadow-sm">
                {visibleBlocks.length === 0 ? (
                  <div className="py-24 text-center text-sm text-gray-400">미리보기할 블록이 없습니다</div>
                ) : (
                  visibleBlocks.map((block) => {
                    const langBlock = (hasMultiLang && block.multiLangData?.[activeLanguage])
                      ? { ...block, data: block.multiLangData[activeLanguage] }
                      : block;
                    return (
                      <div key={block.id}>
                        {renderBlock(langBlock, 'dark')}
                        <div className="h-[0.5px] bg-gray-100" />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'json' && (
              <div className="bg-white rounded-xl border border-ax-border p-4">
                <pre className="text-[11px] text-gray-600 overflow-auto max-h-[80vh] whitespace-pre-wrap font-mono">
                  {JSON.stringify(blocks, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'output' && (
              <div className="bg-white rounded-xl border border-ax-border p-4">
                <OutputGallery projectId={projectId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block editor modal */}
      {editingBlock && (
        <BlockEditor
          block={editingBlock}
          onSave={handleBlockSave}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
}
