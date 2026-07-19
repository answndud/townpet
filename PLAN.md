# PLAN.md

## Goal

대형 write orchestration의 변경 범위를 줄이고, 알림·캐시 실패를 관리자 화면에서 판단할 수 있게 만든다. 현재 남은 작업은 운영 화면과 릴리스 검증이다.

## Active

1. **2026-07-20 — 관리자 운영 표시와 문서/릴리스 검증 정렬**
   - 파일: `app/src/app/admin/ops/page.tsx`, 관련 운영 문서 및 테스트
   - 변경: snapshot의 stale/dead-letter 상태를 운영 화면에 표시하고 1인 운영용 확인 절차를 문서화한다.
   - 검증: lint, typecheck, unit tests, build, Production health/CSP curl
   - 완료: 로컬·CI·Production에서 같은 운영 상태 판단 기준을 사용한다.

## Backlog

- 보호자-제보자 비공개 대화와 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다. 분실·목격 상태 변경과 상태 이력은 구현했다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
- 실제 트래픽이 증가하면 search context fan-out을 sampled batch aggregation으로 전환한다.
