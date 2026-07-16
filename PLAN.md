# PLAN.md

## Goal

대형 write orchestration의 변경 범위를 줄이고, 알림·캐시 실패를 관리자 화면에서 판단할 수 있게 만든다. 네 개의 독립 커밋과 Production health/CSP/품질 게이트 검증이 완료 상태다.

## Active

1. **2026-07-16 — post-care와 upload finalization coordinator 경계 추출**
   - 파일: `app/src/server/services/posts/post-care-workflow.service.ts`, `app/src/server/services/posts/post-write-support.ts`, 신규 coordinator/support 파일
   - 변경: facade의 상태 변경 후 알림·cache side effect를 coordinator로 이동하고 기존 public export 계약은 유지한다.
   - 검증: 관련 service 테스트, `./node_modules/.bin/tsc --noEmit`
   - 완료: service facade가 정책/DB orchestration과 side effect coordinator를 직접 섞지 않는다.
2. **2026-07-17 — orchestration 실패 경로 회귀 테스트 추가**
   - 파일: 관련 `post-care`, `post-write-support`, upload finalization 테스트
   - 변경: 알림 실패, cache bump 실패, attach 실패, release 비동기 실패가 주 mutation 결과와 운영 기록을 구분하는지 검증한다.
   - 검증: `./node_modules/.bin/vitest run <관련 테스트>`
   - 완료: partial-success 경로가 명시적인 테스트 계약을 갖는다.
3. **2026-07-19 — notification/cache 운영 snapshot 확장**
   - 파일: `app/src/server/cache/query-cache.ts`, notification outbox query/service, health/ops overview
   - 변경: failure count, last failure, oldest pending/dead-letter age, retry scan 시각을 재사용 가능한 운영 snapshot으로 제공한다.
   - 검증: cache/notification/ops 테스트, query boundary check
   - 완료: 운영자가 “현재 실패가 있는가”뿐 아니라 “얼마나 오래 지속됐는가”를 확인할 수 있다.
4. **2026-07-20 — 관리자 운영 표시와 문서/릴리스 검증 정렬**
   - 파일: `app/src/app/admin/ops/page.tsx`, 관련 운영 문서 및 테스트
   - 변경: snapshot의 stale/dead-letter 상태를 운영 화면에 표시하고 1인 운영용 확인 절차를 문서화한다.
   - 검증: lint, typecheck, unit tests, build, Production health/CSP curl
   - 완료: 로컬·CI·Production에서 같은 운영 상태 판단 기준을 사용한다.

## Backlog

- 보호자-제보자 비공개 대화와 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다. 분실·목격 상태 변경과 상태 이력은 구현했다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
- 실제 트래픽이 증가하면 search context fan-out을 sampled batch aggregation으로 전환한다.
