# AX Studio — 미구현 항목 구현 가이드

> 기존 코드베이스의 패턴, 파일 경로, 함수명을 정확히 참조합니다.
> Claude Code에 이 문서를 컨텍스트로 주고 "1번 구현해줘" 하면 바로 작업 가능합니다.

---

## 1. Mode B — 엑셀 파싱

### 개요
사용자가 엑셀 스펙시트를 업로드하면 → SheetJS로 파싱 → JSON 변환 → 기존 파이프라인에 주입.

### 필요 패키지
```bash
npm install xlsx
npm install -D @types/xlsx
```

### 구현 파일

#### 1-1. 엑셀 파서 유틸리티
**파일**: `src/lib/utils/excel-parser.ts`

```typescript
import * as XLSX from 'xlsx';
import fs from 'fs';

// 엑셀 파일 → 구조화된 제품 데이터 변환
export function parseSpecSheet(filePath: string): ParsedSpec {
  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: 'buffer' });
  
  // 첫 번째 시트 사용
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
  
  // key-value 형태 감지 (A열=항목명, B열=값)
  if (rows.length > 0 && Object.keys(rows[0]).length === 2) {
    return parseKeyValueSheet(rows);
  }
  
  // 테이블 형태 감지 (헤더행 + 데이터행)
  return parseTableSheet(rows);
}

interface ParsedSpec {
  specs: Record<string, string>;     // 제품 사양 key-value
  reviews?: { rating: number; text: string }[];
  certifications?: string[];
  priceOptions?: { name: string; price: string; description: string }[];
  rawData: Record<string, any>[];    // 원본 데이터
}
```

**핵심 로직**: 엑셀 시트 구조를 자동 감지해야 합니다.
- 2열 구조 (항목/값) → `specs`에 직접 매핑
- 다열 구조 → Claude에 JSON으로 넘겨서 의미 파악 요청
- 시트가 여러 개면 시트명으로 구분: "스펙", "리뷰", "가격" 등

#### 1-2. Claude 파싱 보조 프롬프트
**파일**: `src/lib/claude/prompts/index.ts`에 추가

```typescript
export function buildExcelParsingPrompt(rawData: Record<string, any>[]): string {
  return `You are a product data parser. This is raw data extracted from a Korean e-commerce product spec sheet.

Raw data (first 20 rows):
${JSON.stringify(rawData.slice(0, 20), null, 2)}

Parse this into structured product data. Return JSON:
{
  "productName": "제품명",
  "specs": { "항목": "값", ... },
  "reviews": [{ "rating": 5, "text": "..." }] or null,
  "certifications": ["인증1"] or null,
  "priceOptions": [{ "name": "옵션명", "price": "가격", "description": "설명" }] or null,
  "keyFeatures": "핵심 특징 요약"
}

Respond ONLY with valid JSON.`;
}
```

