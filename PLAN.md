# PLAN.md

## Goal

운영 공개 화면의 콘텐츠 품질과 회귀 안전성을 유지한다. 공개 목록에서 테스트성 콘텐츠를 차단하고, 게시글 상세·홈·모바일·정책 페이지의 상태와 문구를 일관되게 제공한다. 현재 계획의 실행 작업은 완료되었으며 production health와 공개 smoke 검증을 통과했다.

## Active

No active work.

## Backlog

- 키워드 기반 demo 차단을 `Post`의 명시적 공개 상태/fixture 분류 필드로 교체해 정상 사용자의 “테스트”라는 제목까지 차단하지 않도록 마이그레이션한다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
- 분실·목격 제보 상태 변경, 보호자-제보자 비공개 대화, 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다.
