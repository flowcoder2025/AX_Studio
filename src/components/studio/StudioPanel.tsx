'use client';

import { useState, useEffect } from 'react';

interface StudioPanelProps {
  projectId: string;
  onGenerated: () => void;
}

// 워크플로우 정의
const IMAGE_WORKFLOWS = [
  { id: 'flux-t2i', name: '텍스트→이미지', desc: '프롬프트로 이미지 생성',
    tip: '제품 외형, 색상, 재질, 배경을 구체적으로 묘사할수록 정확한 이미지가 생성됩니다.\n예: "매끈한 무광 검정 차량용 청소기, 흰색 배경, 스튜디오 조명"',
    needsText: true, needsImage: false, paid: false },
  { id: 'rmbg', name: '배경 제거', desc: '이미지에서 배경을 투명하게',
    tip: '사진에서 가장 눈에 띄는 물체를 자동으로 전경으로 판단합니다.\n• 배경이 단순할수록(흰색, 단색) 정확도가 높습니다\n• 여러 물체가 있으면 전부 전경으로 남습니다\n• 제품 단독 사진이 가장 좋은 결과를 냅니다',
    needsText: false, needsImage: true, paid: false },
  { id: 'img2img', name: '배경/스타일 변경', desc: '이미지 구도 유지하며 배경·스타일 변경',
    tip: '원본 이미지의 구도를 유지하면서 배경이나 스타일을 변경합니다.\n프롬프트로 원하는 변환 방향을 설명하세요.\n예: "대리석 배경 위에 고급스러운 조명"\n• 구도/형태가 유지됩니다 — 새로운 장면 생성은 "장면 생성"을 사용하세요',
    needsText: true, needsImage: true, paid: false },
  { id: 'ipadapter', name: '장면 생성 (Klein 4B)', desc: '제품 이미지 + 프롬프트로 사용 장면 생성',
    tip: 'FLUX.2 Klein 4B Edit 모델로 제품의 사용 장면을 생성합니다.\n제품 사진과 원하는 장면을 프롬프트로 설명하세요.\n예: "트렁크를 청소하는 남성" → 제품을 사용하는 장면\n• 4B 모델 한계: 손가락, 제품 디테일이 부정확할 수 있음',
    needsText: true, needsImage: true, paid: false },
  { id: 'kling-t2i', name: '텍스트→이미지', desc: 'Kling 3.0으로 고품질 이미지 생성',
    tip: 'Kling 3.0 AI로 고품질 이미지를 생성합니다.\n로컬 생성보다 높은 품질을 제공하지만 크레딧이 차감됩니다.',
    needsText: true, needsImage: false, paid: true },
  { id: 'kling-i2i', name: '이미지→이미지', desc: 'Kling 3.0으로 이미지 변환',
    tip: 'Kling 3.0 AI로 이미지를 변환합니다.\n원본 이미지의 특성을 유지하면서 고품질로 변환합니다. 크레딧 차감.',
    needsText: true, needsImage: true, paid: true },
];

