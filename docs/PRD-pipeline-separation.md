# PRD: 파이프라인 분리 — 카피 / 이미지·영상 생성소

> 버전: 1.0 · 2026-03-23

## 1. 배경 및 문제

### 현재 구조
단일 파이프라인이 카피 생성 + 이미지 생성 + 영상 생성을 한 번에 수행.

### 문제점
- **이미지 품질 제어 불가**: AI가 생성한 이미지가 블록 내용과 불일치해도 교체할 수 없음
- **속도**: 카피는 1~2분이면 끝나는데 이미지/영상 때문에 5~10분 대기
- **유연성 없음**: 사용자가 직접 촬영한 이미지를 블록에 넣을 수 없음
- **블록 관리 불가**: 블록 추가/삭제가 불가능, 토글과 순서 변경만 가능
- **입력 문제**: 360° 회전에 구성품 세트 사진이 들어가는 등 입력 제어 불가

## 2. 목표 구조

```
┌─────────────────────────────────────────────────────┐
│  /projects/[id]                                      │
│                                                       │
│  [탭: 블록 편집]        [탭: 생성소]        [탭: 출력]  │
│                                                       │
│  ┌─ 블록 편집 ──┐     ┌─ 생성소 ──────┐              │
│  │ + 블록 추가   │     │ 프롬프트 입력  │              │
│  │              │     │ (한글)        │              │
│  │ [hero]     ✕ │     │              │              │
│  │  📷 슬롯    │     │ 워크플로우 선택│              │
│  │             │     │ [생성] 버튼   │              │
│  │ [feature]  ✕ │     │              │              │
│  │  📷📷📷   │     │ ── 갤러리 ── │              │
│  │             │     │ [img] [img]  │              │
│  │ [video_360]✕ │     │ [img] [vid]  │              │
│  │  🎬 슬롯    │     │              │              │
│  │             │     │ 각 항목:      │              │
│  │  미리보기    │     │  배정 버튼    │              │
│  └─────────────┘     └──────────────┘              │
└─────────────────────────────────────────────────────┘
```

## 3. 핵심 변경사항

### 3.1 파이프라인 분리

| 영역 | 현재 | 변경 후 |
|------|------|---------|
| 카피 파이프라인 | 카피+이미지+영상 일괄 | **카피만** (분석 → 카피 → 블록 조립) |
| 이미지/영상 | 파이프라인 내부 일괄 생성 | **생성소 탭**에서 개별 생성 |
| 블록 연결 | 자동 매핑 (`attachImagesToBlocks`) | **사용자가 갤러리에서 선택하여 배정** |

### 3.2 블록 추가/삭제

| 기능 | 현재 | 변경 후 |
|------|------|---------|
| 블록 추가 | 불가 | 24개 타입 중 선택하여 추가 (빈 데이터) |
| 블록 삭제 | 불가 (토글만) | 삭제 버튼으로 제거 |
| 블록 순서 | dnd-kit 드래그 | 유지 |
| 블록 편집 | BlockEditor 모달 | 유지 + 이미지/영상 슬롯 추가 |

### 3.3 생성소 (Studio)

사용자가 원하는 이미지/영상을 자유롭게 생성하는 독립 탭.

**입력:**
- 한글 프롬프트 (자유 텍스트)
- 워크플로우 선택 (드롭다운)

**처리:**
- Claude CLI로 한글 → 영어 번역
- 선택한 ComfyUI 워크플로우에 영어 프롬프트 주입
- ComfyUI 실행 → 결과 다운로드

**출력:**
- 프로젝트별 갤러리에 저장
- 썸네일 + 프롬프트 + 워크플로우 태그 표시

**워크플로우 목록:**