#### 1-3. API 라우트
**파일**: `src/app/api/parse/excel/route.ts` (신규)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseSpecSheet } from '@/lib/utils/excel-parser';
import { sendMessage } from '@/lib/claude/client';
import { buildExcelParsingPrompt } from '@/lib/claude/prompts';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  // multipart/form-data로 파일 수신
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  // 임시 저장
  const tempPath = path.join(process.cwd(), 'output', 'temp', `upload_${Date.now()}.xlsx`);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(tempPath, buf);
  
  // SheetJS 파싱
  const parsed = parseSpecSheet(tempPath);
  
  // Claude로 구조화 보완
  const prompt = buildExcelParsingPrompt(parsed.rawData);
  const res = await sendMessage([{ role: 'user', content: prompt }], {
    system: 'You are a product data parser. Respond with valid JSON only.'
  });
  const structured = JSON.parse(
    res.content.find(c => c.type === 'text')?.text?.replace(/```json\n?|```/g, '').trim() || '{}'
  );
  
  // 임시 파일 삭제
  await fs.unlink(tempPath).catch(() => {});
  
  return NextResponse.json({ ...parsed, ...structured });
}
```

#### 1-4. 프로젝트 생성 UI 연동
**파일**: `src/app/projects/page.tsx` 수정

Mode B 선택 시 보여줄 엑셀 업로드 영역 추가:
```typescript
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
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/parse/excel', { method: 'POST', body: fd });
        const data = await res.json();
        // data.specs, data.reviews 등을 프로젝트 입력에 병합
        setSpecData(data);
      }}
    />
  </div>
)}
```

#### 1-5. 파이프라인 연동
**파일**: `src/lib/pipeline/engine.ts`의 `runPipeline()` 함수

Step 1 (분석) 부분에서 `input.specSheet`이 있으면 분석 프롬프트에 스펙 데이터를 포함:
```typescript
// 기존 buildAnalysisPrompt 호출 앞에 추가
if (input.specSheet && Object.keys(input.specSheet).length > 0) {
  // specs를 분석 프롬프트에 직접 주입
  const specString = Object.entries(input.specSheet)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  // buildAnalysisPrompt의 keyFeatures 인자에 합침
  input.keyFeatures = (input.keyFeatures || '') + '\n\n[스펙시트 데이터]\n' + specString;
}
```

---

## 2. Mode C — URL 리메이크

### 개요
기존 상세페이지 URL → Puppeteer 스크래핑 → Claude 분석/리메이크 전략 → 새 블록 생성.
Puppeteer `scrapeUrl()` 함수가 이미 `src/lib/puppeteer/renderer.ts`에 구현되어 있습니다.

### 구현 파일

#### 2-1. URL 리메이크 API 라우트
**파일**: `src/app/api/pipeline/remake/route.ts` (신규)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/puppeteer/renderer';
import { sendMessage } from '@/lib/claude/client';
import { createPipeline, runPipeline } from '@/lib/pipeline/engine';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const { sourceUrl, category, style, addVideo, targetPlatform } = await req.json();
  
  // 1. Puppeteer 스크래핑 (기존 함수 활용)
  const scraped = await scrapeUrl(sourceUrl);
  
  // 2. Claude로 기존 페이지 분석
  const analysisPrompt = buildRemakeAnalysisPrompt(scraped.texts, scraped.images);
  const analysisRes = await sendMessage(
    [{ role: 'user', content: analysisPrompt }],
    { system: 'You are a Korean e-commerce page analyst. Respond with valid JSON only.' }
  );
  const analysis = JSON.parse(/* ... */);
  
  // 3. 프로젝트 생성 + 파이프라인 시작
  const projectId = uuid();
  db.createProject(projectId, analysis.productName || 'URL 리메이크', category, 'remake');
  const pipelineId = createPipeline(projectId);
  
  // 4. 파이프라인 실행 (분석 결과를 input에 주입)
  runPipeline(pipelineId, projectId, {
    mode: 'remake',
    category,
    productName: analysis.productName,
    keyFeatures: analysis.keyFeatures,
    // scraped 이미지들을 다운로드해서 productImages로 전달
    productImages: await downloadScrapedImages(scraped.images, projectId),
  }).catch(console.error);
  
  return NextResponse.json({ projectId, pipelineId, analysis });
}
```

#### 2-2. 리메이크 분석 프롬프트
**파일**: `src/lib/claude/prompts/index.ts`에 추가

```typescript
export function buildRemakeAnalysisPrompt(
  texts: string[],
  imageUrls: string[]
): string {
  return `You are an e-commerce detail page analyst. Analyze this existing product page content.

Extracted text (from the page):
${texts.slice(0, 100).join('\n')}

Number of images found: ${imageUrls.length}

Analyze and return JSON:
{
  "productName": "제품명",
  "category": "추천 카테고리 (grooming/beauty/food/living_appliance/...)",
  "keyFeatures": "핵심 특징",
  "existingBlocks": ["hero", "feature", ...],    // 현재 페이지에서 감지된 블록 타입
  "missingBlocks": ["video_360", ...],            // 추가하면 좋을 블록
  "improvements": ["개선점1", "개선점2"],          // 리메이크 시 개선할 점
  "specs": { "항목": "값" },                       // 감지된 스펙
  "toneAnalysis": "현재 톤 분석",
  "remakeStrategy": "리메이크 전략 요약"
}

Respond ONLY with valid JSON.`;
}
```

#### 2-3. 이미지 다운로드 헬퍼
**파일**: `src/lib/utils/image-downloader.ts` (신규)

