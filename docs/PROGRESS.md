# PROGRESS.md

기준일: 2026-04-25
완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 현재 상태 스냅샷
- 상태 문서를 `docs/` 아래 slim active + archive 구조로 재편했다
- Impeccable 디자인 개선 workflow Phase 0-5를 완료했다
- 최근 완료 작업 상세와 과거 검증 로그는 [COMPLETED.md](./COMPLETED.md)로 이동했다
- 공개 SEO / metadata / sitemap 안정화를 완료했다
- 보안 헤더 / 운영 smoke evidence 보강을 완료했다
- 로딩 / 빈상태 polish 잔여 점검을 완료했다
- 레드팀 P0/P1 잔여 remediation 확인을 완료했다
- 운영 문서 최신성 점검을 완료했다
- 품종 기반 개인화/광고/커뮤니티 PRD 착수를 완료했다
- 피드 컨트롤 정렬/기간 클릭 체감 미적용 버그를 수정했다
- 검색 진입점을 헤더/전용 페이지에서 피드 하단 검색으로 통합했다
- 다음 작업: 로컬 핵심 기능 동작 검증

## 열린 blocker
- 없음. 기존 `db:restore:local` local test account count mismatch는 managed account count 검증으로 수정했고 restore 통과를 확인했다.

## 직전 검증
- 품종 개인화/광고/커뮤니티 PRD 착수:
  - 결정: 첫 구현 후보를 `개인화/광고 운영 튜닝 루프`로 좁혔다.
  - 추가: `business/product/품종_개인화_광고_커뮤니티_실행계획.md`에 A1-A4 순서, 제외 범위, 정책 게이트, 검증 명령을 정리했다.
  - 유지: 앱 기능 로직, 추천 알고리즘, 관리자 UI는 변경 없음.
  - 통과: `corepack pnpm -C app docs:refresh:check`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`.
- 피드 컨트롤 버그 수정:
  - 원인: 베스트글 정렬 링크 no-op, 맞춤 추천 정렬 유지, 게스트 canonical effect의 stale data 기반 URL 원복.
  - 수정: 정렬/기간 클릭 시 전체글 + 비개인화 조건을 명시하고, 게스트 canonical replace는 현재 query 데이터가 로드된 뒤에만 실행하게 했다.
  - 통과: `corepack pnpm -C app test -- src/components/posts/guest-feed-page-client.test.ts src/components/posts/feed-control-panel.test.tsx`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`.
- 피드 하단 검색 통합:
  - 변경: 헤더 검색 UI를 제거하고 `/feed`, `/feed/guest` 목록 하단에 제목/내용 선택 검색 form을 배치했다.
  - 호환: `/search`, `/search/guest`는 기존 q/type/searchIn을 보존해 `/feed`, `/feed/guest`로 redirect한다.
  - 통과: `corepack pnpm -C app test -- src/components/posts/feed-footer-search-form.test.tsx src/app/search/page.test.tsx src/app/search/guest/page.test.tsx src/middleware.test.ts`, `corepack pnpm -C app lint`, `corepack pnpm -C app typecheck`.
- 과거 Phase 0-5와 checkpoint/push 상세는 [COMPLETED.md](./COMPLETED.md)에 보관했다.

## 다음 액션
1. `corepack pnpm -C app quality:check`로 로컬 검증 전 기본 품질 게이트를 확인한다.
2. 필요 시 `corepack pnpm -C app db:restore:local` 후 `corepack pnpm -C app dev`로 로컬 서버를 준비한다.
3. 게스트/회원 피드와 검색, 게시글 액션, 신고/정책, 알림/마이페이지, 관리자 운영 화면 순서로 실제 클릭 동작을 확인한다.
4. 결과는 기능별 `정상 / 버그 / 보류`로 기록하고, 버그는 재현 URL/단계/원인 후보/수정 우선순위를 남긴다.
5. 개인화 운영 판단 기준 문서화는 로컬 핵심 기능 검증 완료 후 재개한다.

## Archive Pointer
- 2026-04-17 이전 app 상태 상세와 검증 로그: [COMPLETED.md](./COMPLETED.md)