| ID | 이름 | 입력 | 출력 | 비고 |
|----|------|------|------|------|
| `t2i-flux` | 제품 이미지 생성 | 텍스트 프롬프트 | 1024×1024 이미지 | Flux 우선, SDXL fallback |
| `bg-flux` | 배경 생성 | 텍스트 프롬프트 | 정사각/세로 배경 | 추상/라이프스타일 |
| `rmbg` | 배경 제거 | 이미지 업로드 | 투명 PNG | |
| `rotate-360` | 360° 회전 | 이미지 업로드 | 21프레임 → MP4 | SV3D + RIFE |
| `before-after` | Before/After | 텍스트 프롬프트 | 이미지 쌍 | SDXL + IP-Adapter |

### 3.4 갤러리 → 블록 배정

- 갤러리의 각 항목에 "블록에 배정" 버튼
- 클릭 시 현재 블록 목록에서 대상 선택
- 이미지 → `block.data.heroImageUrl`, `block.data.features[i].imageUrl`, `block.data.imageUrl` 등에 저장
- 영상 → `block.data.videoUrl`에 저장
- 블록 에디터에서도 "갤러리에서 선택" 또는 "직접 업로드" 가능

## 4. 데이터 모델

### 4.1 신규 테이블: `gallery_items`

```sql
CREATE TABLE gallery_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'image' | 'video'
  workflow TEXT NOT NULL,        -- 't2i-flux' | 'rmbg' | 'bg-flux' | 'rotate-360' | 'before-after'
  prompt_ko TEXT,               -- 원본 한글 프롬프트
  prompt_en TEXT,               -- 번역된 영어 프롬프트
  file_path TEXT NOT NULL,      -- output/{projectId}/gallery/xxx.png
  file_size INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  assigned_block_id TEXT,       -- 배정된 블록 ID (nullable)
  assigned_field TEXT,          -- 배정된 필드 ('heroImageUrl', 'features.0.imageUrl', 'videoUrl' 등)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_gallery_project ON gallery_items(project_id);
```

### 4.2 기존 테이블 변경

변경 없음. `blocks.data` JSON 안의 `imageUrl`, `heroImageUrl`, `videoUrl` 필드를 그대로 사용.

## 5. API 설계

### 5.1 수정 API

**`POST /api/pipeline/start`** — 카피 전용으로 축소

요청: 기존과 동일
변경: `engine.ts`에서 Step 4(이미지), Step 4b(기능별 이미지), Step 5(영상) 제거.
Step 1(분석) → Step 2(블록 순서) → Step 3(카피) → Step 6(블록 저장) → 완료.

### 5.2 신규 API

**`POST /api/studio/generate`** — 이미지/영상 생성

```typescript
// 요청
{
  projectId: string;
  promptKo: string;          // 한글 프롬프트
  workflow: string;          // 워크플로우 ID
  inputImage?: string;       // 이미지 입력이 필요한 워크플로우용 (rmbg, rotate-360)
  params?: {                 // 워크플로우별 추가 파라미터
    width?: number;
    height?: number;
    aspectRatio?: '1:1' | '9:16' | '16:9';
  };
}

// 응답
{
  galleryItem: {
    id: string;
    type: 'image' | 'video';
    workflow: string;
    promptKo: string;
    promptEn: string;
    fileUrl: string;         // serve URL
    width: number;
    height: number;
  }
}
```

처리 흐름:
1. Claude CLI로 `promptKo` → 영어 번역
2. 워크플로우 로드 (Flux 우선, SDXL fallback)
3. 번역된 프롬프트 주입
4. ComfyUI 큐잉 → 완료 대기
5. 결과 다운로드 → `output/{projectId}/gallery/{id}.png`
6. `gallery_items` DB 저장
7. 응답 반환

**`GET /api/studio/gallery?projectId={id}`** — 갤러리 목록

```typescript
// 응답
{
  items: GalleryItem[];   // 생성 시간 역순
}
```

**`POST /api/studio/assign`** — 갤러리 → 블록 배정