```typescript
import fs from 'fs/promises';
import path from 'path';

export async function downloadScrapedImages(
  imageUrls: string[],
  projectId: string,
  maxImages = 5
): Promise<string[]> {
  const dir = path.join(process.cwd(), 'output', projectId, 'scraped');
  await fs.mkdir(dir, { recursive: true });
  
  const downloaded: string[] = [];
  for (const url of imageUrls.slice(0, maxImages)) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const filePath = path.join(dir, `img_${downloaded.length}.${ext}`);
      await fs.writeFile(filePath, buf);
      downloaded.push(filePath);
    } catch { /* skip failed downloads */ }
  }
  return downloaded;
}
```

#### 2-4. 프로젝트 생성 UI
**파일**: `src/app/projects/page.tsx` 수정

Mode C 선택 시:
```typescript
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
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={addVideo} onChange={(e) => setAddVideo(e.target.checked)} />
        영상 추가
      </label>
    </div>
  </div>
)}
```

생성 핸들러에서 Mode C일 때:
```typescript
if (mode === 'remake') {
  const res = await fetch('/api/pipeline/remake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceUrl, category: selectedCategory, style: remakeStyle, addVideo }),
  });
  // ...
}
```

---

## 3. 이미지 업로드 UI (Drag & Drop)

### 개요
프로젝트 생성 시 제품 이미지를 드래그앤드롭으로 업로드. 업로드된 파일은 서버 `/output/{projectId}/uploads/`에 저장.

### 구현 파일

#### 3-1. 이미지 업로드 컴포넌트
**파일**: `src/components/ui/ImageUploader.tsx` (신규)

```typescript
'use client';
import { useState, useCallback } from 'react';

interface ImageUploaderProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

export default function ImageUploader({ onUpload, maxFiles = 5, accept = 'image/*' }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, maxFiles - previews.length);
    const newPreviews = arr.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    const updated = [...previews, ...newPreviews].slice(0, maxFiles);
    setPreviews(updated);
    onUpload(updated.map(p => p.file));
  }, [previews, maxFiles, onUpload]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onUpload(updated.map(p => p.file));
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
      >
        {/* 드롭존 아이콘 + 텍스트 */}
        <p className="text-sm text-gray-500">이미지를 드래그하거나 클릭하여 업로드</p>
        <p className="text-xs text-gray-400 mt-1">최대 {maxFiles}장 · JPG, PNG, WebP</p>
        <input id="file-input" type="file" multiple accept={accept} className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* 미리보기 그리드 */}
      {previews.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-xs flex items-center justify-center">
                ×
              </button>
              {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-blue-500 text-white px-1 rounded">대표</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 3-2. 파일 업로드 API
**파일**: `src/app/api/upload/route.ts` (신규)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const projectId = formData.get('projectId') as string || uuid();
  const files = formData.getAll('images') as File[];
  
  const dir = path.join(process.cwd(), 'output', projectId, 'uploads');
  await fs.mkdir(dir, { recursive: true });
  
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = path.join(dir, `product_${i}.${ext}`);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buf);
    paths.push(filePath);
  }
  
  return NextResponse.json({ projectId, imagePaths: paths });
}
```

#### 3-3. 프로젝트 생성 페이지에 통합
**파일**: `src/app/projects/page.tsx` 수정

```typescript
import ImageUploader from '@/components/ui/ImageUploader';

// state 추가
const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

// 렌더링 (Mode A, B 공통)
{(mode === 'simple' || mode === 'detailed') && (
  <div className="mb-4">
    <label className="text-sm text-gray-600 block mb-1">제품 이미지</label>
    <ImageUploader onUpload={setUploadedFiles} maxFiles={5} />
  </div>
)}

// handleCreate 수정 — 파일 업로드 후 파이프라인 시작
async function handleCreate() {
  // 1. 이미지 먼저 업로드
  let imagePaths: string[] = [];
  if (uploadedFiles.length > 0) {
    const fd = new FormData();
    uploadedFiles.forEach(f => fd.append('images', f));
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
    const uploadData = await uploadRes.json();
    imagePaths = uploadData.imagePaths;
  }
  
  // 2. 파이프라인 시작 (imagePaths 포함)
  const res = await fetch('/api/pipeline/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode, category: selectedCategory, productName,
      productImages: imagePaths,
      // ... 기타 필드
    }),
  });
}
```

---

## 4. 출력물 갤러리 뷰

