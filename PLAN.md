# PLAN.md

## Goal

전체 저장소 감사에서 발견한 보안·정합성·계층 경계·운영 문제를 우선순위대로 해결하고, 제품 실험과 품질 게이트까지 검증한다.

## Active

1. 대형 service facade를 유지한 채 post-care orchestration과 upload finalization coordinator를 단계별로 분해하고 회귀 게이트를 추가한다.
2. search context aggregation의 sampled round-trip/zero-result 지표를 운영에 연결하고, 실제 traffic 기준으로 batch 전환 여부를 결정한다.

## Backlog

- 보호자-제보자 비공개 대화와 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다. 분실·목격 상태 변경과 상태 이력은 구현했다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
