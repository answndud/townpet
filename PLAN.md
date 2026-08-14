# PLAN.md

## Goal

지금까지 TownPet에서 진행한 보안·정합성·아키텍처·운영·테스트 개선을 검증 가능한 근거와 면접용 설명으로 정리했다. 최종 산출물은 `docs/reports/townpet-development-retrospective-2026-07-31.md`다.

## Active

현재 진행 중인 작업이 없습니다. 다음 작업은 Backlog에서 선택합니다.

## Backlog

- 보호자-제보자 비공개 대화와 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다. 분실·목격 상태 변경과 상태 이력은 구현했다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
- 실제 트래픽이 증가하면 search context fan-out을 sampled batch aggregation으로 전환한다.