### 개요
프로젝트 상세 페이지의 "출력" 탭에 생성된 HTML, 이미지, 영상 파일을 시각적으로 표시.
기존 `db.getOutputs(projectId)`와 `/api/output/download` 라우트 활용.

### 구현 파일

#### 4-1. 출력물 갤러리 컴포넌트
**파일**: `src/components/preview/OutputGallery.tsx` (신규)

```typescript
'use client';
import { useState, useEffect } from 'react';

interface OutputItem {
  id: string;
  type: 'html' | 'image' | 'video';
  platform?: string;
  file_path: string;
  file_size: number;
  created_at: number;
}

export default function OutputGallery({ projectId }: { projectId: string }) {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => { setOutputs(data.outputs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-8 text-sm text-gray-400">로딩 중...</div>;
  if (outputs.length === 0) return <EmptyGallery projectId={projectId} />;

  // 타입별 그룹핑
  const html = outputs.filter(o => o.type === 'html');
  const images = outputs.filter(o => o.type === 'image');
  const videos = outputs.filter(o => o.type === 'video');

  return (
    <div className="space-y-6">
      {/* HTML 출력물 */}
      {html.length > 0 && (
        <OutputSection title="HTML 상세페이지" items={html} projectId={projectId} />
      )}
      
      {/* 이미지 출력물 — 플랫폼별 */}
      {images.length > 0 && (
        <OutputSection title="이미지 상세페이지" items={images} projectId={projectId} />
      )}
      
      {/* 영상 출력물 */}
      {videos.length > 0 && (
        <OutputSection title="영상" items={videos} projectId={projectId} />
      )}
    </div>
  );
}

function OutputSection({ title, items, projectId }: { title: string; items: OutputItem[]; projectId: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <a
            key={item.id}
            href={`/api/output/download?id=${projectId}&type=${item.type}&platform=${item.platform || ''}`}
            className="card hover:border-blue-300 transition-colors p-3"
          >
            {/* 타입별 아이콘 */}
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon type={item.type} />
              <span className="text-xs font-medium">
                {item.platform ? `${item.platform} 버전` : item.type.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-gray-400">
              {formatFileSize(item.file_size)} · {new Date(item.created_at * 1000).toLocaleString('ko')}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

#### 4-2. 프로젝트 상세 페이지 연동
**파일**: `src/app/projects/[id]/page.tsx`

기존 output 탭 교체:
```typescript
import OutputGallery from '@/components/preview/OutputGallery';

// activeTab === 'output' 부분을 교체
{activeTab === 'output' && (
  <div className="bg-white rounded-xl border border-ax-border p-4">
    <OutputGallery projectId={projectId} />
  </div>
)}
```

#### 4-3. 내보내기 시 DB에 출력물 기록
**파일**: `src/app/api/render/html/route.ts`와 `src/app/api/render/image/route.ts` 수정

렌더링 완료 후 DB에 저장:
```typescript
import { saveOutput } from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

// 렌더링 성공 후 추가
saveOutput(uuid(), projectId, 'html', null, outPath, html.length);
// 또는
saveOutput(uuid(), projectId, 'image', platform, outPath, stat.size);
```

---

## 5. 프로젝트 복제 / 템플릿 저장

### 개요
완성된 프로젝트의 블록 구성을 복제하거나, 커스텀 템플릿으로 저장해서 재사용.
기존 `db.getBlocks()`, `db.saveBlocks()`, `db.createProject()` 활용.

### 구현 파일

#### 5-1. DB에 템플릿 테이블 추가
**파일**: `src/lib/db/client.ts`의 schema에 추가

```sql
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  block_types TEXT NOT NULL,     -- JSON array of block types
  block_data TEXT DEFAULT '{}',  -- JSON of default block data
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