const VIDEO_WORKFLOWS = [
  { id: 'wan22-i2v-high', name: '이미지→영상 (모션 큼)', desc: '큰 움직임으로 영상 생성',
    tip: '이미지를 기반으로 큰 움직임이 있는 영상을 생성합니다.\n프롬프트로 원하는 모션을 설명하세요.\n예: "제품이 회전하면서 기능을 보여줌"\n• 원본 이미지와 다소 달라질 수 있습니다',
    needsText: true, needsImage: true, paid: false },
  { id: 'wan22-i2v-low', name: '이미지→영상 (모션 작음)', desc: '원본 유지하며 약간의 모션',
    tip: '원본 이미지를 최대한 유지하면서 미세한 모션을 추가합니다.\n예: 부드러운 카메라 이동, 미세한 반짝임, 약간의 줌 효과 등\n• 원본 이미지에 가장 가까운 결과를 원할 때 사용하세요',
    needsText: true, needsImage: true, paid: false },
  { id: 'wan22-t2v', name: '텍스트→영상', desc: '프롬프트만으로 영상 생성',
    tip: '텍스트 설명만으로 영상을 생성합니다. 이미지 입력이 필요 없습니다.\n장면을 구체적으로 묘사하세요.\n예: "깨끗한 화이트 배경에서 검정 청소기가 천천히 회전하는 모습"',
    needsText: true, needsImage: false, paid: false },
  { id: 'sv3d-360', name: '360° 회전', desc: '제품 이미지를 회전 영상으로',
    tip: '제품 정면 사진 1장으로 360° 회전 영상을 생성합니다.\n• 제품 단독 사진이 가장 좋습니다 (부속품 제외)\n• 배경이 깨끗한 사진이 정확합니다\n• 뒷면은 AI가 추측하므로 단순한 형태의 제품에 적합합니다',
    needsText: false, needsImage: true, paid: false },
  { id: 'kling-i2v', name: '이미지→영상', desc: 'Kling 3.0 고품질 영상',
    tip: 'Kling 3.0 AI로 고품질 모션 영상을 생성합니다.\n로컬 생성보다 높은 해상도(1080p)와 자연스러운 모션을 제공합니다. 크레딧 차감.',
    needsText: true, needsImage: true, paid: true },
  { id: 'kling-t2v', name: '텍스트→영상', desc: 'Kling 3.0 텍스트→영상',
    tip: 'Kling 3.0 AI로 텍스트만으로 고품질 영상을 생성합니다. 크레딧 차감.',
    needsText: true, needsImage: false, paid: true },
];