```typescript
// 요청
{
  galleryItemId: string;
  blockId: string;
  field: string;            // 'heroImageUrl' | 'imageUrl' | 'features.0.imageUrl' | 'videoUrl'
}
```

처리: 블록의 data JSON에서 해당 field에 gallery item의 serve URL을 설정하고 저장.

**`DELETE /api/studio/gallery/{id}`** — 갤러리 항목 삭제

파일 + DB 레코드 삭제. 블록에 배정된 상태면 블록의 해당 URL도 제거.

**`POST /api/studio/upload`** — 직접 이미지/영상 업로드 → 갤러리에 추가

사용자가 촬영한 이미지/영상을 갤러리에 직접 올리는 용도.

### 5.3 삭제 API

기존 `POST /api/comfyui/video` → 삭제 (생성소로 대체)
기존 `POST /api/comfyui/generate` → 삭제 (생성소로 대체)

## 6. UI 설계

### 6.1 프로젝트 상세 페이지 탭 구조

```
[블록 편집] [생성소] [미리보기] [JSON] [출력]
```

기존 3탭(미리보기/JSON/출력) → 5탭. "블록 편집"과 "생성소"가 좌측 패널에서 우측 탭 영역으로 이동하여 더 넓은 공간 확보.

### 6.2 블록 편집 탭

**좌측: 블록 목록**
```
+ 블록 추가  [카테고리 기본 순서로 초기화]

[1] 히어로        📷 ✎ ✕
[2] 페인포인트          ✎ ✕
[3] 솔루션              ✎ ✕
[4] 핵심 기능     📷📷  ✎ ✕
[5] 360° 영상     🎬    ✎ ✕
[6] CTA                 ✎ ✕
```
- 📷: 이미지 배정됨 표시
- 🎬: 영상 배정됨 표시
- ✎: 편집 버튼 (BlockEditor 모달)
- ✕: 삭제 버튼

**블록 추가 모달:**
- 24개 블록 타입을 카테고리별로 그룹핑하여 표시
- 텍스트 블록 / 이미지 블록 / 영상 블록 구분
- 선택 시 빈 블록이 목록 끝에 추가

**우측: 미리보기**
- 현재와 동일한 블록 렌더링
- 이미지/영상이 배정된 블록은 실제 이미지 표시
- 미배정 블록은 placeholder 표시

### 6.3 생성소 탭

**상단: 생성 폼**
```
┌──────────────────────────────────────┐
│ 프롬프트 (한글)                        │
│ ┌──────────────────────────────────┐ │
│ │ 예: 매끈한 무광 검정 차량용 청소기,  │ │
│ │ 흰색 배경, 스튜디오 조명            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 워크플로우: [제품 이미지 생성 ▼]       │
│                                      │
│ (워크플로우별 추가 옵션)               │
│ - 제품 이미지: 크기 선택              │
│ - 배경 생성: 비율 선택 (1:1 / 9:16)  │
│ - 배경 제거: 이미지 업로드            │
│ - 360° 회전: 이미지 업로드            │
│                                      │
│           [생성하기]                   │
└──────────────────────────────────────┘
```

**하단: 갤러리**
```
┌──────────────────────────────────────┐
│ 갤러리 (12개)                 [전체삭제]│
│                                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │     │ │     │ │     │ │     │   │
│ │ img │ │ img │ │ img │ │ vid │   │
│ │     │ │     │ │     │ │     │   │
│ ├─────┤ ├─────┤ ├─────┤ ├─────┤   │
│ │Flux │ │RMBG │ │BG   │ │360° │   │
│ │배정▼│ │배정▼│ │배정▼│ │배정▼│   │
│ └─────┘ └─────┘ └─────┘ └─────┘   │
└──────────────────────────────────────┘
```