#### 5-2. 프로젝트 복제 API
**파일**: `src/app/api/projects/[id]/duplicate/route.ts` (신규)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db/client';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const source = db.getProject(params.id);
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sourceBlocks = db.getBlocks(params.id);
  
  // 새 프로젝트 생성 (이름에 "(복사)" 추가)
  const newId = uuid();
  db.createProject(newId, source.name + ' (복사)', source.category, source.mode);
  
  // 블록 복제 (새 ID 부여)
  const newBlocks = sourceBlocks.map(b => ({
    ...b,
    id: uuid(),  // 새 블록 ID
  }));
  db.saveBlocks(newId, newBlocks);
  
  return NextResponse.json({ projectId: newId });
}
```

#### 5-3. 템플릿 저장/불러오기 API
**파일**: `src/app/api/templates/route.ts` (신규)

```typescript
// POST — 현재 프로젝트를 템플릿으로 저장
export async function POST(req: NextRequest) {
  const { name, projectId } = await req.json();
  const project = db.getProject(projectId);
  const blocks = db.getBlocks(projectId);
  
  const templateId = uuid();
  db.prepare(`INSERT INTO templates (id, name, category, block_types, block_data) VALUES (?, ?, ?, ?, ?)`)
    .run(templateId, name, project.category,
      JSON.stringify(blocks.map(b => b.type)),
      JSON.stringify(blocks.reduce((acc, b) => ({ ...acc, [b.type]: b.data }), {}))
    );
  
  return NextResponse.json({ templateId });
}

// GET — 템플릿 목록
export async function GET() {
  const templates = db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all();
  return NextResponse.json({ templates });
}
```

#### 5-4. UI 통합
**파일**: `src/app/projects/[id]/page.tsx`에 버튼 추가

```typescript
// 좌측 패널 하단 액션 영역에 추가
<div className="flex gap-2">
  <button className="btn-secondary flex-1 text-xs" onClick={handleDuplicate}>복제</button>
  <button className="btn-secondary flex-1 text-xs" onClick={handleSaveTemplate}>템플릿 저장</button>
</div>

async function handleDuplicate() {
  const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: 'POST' });
  const { projectId: newId } = await res.json();
  window.location.href = `/projects/${newId}`;
}

async function handleSaveTemplate() {
  const name = prompt('템플릿 이름을 입력하세요');
  if (!name) return;
  await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, projectId }),
  });
  alert('템플릿이 저장되었습니다');
}
```

**파일**: `src/app/projects/page.tsx` — 새 프로젝트 생성 시 템플릿 선택 옵션 추가:
```typescript
// 카테고리 선택 아래에 추가
<div className="mb-4">
  <label className="text-sm text-gray-600 block mb-1">또는 저장된 템플릿에서</label>
  <select className="input text-sm" onChange={(e) => loadTemplate(e.target.value)}>
    <option value="">기본 카테고리 순서 사용</option>
    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
  </select>
</div>
```

---

## 6. 다국어 지원 (영문/중문 카피)

### 개요
Claude 카피 생성 시 한국어 외에 영문/중문 카피를 동시 또는 선택 생성.
기존 `buildCopyPrompt()`의 system prompt를 확장.

### 구현 파일

#### 6-1. 다국어 옵션 타입
**파일**: `src/types/project.ts`에 추가

```typescript
export type Language = 'ko' | 'en' | 'zh';

export interface ProjectInput {
  // ... 기존 필드
  languages?: Language[];  // 추가: 생성할 언어 목록
}
```

#### 6-2. 다국어 카피 프롬프트
**파일**: `src/lib/claude/prompts/index.ts` 수정

```typescript
export function buildCopyPrompt(
  productName: string,
  category: CategoryId,
  analysis: any,
  blockTypes: string[],
  languages: Language[] = ['ko']  // 추가 파라미터
): string {
  const langInstructions = languages.length > 1
    ? `Generate copy in ALL of these languages: ${languages.map(l => ({
        ko: 'Korean (한국어)',
        en: 'English',
        zh: 'Chinese (中文)',
      }[l])).join(', ')}.
      
      Return JSON where each block has sub-keys per language:
      {
        "hero": {
          "ko": { "headline": "한국어 헤드라인", ... },
          "en": { "headline": "English headline", ... },
          "zh": { "headline": "中文标题", ... }
        }
      }
      
      IMPORTANT: Each language version should be culturally adapted, not just translated.
      Korean: 감성적, 한국 소비자 맞춤
      English: Direct, benefit-focused
      Chinese: 信任导向, 强调品质`
    : `All text in Korean (한국어).`;

  // 기존 프롬프트에 langInstructions 삽입
  return `You are a top e-commerce copywriter. ${langInstructions}
  
  Product: ${productName}
  // ... 나머지 기존 프롬프트
  `;
}
```

#### 6-3. 다국어 블록 데이터 구조
**파일**: `src/types/block.ts`에 추가

```typescript
// 기존 BlockData를 감싸는 다국어 래퍼
export interface MultiLangBlockData {
  ko: BlockData;
  en?: BlockData;
  zh?: BlockData;
}

