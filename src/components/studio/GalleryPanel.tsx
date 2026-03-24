'use client';

import { useState, useEffect } from 'react';
import { BlockDefinition } from '@/types/block';
import { BLOCK_NAMES } from '@/components/blocks';

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  workflow: string;
  prompt_ko: string | null;
  fileUrl: string;
  file_size: number;
  width: number | null;
  height: number | null;
  assigned_block_id: string | null;
  assigned_field: string | null;
  created_at: number;
}

interface GalleryPanelProps {
  projectId: string;
  blocks: BlockDefinition[];
  onBlocksUpdate: () => void;
  selectMode?: boolean;
  selectType?: 'image' | 'video' | null;
  onSelect?: (item: GalleryItem) => void;
  compact?: boolean;
}

const WORKFLOW_LABELS: Record<string, string> = {
  'flux-t2i': 'Flux T2I',
  't2i-flux': 'Flux T2I',
  'bg-flux': '배경',
  'rmbg': '배경 제거',
  'img2img': '이미지 변환',
  'kling-t2i': 'Kling 이미지',
  'kling-i2i': 'Kling I2I',
  'wan22-i2v-high': 'Wan I2V',
  'wan22-i2v-low': 'Wan I2V (약)',
  'wan22-t2v': 'Wan T2V',
  'sv3d-360': '360°',
  'kling-i2v': 'Kling 영상',
  'kling-t2v': 'Kling T2V',
  'rotate-360': '360°',
  'before-after': 'B/A',
  'upload': '업로드',
};

