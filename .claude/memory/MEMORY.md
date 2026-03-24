# AX Studio Project Memory

## Current State
- **Phase**: 생성소 워크플로우 테스트 중
- **카피 파이프라인**: 완료, 안정
- **생성소 UI**: 완료 (이미지/동영상 워크플로우 11개, Kling 4개는 준비 중)
- **갤러리**: 완료 (업로드, 다운로드, 블록 배정)
- **i2i 장면 생성**: FLUX.2 Klein 4B 테스트 중 — 장면 자연스러우나 손/제품 디테일 한계
- **i2v 영상**: Wan 2.2 네이티브 노드로 동작 확인 (LightX2V LoRA + 2패스)
- **HTML 내보내기**: base64 인라인 완료

## Key Decisions
- 파이프라인 분리: 카피(자동) / 이미지·영상(생성소에서 수동)
- ComfyUI 워크플로우: Kijai Wrapper 대신 네이티브 노드 사용
- 장면 생성: IPAdapter/ControlNet/멀티스텝 합성 모두 부적합 → FLUX.2 Klein 4B Edit가 현재 최선
- Kling: 테스트 대기 (사용자 지시 시)

## Memory Files
- [project_status.md](../../.claude/projects/C--Team-jane-ax-studio/memory/project_status.md) — 상세 프로젝트 상태
- [user_preferences.md](../../.claude/projects/C--Team-jane-ax-studio/memory/user_preferences.md) — 사용자 선호도/피드백
- [logs/2026-03-24.md](logs/2026-03-24.md) — 오늘 작업 로그
