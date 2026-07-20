# PLAN.md

## Goal

대형 write orchestration의 변경 범위를 줄이고, 알림·캐시 실패를 관리자 화면에서 판단할 수 있게 만든다. 운영 화면, 문서, 품질 게이트까지 완료했다.

## Active

No active work.

## Backlog

- 보호자-제보자 비공개 대화와 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다. 분실·목격 상태 변경과 상태 이력은 구현했다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
- 실제 트래픽이 증가하면 search context fan-out을 sampled batch aggregation으로 전환한다.