export default function GalleryPanel({ projectId, blocks, onBlocksUpdate, selectMode, selectType, onSelect, compact }: GalleryPanelProps) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadGallery(); }, [projectId]);

  async function loadGallery() {
    try {
      const res = await fetch(`/api/studio/gallery?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setGallery(data.items || []);
      }
    } catch {}
  }

  // 외부에서 리로드를 트리거할 수 있도록
  useEffect(() => {
    const handler = () => loadGallery();
    window.addEventListener('gallery-reload', handler);
    return () => window.removeEventListener('gallery-reload', handler);
  }, [projectId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append('projectId', projectId);
      fd.append('file', files[i]);
      try { await fetch('/api/studio/upload', { method: 'POST', body: fd }); } catch {}
    }
    await loadGallery();
    e.target.value = '';
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const filtered = selectType ? gallery.filter(g => g.type === selectType) : gallery;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(g => g.id)));
    }
  }

  async function downloadItem(item: GalleryItem) {
    const res = await fetch(item.fileUrl);
    const blob = await res.blob();
    const ext = item.type === 'video' ? 'mp4' : 'png';
    const name = `${item.prompt_ko || item.workflow}_${item.id.slice(0, 6)}.${ext}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function downloadSelected() {
    const items = gallery.filter(g => selectedIds.has(g.id));
    for (const item of items) {
      await downloadItem(item);
    }
  }

  async function handleDelete(itemId: string) {
    await fetch(`/api/studio/gallery/${itemId}`, { method: 'DELETE' });
    selectedIds.delete(itemId);
    await loadGallery();
    onBlocksUpdate();
  }

  async function handleAssign(galleryItemId: string, blockId: string, field: string) {
    await fetch('/api/studio/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ galleryItemId, blockId, field }),
    });
    setAssigningId(null);
    await loadGallery();
    onBlocksUpdate();
  }

  function getAssignableSlots() {
    const slots: { blockId: string; field: string; label: string }[] = [];
    for (const block of blocks) {
      const d = block.data as any;
      const name = BLOCK_NAMES[block.type] || block.type;

      if (block.type === 'image_block') {
        slots.push({ blockId: block.id, field: 'imageUrl', label: `${name} #${block.order + 1}` });
      }
      if (block.type === 'video_block') {
        slots.push({ blockId: block.id, field: 'videoUrl', label: `${name} #${block.order + 1}` });
      }
      if (block.type === 'hero') {
        slots.push({ blockId: block.id, field: 'heroImageUrl', label: `${name} → 메인 이미지` });
      }
      if (block.type === 'feature') {
        const items = d.features || d.items || [];
        items.forEach((item: any, i: number) => {
          const arrKey = d.features ? 'features' : 'items';
          slots.push({ blockId: block.id, field: `${arrKey}.${i}.imageUrl`, label: `${name} → ${item.title || `항목 ${i + 1}`}` });
        });
      }
    }
    return slots;
  }

  const images = gallery.filter(g => g.type === 'image');
  const videos = gallery.filter(g => g.type === 'video');
  const filtered = selectType ? gallery.filter(g => g.type === selectType) : gallery;

  const gridCols = compact ? 'grid-cols-3 gap-1.5' : 'grid-cols-4 gap-3';

  return (
    <div className={compact ? 'overflow-y-auto p-3' : 'overflow-y-auto p-6'} style={compact ? { maxHeight: 400 } : {}}>
      <div className={compact ? '' : 'max-w-3xl mx-auto'}>
        {/* 헤더 */}
        {!compact && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{selectMode ? '에셋 선택' : '갤러리'}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectMode
                  ? '사용할 에셋을 선택하세요'
                  : `이미지 ${images.length}개 · 동영상 ${videos.length}개`
                }
              </p>
            </div>
            {!selectMode && (
              <div className="flex gap-2">
                {selectedIds.size > 0 && (
                  <button onClick={downloadSelected} className="btn-secondary text-xs flex items-center gap-1 px-3">
                    다운로드 ({selectedIds.size})
                  </button>
                )}
                <label className="btn-secondary text-sm cursor-pointer flex items-center gap-1.5 px-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  업로드
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* compact 모드 업로드 */}
        {compact && !selectMode && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-400">{images.length}개 이미지 · {videos.length}개 영상</span>
            <label className="text-[10px] text-blue-600 cursor-pointer hover:underline">
              업로드
              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}

        {/* 전체 선택 */}
        {!selectMode && !compact && filtered.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="rounded"
              />
              전체 선택
            </label>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className={`text-center text-sm text-gray-400 ${compact ? 'py-8' : 'py-20'}`}>
            <p>갤러리가 비어 있습니다</p>
            <p className="text-xs mt-1">생성소에서 만들거나 직접 업로드하세요</p>
          </div>
        ) : (
          <div className={`grid ${gridCols}`}>
            {filtered.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden group relative bg-white">
                {/* 썸네일 */}
                <div className="aspect-square bg-gray-50 relative">
                  {item.type === 'image' ? (
                    <img src={item.fileUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <video src={item.fileUrl} className="w-full h-full object-contain" muted />
                  )}
                  {/* 태그 */}
                  <div className="absolute top-1.5 left-1.5 flex gap-1">
                    <span className="text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                      {WORKFLOW_LABELS[item.workflow] || item.workflow}
                    </span>
                    {item.type === 'video' && (
                      <span className="text-[9px] bg-purple-500/80 text-white px-1.5 py-0.5 rounded">영상</span>
                    )}
                  </div>
                  {item.assigned_block_id && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded">배정됨</span>
                  )}
                </div>

                {/* 정보 */}
                <div className="p-2">
                  <p className="text-[10px] text-gray-500 truncate">{item.prompt_ko || '업로드'}</p>
                </div>

                {/* 선택 체크박스 (갤러리 모드) */}
                {!selectMode && (
                  <label className="absolute top-1.5 left-1.5 z-10 cursor-pointer" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded"
                    />
                  </label>
                )}

                {/* 호버 액션 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {selectMode && onSelect ? (
                    <button
                      onClick={() => onSelect(item)}
                      className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg shadow hover:bg-blue-600"
                    >
                      선택
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setAssigningId(item.id)}
                        className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded shadow hover:bg-blue-600"
                      >
                        블록에 넣기
                      </button>
                      <button
                        onClick={() => downloadItem(item)}
                        className="px-2 py-1 bg-green-500 text-white text-[10px] rounded shadow hover:bg-green-600"
                      >
                        다운로드
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1 bg-red-500 text-white text-[10px] rounded shadow hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 블록 배정 모달 */}
      {assigningId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setAssigningId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-80 max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-medium">블록에 넣기</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">대상 블록을 선택하세요</p>
            </div>
            <div className="p-2">
              {getAssignableSlots().map(slot => (
                <button
                  key={`${slot.blockId}-${slot.field}`}
                  onClick={() => handleAssign(assigningId!, slot.blockId, slot.field)}
                  className="w-full text-left px-3 py-2 text-[12px] rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {slot.label}
                </button>
              ))}
              {getAssignableSlots().length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-4">이미지/동영상 블록을 먼저 추가하세요</p>
              )}
            </div>
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => setAssigningId(null)} className="btn-secondary w-full text-xs">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