"배정" 클릭 시:
```
┌─ 블록에 배정 ──────────┐
│ [1] 히어로 → 메인 이미지│
│ [4] 핵심 기능 → 항목 1  │
│ [4] 핵심 기능 → 항목 2  │
│ [4] 핵심 기능 → 항목 3  │
│ [5] 360° 영상 → 영상    │
│ [취소]                  │
└────────────────────────┘
```

### 6.4 BlockEditor 변경

기존 텍스트 편집 폼에 이미지/영상 슬롯 추가:
- hero: "메인 이미지" 슬롯 (현재 heroImageUrl)
- feature: 각 항목마다 이미지 슬롯
- ingredient/tech: 상단 이미지 슬롯
- video_*: 영상 슬롯
- 각 슬롯: "갤러리에서 선택" / "직접 업로드" / "제거" 버튼

## 7. engine.ts 변경

### 7.1 제거할 코드

- `runT2I()` 헬퍼
- `runBgGeneration()` 헬퍼
- `prepare360Input()`, `cropMainProduct()` 헬퍼
- `attachImagesToBlocks()` 함수
- Step 4: 이미지 생성 전체 (Path A, Path B)
- Step 4b: 기능별 이미지 생성
- Step 5: 영상 생성 전체 (rotate_360, demo, before_after, shortform)
- `comfyui`, `kling`, `ffmpeg`, `sharp` import

### 7.2 남길 코드

- Step 1: Claude 분석
- Step 2: 블록 순서 결정
- Step 3: 카피 생성
- Step 6: 블록 조립 + DB 저장
- SSE 진행률 업데이트
- AbortController 취소

### 7.3 예상 코드 크기

현재 881줄 → 약 250줄로 축소.

## 8. 구현 순서

### Phase 1: DB + API 기반 (백엔드)
1. `gallery_items` 테이블 추가 (`db/client.ts`)
2. `POST /api/studio/generate` — 프롬프트 번역 + ComfyUI 실행 + 갤러리 저장
3. `GET /api/studio/gallery` — 갤러리 목록
4. `POST /api/studio/assign` — 블록 배정
5. `DELETE /api/studio/gallery/{id}` — 삭제
6. `POST /api/studio/upload` — 직접 업로드

### Phase 2: 파이프라인 축소 (백엔드)
7. `engine.ts` 이미지/영상 생성 코드 제거 (카피 전용)
8. 불필요해진 API 정리 (`comfyui/video`, `comfyui/generate`)

### Phase 3: UI — 블록 관리
9. 블록 추가 UI (타입 선택 모달)
10. 블록 삭제 UI (삭제 버튼 + 확인)
11. BlockEditor에 이미지/영상 슬롯 추가

### Phase 4: UI — 생성소 탭
12. 생성소 탭 레이아웃 (프롬프트 입력 + 워크플로우 선택)
13. 생성 실행 + 진행 표시
14. 갤러리 그리드 표시
15. 갤러리 → 블록 배정 모달

### Phase 5: 통합 테스트 + 정리
16. 전체 시나리오 테스트
17. 기존 이미지/영상 생성 코드 완전 제거
18. README 업데이트

## 9. 마이그레이션

### 기존 프로젝트 호환
- 기존 블록의 `imageUrl`, `videoUrl`은 그대로 유지
- 기존 `output/{id}/images/`, `output/{id}/videos/` 파일도 유지
- 새 프로젝트만 갤러리 시스템 사용
- 기존 프로젝트도 생성소 탭에서 이미지 추가 가능

### 코드 삭제 시점
- Phase 5에서 전체 테스트 통과 후 기존 이미지/영상 생성 코드 삭제
- Phase 2에서는 코드를 주석 처리하고 skip flag로 비활성화

## 10. 범위 외 (향후)

- 갤러리 항목 드래그 앤 드롭으로 블록에 배정
- 생성 히스토리/즐겨찾기
- 프롬프트 템플릿 저장
- 배치 생성 (한 번에 여러 프롬프트)
- Kling API 연동 (생성소에서 선택 가능한 워크플로우로)
