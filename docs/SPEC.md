# AX Studio — 이커머스 자동화 AX 솔루션

> **v1.0** · Windows 로컬 환경 · 2026-03-22

이커머스 상세페이지를 자동 생성하는 풀스택 솔루션.
제품 이미지/정보 입력 → Claude 카피 생성 → ComfyUI 이미지/영상 생성 → 상세페이지 출력.

---

## 설치 및 실행

### 사전 요구사항

- **Node.js** 18+
- **ComfyUI** — port 8000에서 API 모드로 실행
- **FFmpeg** — 시스템 PATH에 등록 또는 .env에 경로 지정
- **Claude OAuth** — Anthropic Console에서 OAuth 앱 등록

### 셋업

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 편집 → OAuth 키, ComfyUI URL 등 설정

# 3. 개발 서버 시작
npm run dev

# 4. 브라우저 접속
# http://localhost:3000
```

### ComfyUI 설정

```bash
python main.py --listen 0.0.0.0 --port 8000
```

필요한 커스텀 노드:
- BRIA RMBG 2.0 — 배경 제거
- ComfyUI-Zero123Plus — 멀티뷰 (360°)
- ComfyUI-IP-Adapter — 이미지 일관성
- ComfyUI-FILM or ComfyUI-RIFE — 프레임 보간

---

## 1. 시스템 아키텍처

```
┌──────────────────── Windows Local (localhost) ────────────────────┐
│                                                                    │
│  Next.js UI (3000) → Pipeline Engine (Node.js) → Output Manager   │
│                           │                                        │
│         ┌─────────────────┼─────────────────┐                     │
│         ▼                 ▼                  ▼                     │
│   Claude OAuth      ComfyUI (8000)      Puppeteer                 │
│                           │                                        │
│                        FFmpeg                                      │
└────────────────────────────────────────────────────────────────────┘
```

### 기술 스택

| 레이어 | 기술 | 포트/비고 |
|--------|------|-----------|
| Frontend | Next.js 14+ (App Router) | port 3000 |
| Backend API | Next.js API Routes | /api/* (17개 라우트) |
| AI 카피/분석 | Claude (OAuth 2.0) | OAuth 토큰 인증, SQLite 영속 |
| 이미지 생성 | ComfyUI (API mode) | port 8000 |
| 영상 생성 | Kling API + ComfyUI | Kling 1.6 |
| HTML→이미지 | Puppeteer | Chromium 스크린샷 |
| 영상 후처리 | FFmpeg | Windows 바이너리 |
| 상태 관리 | Zustand | 클라이언트 상태 |
| DB | SQLite (better-sqlite3) | 프로젝트/블록/토큰 영속 |

### Claude OAuth 인증 흐름

1. UI에서 "Claude 연결" 클릭
2. Anthropic OAuth 서버 리다이렉트 (Authorization Code)
3. 사용자 승인 → `/api/auth/callback`
4. Authorization Code → Access Token 교환 (서버사이드)
5. SQLite에 토큰 영속 저장
6. 만료 60초 전 Refresh Token으로 자동 갱신

---

## 2. 입력 시스템 (3가지 모드)

### Mode A — 간편 입력
- 입력: 제품 이미지 1~5장 + 제품명 + 카테고리 + 핵심특징 + 가격 + 타겟
- 자동: Claude 이미지 분석 → 블록 구성 추천 → 카피 전체 생성

### Mode B — 상세 입력
- 입력: 다수 이미지 + 스펙시트(Excel/JSON) + 브랜드명 + 상세스펙 + 리뷰 + 인증 + 가격옵션
- 자동: Claude 스펙시트 파싱 → 구조화 → 최적 블록 + 카피

### Mode C — URL 리메이크
- 입력: 기존 상세페이지 URL + 리메이크 옵션 (스타일, 영상추가, 타겟 플랫폼)
- 자동: Puppeteer 스크래핑 → Claude 분석 → 리메이크 전략 → 새 블록 + 카피

### 이미지 입력 듀얼 패스 (ComfyUI)

- **Path A**: 사용자 이미지 업로드 → RMBG 배경 제거 → 리라이팅/합성
- **Path B**: Claude 프롬프트 → SDXL/Flux T2I 생성 → RMBG → 공통 파이프라인

---

## 3. 블록 시스템 (24개 타입)

| ID | 블록명 | 데이터 소스 |
|----|--------|------------|
| hero | 히어로 | Claude + ComfyUI |
| painpoint | 페인포인트 | Claude |
| solution | 솔루션 | Claude |
| feature | 핵심 기능 | Claude + ComfyUI |
| ingredient | 성분 | Claude |
| tech | 기술 설명 | Claude |
| trust | 신뢰 지표 | Claude |
| review | 실사용 후기 | Claude |
| spec | 제품 사양 | Claude |
| faq | FAQ | Claude |
| howto | 사용법 | Claude |
| video_360 | 360° 영상 | ComfyUI + Kling |
| video_demo | 기능 시연 | ComfyUI + Kling + FFmpeg |
| video_ba | Before→After | ComfyUI + Kling + FFmpeg |
| video_short | 텍스트 숏폼 | ComfyUI + FFmpeg |
| compare | 비교 테이블 | Claude |
| certification | 인증/수상 | Claude |
| cta | 구매 CTA | Claude |
| size_guide | 사이즈 가이드 | Claude |
| styling | 코디 제안 | ComfyUI |
| compatibility | 호환성 | Claude |
| unboxing | 구성품 | ComfyUI |
| recipe | 레시피 | Claude |
| pricing | 요금제 | Claude |

---

## 4. 카테고리별 블록 순서 (14개)

### Grooming — 다크톤, 기술력, 남성타겟
hero → video_360 → painpoint → solution → feature → video_demo → tech → trust → review → spec → faq → howto → video_short → cta

### Beauty — 파스텔, 수분감, Before→After 필수
hero → painpoint → solution → ingredient → feature → video_ba → trust → review → compare → howto → spec → certification → faq → video_short → cta

### 건강식품 — 신뢰 상단, 인증/GMP 강조
hero → trust → review → ingredient → process → video_demo → certification → feature → compare → howto → spec → faq → cta

### 생활가전 — 스펙 대형, 기능 시연 필수
hero → video_360 → painpoint → solution → feature → video_demo → compare → trust → review → spec → howto → faq → video_short → cta

### 생활용품 — 감성 카피, 대용량 CTA
hero → trust → review → painpoint → solution → ingredient → feature → video_ba → certification → spec → faq → cta

### 유아용품 — 안전/인증 최우선, EWG 등급
hero → trust → review → painpoint → solution → ingredient → certification → feature → howto → spec → faq → cta

### 자동차용품 — 호환성 테이블, 설치 가이드
hero → painpoint → solution → feature → video_demo → compare → trust → review → spec → howto → faq → cta

### 패션/의류 — 사이즈 가이드, 코디 제안
hero → feature → video_360 → material → size_guide → styling → trust → review → spec → faq → cta

### 전자기기/IT — 스펙 비교, 호환성, 언박싱
hero → video_360 → feature → video_demo → compare → tech → trust → review → compatibility → spec → unboxing → faq → video_short → cta

### 반려동물 — 성분 안전성, 정기구독 CTA
hero → painpoint → ingredient → certification → feature → video_demo → trust → review → compare → howto → spec → faq → cta

### 스포츠/피트니스 — 운동 시연, 체형 변화
hero → video_demo → painpoint → solution → feature → video_ba → trust → review → spec → howto → faq → video_short → cta

### 주방/조리 — 조리 시연, 레시피 블록
hero → painpoint → solution → feature → video_demo → recipe → trust → review → spec → howto → faq → cta

### 가구/인테리어 — 공간 연출 T2I, 치수 가이드
hero → feature → video_360 → material → size_guide → styling → trust → review → howto → spec → faq → cta

### 디지털/구독 — UI 스크린샷, 요금제 비교
hero → painpoint → solution → feature → video_demo → pricing → trust → review → faq → video_short → cta

---

## 5. ComfyUI 워크플로우 (7개 JSON)

### WF1: rmbg.json — 배경 제거
LoadImage → BRIA RMBG 2.0 → 투명 PNG 컷아웃

### WF2: t2i-sdxl.json — SDXL 이미지 생성
Claude 프롬프트 → SDXL base → 제품/배경 이미지

### WF3: t2i-flux.json — Flux 고품질 이미지 생성
Claude 프롬프트 → Flux dev (fp8) → 고품질 제품 이미지

### WF4: rotate-360.json — 360° 회전
RMBG 컷아웃 → Zero123++ v2 (6-view) → IP-Adapter 일관성 → RIFE 보간 (24fps) → FFmpeg MP4
- Alt: Kling API turntable (고품질, API 비용)

### WF5: feature-demo.json — 기능 시연 합성
RMBG 컷아웃 + SDXL 배경 → Layer composite → Kling API 모션 (4s) → FFmpeg 텍스트 오버레이
- Alt: SVD XT (로컬, 낮은 품질)

### WF6: before-after.json — Before→After 쌍 생성
Claude 프롬프트 → SDXL before → IP-Adapter (0.6~0.8) + after 프롬프트 → after 이미지
같은 seed + IP-Adapter로 구도 일관성 유지
→ Kling morph or 크로스페이드 → FFmpeg BEFORE/AFTER 라벨
- Duration: 2s hold + 2s transition + 2s hold

### WF7: background.json — 추상 배경 생성
SDXL → 숏폼/시연용 추상 배경 (1:1 or 9:16)

---

## 6. 영상 파이프라인 (4가지 타입)

### 360° Rotation
1순위: Kling API turntable → MP4
2순위: Zero123++ → RIFE → FFmpeg frames → MP4
서비스 미사용 시 graceful skip

### Feature Demo
씬별: SDXL 배경 + 제품 composite → Kling 모션 → FFmpeg 텍스트 오버레이 → 씬 concat
Claude가 씬별 backgroundPrompt + klingPrompt + overlayText 생성

### Before→After
1순위: SDXL 이미지 쌍 → Kling morph → FFmpeg 라벨 → MP4
2순위: SDXL 쌍 → 정지 프레임 hold → FFmpeg 크로스페이드 → MP4
카테고리별 프롬프트: beauty(피부), appliance(먼지), food(건강)

### Text Shortform
Claude → JSON 스크립트 [{scene, text, kpiValue, animation, duration}]
→ SDXL 배경 or 단색 → FFmpeg drawtext 애니메이션 + KPI 카운트업 + xfade
15~30s, 9:16(세로) or 1:1

---

## 7. 출력 시스템

### HTML 상세페이지
- 블록 HTML 컴포넌트 조합, 반응형 (max-width 640px)
- 영상: `<video>` inline, 이미지: WebP, 폰트: Pretendard + Inter

### 이미지 상세페이지 (긴 이미지)
- Puppeteer HTML → 풀페이지 스크린샷
- 플랫폼별: 쿠팡/스마트스토어 860px, 11번가 780px
- PNG (고화질) / JPG (경량)

### 영상 파일
- MP4 H.264, GIF (자동재생용)
- 1080x1080 (정방) / 1080x1920 (세로)

---

## 8. API 라우트 (17개)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/callback | OAuth 인증/콜백 |
| GET | /api/auth/token | 인증 상태 확인 |
| GET/POST | /api/projects | 프로젝트 목록/생성 |
| GET/DELETE | /api/projects/[id] | 프로젝트 상세/삭제 |
| GET/PUT | /api/projects/[id]/blocks | 블록 조회/저장 |
| POST | /api/pipeline/start | 파이프라인 시작 |
| GET | /api/pipeline/status | 진행 상태 (SSE) |
| POST | /api/pipeline/cancel | 파이프라인 취소 |
| POST | /api/claude/analyze | 제품 분석 |
| POST | /api/claude/copy | 카피 생성 |
| POST | /api/claude/blocks | 블록 추천 |
| POST | /api/comfyui/generate | 이미지 생성 |
| POST | /api/comfyui/video | 영상 생성 (4종) |
| GET | /api/comfyui/status | ComfyUI 헬스체크 |
| POST | /api/render/html | HTML 상세페이지 생성 |
| POST | /api/render/image | Puppeteer 이미지 렌더 |
| GET | /api/output/download | 결과물 다운로드 |

---

## 9. 프로젝트 구조

```
ax-studio/
├── package.json, next.config.js, tsconfig.json, tailwind.config.js
├── .env.example
├── docs/SPEC.md                        # 이 문서
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx        # 레이아웃 + 대시보드
│   │   ├── globals.css                 # Tailwind + 커스텀 스타일
│   │   ├── projects/
│   │   │   ├── page.tsx                # 프로젝트 목록 (DB 연동)
│   │   │   └── [id]/page.tsx           # 편집 UI (드래그 정렬 + 미리보기)
│   │   └── api/ (17 routes)
│   ├── components/
│   │   ├── blocks/ (9 files, 24 types) # 상세페이지 블록 컴포넌트
│   │   ├── editor/
│   │   │   ├── BlockSortable.tsx       # dnd-kit 드래그 정렬
│   │   │   └── BlockEditor.tsx         # 블록 편집 모달 (타입별 폼)
│   │   ├── preview/MobileFrame.tsx     # 모바일 미리보기 프레임
│   │   └── ui/index.tsx                # Spinner, Badge, ProgressBar
│   ├── lib/
│   │   ├── claude/client.ts            # OAuth + API (토큰 DB 영속)
│   │   ├── claude/prompts/index.ts     # 분석/카피/영상/블록 프롬프트
│   │   ├── comfyui/client.ts           # ComfyUI API + WebSocket
│   │   ├── comfyui/workflows/ (7 JSON) # ComfyUI 워크플로우
│   │   ├── kling/client.ts             # Kling API (생성→폴링→다운로드)
│   │   ├── ffmpeg/runner.ts            # 텍스트 오버레이, KPI, 합성
│   │   ├── puppeteer/renderer.ts       # HTML→이미지, URL 스크래핑
│   │   ├── pipeline/engine.ts          # 8단계 파이프라인 (재시도 포함)
│   │   ├── templates/categories.ts     # 14개 카테고리 정의
│   │   ├── db/client.ts                # SQLite (5 테이블, 자동 생성)
│   │   └── utils/retry.ts             # 지수 백오프 재시도 + 타임아웃
│   ├── types/ (block.ts, project.ts, pipeline.ts)
│   └── store/project.ts               # Zustand 상태 관리
├── output/                             # 생성물 출력 디렉토리
└── comfyui-workflows/                  # ComfyUI 원본 참고용
```

---

## 10. 개발 로드맵

### Phase 1 — Foundation (완료)
- [x] Next.js + 폴더 구조 + 설정 파일
- [x] SQLite DB (5 테이블 자동 생성)
- [x] Claude OAuth 인증 (토큰 영속)
- [x] ComfyUI API 클라이언트
- [x] 기본 UI (대시보드, 사이드바)

### Phase 2 — Core Pipeline (완료)
- [x] 파이프라인 엔진 (8단계, 재시도, SSE)
- [x] Claude 제품 분석 + 카피 생성 + 블록 추천
- [x] 14개 카테고리 블록 시스템
- [x] 블록 드래그 정렬 에디터 (dnd-kit)
- [x] 블록 편집 모달 (타입별 폼 + JSON 모드)
- [x] 실시간 미리보기

### Phase 3 — Image (완료)
- [x] ComfyUI 워크플로우 7개 (RMBG, SDXL, Flux, 360°, demo, BA, BG)
- [x] 이미지 듀얼 패스 (업로드 / T2I)
- [x] Puppeteer HTML→긴이미지 렌더링
- [x] 플랫폼별 리사이즈 (쿠팡/스마트스토어/11번가)

### Phase 4 — Video (완료)
- [x] 360° 회전 (Kling 우선, Zero123++ 폴백)
- [x] 기능 시연 (씬 합성 → Kling 모션 → FFmpeg)
- [x] Before→After (IP-Adapter 쌍 → Kling morph)
- [x] 텍스트 숏폼 (FFmpeg drawtext + KPI 카운트업)
- [x] Kling API 클라이언트 (폴링, 타임아웃, 다운로드)

### Phase 5 — Polish (완료)
- [x] 에러 핸들링 (지수 백오프 재시도, 부분 실패 허용)
- [x] 프로젝트 CRUD (DB 연동)
- [x] HTML/이미지/영상 내보내기

### Phase 6 — 추가 개발 필요 (미구현)
- [ ] URL 리메이크 모드 UI (Mode C 전용 입력 폼)
- [ ] 이미지 업로드 UI (drag & drop)
- [ ] 스펙시트 엑셀 파싱 (Mode B)
- [ ] 출력물 갤러리 뷰
- [ ] 프로젝트 복제/템플릿 저장
- [ ] 다국어 지원 (영문/중문 카피)