// BlockDefinition에 언어 선택 필드 추가
export interface BlockDefinition {
  // ... 기존 필드
  multiLangData?: Record<Language, any>;  // 다국어 데이터
  activeLanguage?: Language;               // 현재 표시 언어
}
```

#### 6-4. 언어 전환 UI
**파일**: `src/app/projects/[id]/page.tsx`에 추가

미리보기 상단에 언어 토글:
```typescript
const [activeLanguage, setActiveLanguage] = useState<'ko' | 'en' | 'zh'>('ko');

// 미리보기 탭 바 옆에 추가
<div className="flex gap-1 ml-auto">
  {['ko', 'en', 'zh'].map(lang => (
    <button
      key={lang}
      onClick={() => setActiveLanguage(lang)}
      className={`px-2 py-1 text-[10px] rounded ${
        activeLanguage === lang ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-400'
      }`}
    >
      {{ ko: '한국어', en: 'English', zh: '中文' }[lang]}
    </button>
  ))}
</div>

// renderBlock 호출 시 activeLanguage에 따른 데이터 선택
const blockData = block.multiLangData?.[activeLanguage] || block.data;
```

#### 6-5. 프로젝트 생성 UI에 언어 선택
**파일**: `src/app/projects/page.tsx`에 추가

```typescript
const [languages, setLanguages] = useState<string[]>(['ko']);

// 카테고리 아래에 추가
<div className="mb-4">
  <label className="text-sm text-gray-600 block mb-1">카피 언어</label>
  <div className="flex gap-2">
    {[
      { value: 'ko', label: '한국어' },
      { value: 'en', label: 'English' },
      { value: 'zh', label: '中文' },
    ].map(lang => (
      <label key={lang.value} className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={languages.includes(lang.value)}
          onChange={(e) => {
            if (e.target.checked) setLanguages([...languages, lang.value]);
            else setLanguages(languages.filter(l => l !== lang.value));
          }}
        />
        {lang.label}
      </label>
    ))}
  </div>
</div>
```

#### 6-6. 파이프라인 연동
**파일**: `src/lib/pipeline/engine.ts`

PipelineInput에 `languages` 필드 추가하고, Step 3 (카피 생성)에서:
```typescript
const copyPrompt = buildCopyPrompt(
  input.productName, input.category, analysis, textBlockTypes,
  input.languages || ['ko']  // 다국어 전달
);
// 응답이 { hero: { ko: {...}, en: {...} } } 형태면 블록에 multiLangData로 저장
```

---

## 구현 우선순위 추천

| 순서 | 항목 | 난이도 | 이유 |
|------|------|--------|------|
| 1 | 이미지 업로드 UI | 낮음 | 현재 제품 이미지 입력 자체가 안 되므로 최우선 |
| 2 | Mode B 엑셀 파싱 | 중간 | 상세 입력 모드가 실제 사용에서 가장 많이 쓰일 것 |
| 3 | 출력물 갤러리 뷰 | 낮음 | 생성 결과 확인이 안 되면 사용 불가 |
| 4 | Mode C URL 리메이크 | 중간 | scrapeUrl 함수가 이미 있어서 연결만 하면 됨 |
| 5 | 프로젝트 복제/템플릿 | 낮음 | 반복 작업 효율화, 운영 단계에서 필요 |
| 6 | 다국어 지원 | 높음 | 블록 데이터 구조 변경 필요, 가장 영향 범위 큼 |

---

## Claude Code 사용 팁

이 가이드를 Claude Code에 컨텍스트로 넣고 작업하는 방법:

```bash
# 프로젝트 디렉토리에서
claude

# 대화 시작
> @docs/IMPLEMENTATION_GUIDE.md 의 1번 "Mode B 엑셀 파싱" 구현해줘.
> src/lib/utils/excel-parser.ts 파일 만들고,
> src/lib/claude/prompts/index.ts에 buildExcelParsingPrompt 추가하고,
> src/app/api/parse/excel/route.ts 라우트 만들어줘.
```

각 항목이 기존 코드의 어떤 함수, 어떤 파일과 연결되는지 명시했으므로 Claude Code가 정확한 위치에 코드를 추가할 수 있습니다.