export default function StudioPanel({ projectId, onGenerated }: StudioPanelProps) {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [selectedWf, setSelectedWf] = useState('flux-t2i');
  const [promptKo, setPromptKo] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [galleryImageId, setGalleryImageId] = useState<string | null>(null); // 갤러리에서 선택한 이미지 ID
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');

  const workflows = mode === 'image' ? IMAGE_WORKFLOWS : VIDEO_WORKFLOWS;
  const wf = workflows.find(w => w.id === selectedWf) || workflows[0];

  function handleModeChange(newMode: 'image' | 'video') {
    setMode(newMode);
    setSelectedWf(newMode === 'image' ? 'flux-t2i' : 'wan22-i2v-high');
    setUploadFile(null);
    setUploadPreview(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  }

  function clearFile() {
    setUploadFile(null);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(null);
    setGalleryImageId(null);
  }

  async function handleGenerate() {
    if (generating) return;
    if (wf.needsText && !promptKo.trim()) { setGenStatus('프롬프트를 입력해주세요'); return; }
    if (wf.needsImage && !uploadFile && !galleryImageId) { setGenStatus('이미지를 업로드하거나 갤러리에서 선택해주세요'); return; }

    setGenerating(true);

    try {
      // 이미지 입력 결정: 갤러리 선택 or 파일 업로드
      let inputImageId: string | undefined;
      if (wf.needsImage && galleryImageId) {
        inputImageId = galleryImageId;
      } else if (wf.needsImage && uploadFile) {
        setGenStatus('이미지 업로드 중...');
        const fd = new FormData();
        fd.append('projectId', projectId);
        fd.append('file', uploadFile);
        const uploadRes = await fetch('/api/studio/upload', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        if (!uploadData.galleryItem?.id) {
          setGenStatus('업로드 실패');
          setGenerating(false);
          return;
        }
        inputImageId = uploadData.galleryItem.id;
      }

      setGenStatus(wf.needsText ? '프롬프트 번역 + 생성 중...' : '생성 중...');

      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          workflow: selectedWf,
          promptKo: promptKo || '',
          inputImage: inputImageId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setGenStatus(`오류: ${err.error}`);
        setGenerating(false);
        return;
      }

      setGenStatus('완료! 갤러리에서 확인하세요.');
      onGenerated();
      setTimeout(() => setGenStatus(''), 3000);
    } catch (e: any) {
      setGenStatus(`오류: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <h3 className="text-lg font-semibold">생성소</h3>

        {/* 모드 선택 */}
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange('image')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
              mode === 'image' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'
            }`}
          >
            이미지 생성
          </button>
          <button
            onClick={() => handleModeChange('video')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
              mode === 'video' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'
            }`}
          >
            동영상 생성
          </button>
        </div>

        {/* 워크플로우 선택 */}
        <div>
          <label className="text-xs text-gray-500 block mb-2">워크플로우 선택</label>
          <div className="space-y-1.5">
            {workflows.map(w => (
              <button
                key={w.id}
                onClick={() => { setSelectedWf(w.id); clearFile(); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedWf === w.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{w.name}</span>
                  {w.paid && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">유료</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{w.desc}</p>
              </button>
            ))}
          </div>
          {/* 선택된 워크플로우 툴팁 */}
          {wf.tip && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[11px] text-gray-600 whitespace-pre-line leading-relaxed">{wf.tip}</p>
            </div>
          )}
        </div>

        {/* 소스 이미지 (필요한 워크플로우만) */}
        {wf.needsImage && (
          <div>
            <label className="text-xs text-gray-500 block mb-2">소스 이미지</label>
            {uploadPreview ? (
              <div className="relative inline-block">
                <img src={uploadPreview} alt="" className="h-40 rounded-lg border border-gray-200 object-contain" />
                <button
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors">
                  <svg className="w-5 h-5 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[11px] text-gray-400">파일 업로드</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <button
                  onClick={() => setShowGalleryPicker(true)}
                  className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-5 h-5 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[11px] text-gray-400">갤러리에서 선택</p>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 프롬프트 (필요한 워크플로우만) */}
        {wf.needsText && (
          <div>
            <label className="text-xs text-gray-500 block mb-2">프롬프트 (한글)</label>
            <textarea
              className="input text-sm"
              rows={3}
              placeholder={mode === 'image'
                ? '예: 매끈한 무광 검정 차량용 청소기, 흰색 배경, 스튜디오 조명'
                : '예: 제품이 천천히 회전하면서 기능을 보여주는 영상'
              }
              value={promptKo}
              onChange={e => setPromptKo(e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-1">한글로 입력하면 영어로 자동 번역됩니다</p>
          </div>
        )}

        {/* 생성 버튼 */}
        <button
          className="btn-primary w-full py-3 text-sm"
          disabled={generating}
          onClick={handleGenerate}
        >
          {generating ? genStatus || '생성 중...' : `${wf.paid ? '(유료) ' : ''}생성하기`}
        </button>

        {genStatus && !generating && (
          <p className={`text-xs text-center ${genStatus.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>{genStatus}</p>
        )}
      </div>

      {/* 갤러리에서 소스 이미지 선택 모달 */}
      {showGalleryPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]" onClick={() => setShowGalleryPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-medium">갤러리에서 소스 이미지 선택</h4>
            </div>
            <GalleryMiniPicker
              projectId={projectId}
              onSelect={(item) => {
                setGalleryImageId(item.id);
                setUploadPreview(item.fileUrl);
                setUploadFile(null);
                setShowGalleryPicker(false);
              }}
            />
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => setShowGalleryPicker(false)} className="btn-secondary w-full text-xs">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 간단한 갤러리 이미지 선택기 (생성소 내부용)
function GalleryMiniPicker({ projectId, onSelect }: { projectId: string; onSelect: (item: { id: string; fileUrl: string }) => void }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/api/studio/gallery?projectId=${projectId}`)
      .then(r => r.json())
      .then(d => setItems((d.items || []).filter((i: any) => i.type === 'image')))
      .catch(() => {});
  }, [projectId]);

  if (items.length === 0) return <div className="p-8 text-center text-sm text-gray-400">갤러리에 이미지가 없습니다</div>;

  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      {items.map((item: any) => (
        <button
          key={item.id}
          onClick={() => onSelect({ id: item.id, fileUrl: item.fileUrl })}
          className="aspect-square bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 overflow-hidden transition-colors"
        >
          <img src={item.fileUrl} alt="" className="w-full h-full object-contain" />
        </button>
      ))}
    </div>
  );
}
