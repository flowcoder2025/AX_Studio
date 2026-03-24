'use client';

import { useState, useEffect } from 'react';
import { CATEGORIES, CategoryId, getCategoryList } from '@/lib/templates/categories';

interface ProjectItem {
  id: string;
  name: string;
  category: string;
  mode: string;
  status: string;
  created_at: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [productName, setProductName] = useState('');
  const [mode, setMode] = useState<'simple' | 'detailed' | 'remake'>('simple');
  const [creating, setCreating] = useState(false);
  const [specData, setSpecData] = useState<any>(null);
  const [specParsing, setSpecParsing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [remakeStyle, setRemakeStyle] = useState('premium');
  const [addVideo, setAddVideo] = useState(true);
  const [keyFeatures, setKeyFeatures] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [languages, setLanguages] = useState<string[]>(['ko']);

  const categories = getCategoryList();

  useEffect(() => { loadProjects(); loadTemplates(); }, []);

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {}
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {}
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);

    try {
      let res;
      if (mode === 'remake') {
        if (!sourceUrl) { setCreating(false); return; }
        res = await fetch('/api/pipeline/remake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceUrl,
            category: selectedCategory || undefined,
            style: remakeStyle,
            addVideo,
          }),
        });
      } else {
        if (!selectedCategory || !productName) { setCreating(false); return; }

        res = await fetch('/api/pipeline/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode, category: selectedCategory, productName,
            keyFeatures: keyFeatures || undefined,
            languages: languages.length > 0 ? languages : ['ko'],
            ...(specData ? {
              specSheet: specData.specs,
              reviews: specData.reviews,
              certifications: specData.certifications,
              priceOptions: specData.priceOptions,
            } : {}),
          }),
        });
      }
      const data = await res.json();
      if (data.projectId) {
        const query = data.pipelineId ? `?pipeline=${data.pipelineId}` : '';
        window.location.href = `/projects/${data.projectId}${query}`;
      }
    } catch (e) {
      console.error('Create failed:', e);
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('프로젝트를 삭제하시겠습니까?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">프로젝트</h2>
          <p className="text-sm text-gray-500 mt-0.5">상세페이지 생성 프로젝트 관리</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(!showNew)}>+ 새 프로젝트</button>
      </div>

      {showNew && (
        <div className="card mb-6">
          <h3 className="text-base font-medium mb-4">새 프로젝트 생성</h3>

          {/* Mode */}
          <div className="flex gap-2 mb-4">
            {[
              { v: 'simple', l: 'A. 간편 입력' },
              { v: 'detailed', l: 'B. 상세 입력' },
              { v: 'remake', l: 'C. URL 리메이크' },
            ].map((m) => (
              <button key={m.v} onClick={() => setMode(m.v as any)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${mode === m.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                {m.l}
              </button>
            ))}
          </div>

          {/* Product name */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 block mb-1">제품명</label>
            <input type="text" className="input" placeholder="예: V12 프로 무선청소기"
              value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>

          {/* Key features */}
          {(mode === 'simple' || mode === 'detailed') && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1">핵심 특징</label>
              <input type="text" className="input" placeholder="예: 6D 자유회전 헤드, IPX7 완전방수, 60분 연속사용"
                value={keyFeatures} onChange={(e) => setKeyFeatures(e.target.value)} />
              <p className="text-[10px] text-gray-400 mt-1">쉼표로 구분하면 더 정확한 카피가 생성됩니다</p>
            </div>
          )}

          {/* 이미지 안내 */}
          {(mode === 'simple' || mode === 'detailed') && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-[11px] text-blue-700">이미지/영상은 카피 생성 후 <strong>생성소 탭</strong>에서 추가할 수 있습니다.</p>
            </div>
          )}

          {/* Mode C: URL Remake */}
          {mode === 'remake' && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1">기존 상세페이지 URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://smartstore.naver.com/brand/products/12345"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <select className="input text-sm flex-1" value={remakeStyle} onChange={(e) => setRemakeStyle(e.target.value)}>
                  <option value="premium">프리미엄</option>
                  <option value="casual">캐주얼</option>
                  <option value="trust-focused">신뢰 중심</option>
                </select>
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  <input type="checkbox" checked={addVideo} onChange={(e) => setAddVideo(e.target.checked)} />
                  영상 추가
                </label>
              </div>
            </div>
          )}

          {/* Mode B: Excel upload */}
          {mode === 'detailed' && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1">스펙시트 업로드</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="input text-sm"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSpecParsing(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    const res = await fetch('/api/parse/excel', { method: 'POST', body: fd });
                    const data = await res.json();
                    setSpecData(data);
                    if (data.productName && !productName) setProductName(data.productName);
                  } catch (err) {
                    console.error('Excel parse failed:', err);
                  }
                  setSpecParsing(false);
                }}
              />
              {specParsing && <p className="text-xs text-blue-500 mt-1">파싱 중...</p>}
              {specData && (
                <div className="bg-gray-50 rounded-lg p-3 mt-2 text-xs text-gray-500">
                  <p>스펙 {Object.keys(specData.specs || {}).length}개 항목 파싱 완료</p>
                  {specData.reviews && <p>리뷰 {specData.reviews.length}개</p>}
                  {specData.certifications && <p>인증 {specData.certifications.length}개</p>}
                  {specData.priceOptions && <p>가격옵션 {specData.priceOptions.length}개</p>}
                </div>
              )}
            </div>
          )}

          {/* Category grid */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 block mb-2">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-2 rounded-lg text-left text-sm border transition-colors ${selectedCategory === cat.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="font-medium text-xs">{cat.nameKo}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">{cat.subcategories}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Template selection */}
          {templates.length > 0 && mode !== 'remake' && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1">또는 저장된 템플릿에서</label>
              <select className="input text-sm" defaultValue="" onChange={(e) => {
                const tpl = templates.find((t: any) => t.id === e.target.value);
                if (tpl) {
                  setSelectedCategory(tpl.category);
                }
              }}>
                <option value="">기본 카테고리 순서 사용</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {selectedCategory && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-500">
              <div className="flex gap-1 mb-1">{CATEGORIES[selectedCategory].tone.map((t) => (
                <span key={t} className="badge badge-blue">{t}</span>
              ))}</div>
              <div>블록 {CATEGORIES[selectedCategory].blockOrder.length}개 · 영상 {CATEGORIES[selectedCategory].videoSlots.length}종</div>
            </div>
          )}

          {/* Language selection */}
          {mode !== 'remake' && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 block mb-1">카피 언어</label>
              <div className="flex gap-2">
                {[
                  { value: 'ko', label: '한국어' },
                  { value: 'en', label: 'English' },
                  { value: 'zh', label: '中文' },
                ].map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      setLanguages(prev =>
                        prev.includes(lang.value)
                          ? prev.filter(l => l !== lang.value)
                          : [...prev, lang.value]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      languages.includes(lang.value)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="btn-primary w-full" disabled={creating || (mode === 'remake' ? !sourceUrl : (!selectedCategory || !productName))} onClick={handleCreate}>
            {creating ? '생성 중...' : '생성 시작'}
          </button>
        </div>
      )}

      {/* Project list */}
      {projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <a href={`/projects/${p.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'complete' ? 'bg-green-500' : p.status === 'error' ? 'bg-red-400' : p.status === 'draft' ? 'bg-gray-300' : 'bg-amber-400 animate-pulse'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.status !== 'complete' && p.status !== 'draft' && p.status !== 'error' && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">진행 중</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">{CATEGORIES[p.category as CategoryId]?.nameKo || p.category} · {p.mode} · {new Date(p.created_at * 1000).toLocaleDateString('ko')}</p>
                  </div>
                </div>
              </a>
              <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-400 text-xs ml-4">삭제</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12 text-sm text-gray-400">프로젝트가 없습니다</div>
      )}
    </div>
  );
}
