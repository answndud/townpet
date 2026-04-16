# PROGRESS.md

기준일: 2026-04-16

## 진행 현황 요약
- Cycle 1~66: 커뮤니티 기본 구조, upload, notifications, trust/safety, GuestAuthor 전환, growth/ops 문서 기반 완료
- Cycle 67~125: security hardening, locality/feed/detail caching, profile/pet/policy, 모바일/접근성 polish 완료
- Cycle 126~204: OAuth 증적 자동화, guest API 전환, deploy/security/docs hardening, ops smoke/Sentry/`pg_trgm` 운영 루프 정착
- Cycle 205, 237~278: guest abuse defense, profile/README/personalization/auth/OAuth, adoption/volunteer board, media/upload 체계 확장 완료
- Cycle 279, 298~354: upload proxy/backfill, comments/reactions/mute/search/feed/detail UX 및 정합성 다수 정리 완료
- Cycle 355~371: red-team remediation, direct moderation, admin/search/auth hardening, privacy 축소 완료
- Cycle 372~380: 검색 운영 telemetry, zero-result loop, admin 모바일 fallback, `pg_trgm` health/ops smoke 가시화 완료
- Cycle 381~388, 395~396: local restore 체인, 테스트 계정/engagement seed, fresh DB migration repair, admin-only 분리, legal/commercial surface, ops/deploy hardening 완료
- Cycle 397~404: README/demo package 재정리, production demo seed/이미지 복구, 캡처 갱신 완료
- Cycle 405~424: feed/detail/comment/accessibility/UI polish, TownPet 블로그 시리즈 작성/보강, 인터뷰 대응력 강화 완료
- Cycle 431: `AGENTS.md` 단일 하네스 통합 완료

## 현재 진행

### 2026-04-14: Cycle 430 진행 중 (게시글 에디터 SunEditor 전환 및 styled typing boundary 안정화)
- 완료 내용: `@tiptap/*` 의존성을 제거하고 `suneditor-react` 기반 공용 `PostBodyRichEditor`로 전환했다.
- 완료 내용: 작성/수정 폼이 같은 에디터 컴포넌트를 공유하고, 숫자 폰트 크기/이미지/링크/인용/목록을 SunEditor 내장 툴바 기준으로 재구성했다.
- 완료 내용: 반복적으로 깨지던 글자색 커스텀 UI는 제거했고, 기존 `[color=#...]` markup 렌더링은 과거 글 호환성을 위해 유지했다.
- 완료 내용: submit 시 React state 지연 대신 에디터 인스턴스에서 직렬화된 본문/이미지 목록을 직접 읽도록 바꿨다.
- 완료 내용: 이미지 width token 정규식을 `1~4`자리로 넓혀 `{width=1}` 문자열이 본문에 남는 문제를 막았다.
- 완료 내용: `post-editor-toolbar`, `image-upload-flow`, `guest-post-management` E2E를 SunEditor DOM 기준으로 갱신했다.
- 검증 결과: `corepack pnpm -C app typecheck` 통과.
- 검증 결과: `corepack pnpm -C app exec vitest run src/app/globals-css.test.ts` 통과.
- 검증 결과: 관련 ESLint/lint 통과.
- 검증 결과: `corepack pnpm -C app test:e2e -- e2e/image-upload-flow.spec.ts --project=chromium` 통과.
- 검증 결과: `corepack pnpm -C app test:e2e -- e2e/guest-post-management.spec.ts --project=chromium` 통과.
- 블로커: `e2e/post-editor-toolbar.spec.ts`의 “서식 적용 후 다음 입력이 기본 스타일로 분리돼야 한다” 케이스가 아직 실패한다.
- 블로커: 같은 E2E를 재실행한 최근 시도는 코드 오류가 아니라 로컬 PostgreSQL(`localhost:5432`) 미기동 때문에 시작 단계에서 중단됐다.

## 완료 요약

- 2026-04-16: Cycle 436 완료 - `refresh-docs-index.mjs`에서 상대 경로 문자열을 NFC로 정규화해 macOS/Linux 간 한글 파일명 표현 차이로 `docs:refresh:check`가 흔들리지 않게 했다.
- 2026-04-16: Cycle 435 완료 - `refresh-docs-index.mjs` 정렬을 기본 `localeCompare()` 대신 환경 독립적인 stable sort로 바꿔 `docs:refresh:check`가 macOS/Linux 간 순서 차이로 깨지지 않게 했다.
- 2026-04-16: Cycle 434 완료 - coverage threshold와 `docs:refresh:check`를 기존 CI에 추가하고, 운영 문서를 `quality:check`/`ops:check:health`/`db:restore:local` + `quality-gate`/`ops-smoke-checks` 중심 최소 루틴으로 재정리했다.
- 2026-04-16: Cycle 433 완료 - `auth`/`notifications` validation-service-query-action을 도메인 하위 폴더로 옮기고 기존 경로는 shim으로 유지했으며, 관련 구조 문서의 canonical path를 동기화했다.
- 2026-04-16: Cycle 432 완료 - `posts`/`moderation` validation-query-service를 도메인 하위 폴더로 옮기고 기존 경로는 shim으로 유지했으며, `README.md`, `AGENTS.md`, `app/README.md`에 canonical path와 계층 경계를 반영했다.
- 2026-04-16: Cycle 431 완료 - `AGENTS.md` 단일 하네스로 통합하고 `FORcodex.md`, `docs/개발_운영_가이드.md`, `docs/operations/Codex_작업_지도.md`를 제거했으며 활성 문서 링크를 재정리했다.
- 2026-04-14: Cycle 429 완료 - Tiptap 기반 공용 에디터로 1차 전환했지만 같은 날 추가 회귀로 Cycle 430에서 SunEditor 경로로 재정리했다.
- 2026-04-14: Cycle 428 완료 - inline typing boundary 분리, selection 저장 보강, 이미지 markdown 중복 직렬화를 정리했다.
- 2026-04-14: Cycle 427 완료 - 툴바 selection regression을 복구하고 브라우저 회귀 스펙을 추가했다.
- 2026-04-14: Cycle 426 완료 - 게시글 에디터 상단 툴바/서식 UX를 공용 구조로 재정리했다.
- 2026-04-14: Cycle 425 완료 - Prisma init failure 시 public feed/search/sitemap/post metadata가 500으로 무너지지 않도록 degraded fallback을 추가했다.
- 2026-04-07: Cycle 423~424 완료 - 블로그 절대경로 링크 제거, 공통 템플릿 보강, 대표 글 면접 Q&A 부록 추가.
- 2026-04-07: Cycle 408~422 완료 - TownPet 블로그 시리즈 01~24 초안 작성과 문체/diagram 강화, feed/detail/comment/accessibility/UI polish를 마쳤다.
- 2026-04-06: Cycle 397~404 완료 - README 포트폴리오 랜딩 정리, production demo seed/이미지 복구, 스크린샷 재캡처, 부산물 정리를 마쳤다.
- 2026-03-27: Cycle 385~388, 395~396 완료 - fresh DB migration repair, admin-only 분리, legal/commercial surface, ops/deploy hardening, 지원용 README 정리를 마쳤다.
- 2026-03-23: Cycle 381~384 완료 - 로컬 Docker Postgres 복구, engagement/test-account seed, one-command local restore를 추가했다.
- 2026-03-19~2026-03-21: Cycle 372~380 완료 - 검색 운영 telemetry, zero-result loop, admin 모바일 fallback, `pg_trgm` health/ops smoke 가시화를 정리했다.
- 2026-03-12~2026-03-13: Cycle 355~371 완료 - red-team remediation, direct moderation, admin/search/auth hardening, public identifier privacy 축소를 마쳤다.
- 2026-03-10~2026-03-12: Cycle 279, 298~354 완료 - upload proxy/backfill, 댓글/반응/뮤트/검색/피드/상세 UX와 정합성 문제를 대거 정리했다.
- 2026-03-07~2026-03-10: Cycle 205, 237~278 완료 - guest abuse defense, auth/OAuth/profile/personalization, adoption/volunteer board, media/upload 체계를 확장했다.
- 2026-03-04~2026-03-06: Cycle 126~204 완료 - OAuth 증적 자동화, hot path latency reduction, guest API 전환, deploy/security/docs hardening, ops smoke/Sentry/`pg_trgm` 운영 루프를 정착시켰다.
- 2026-02-25~2026-03-03: Cycle 67~125 완료 - security hardening track, locality/feed/detail caching, profile/pet/policy, 모바일/접근성 polish를 마쳤다.
- 2026-02-24 이전 포함: Cycle 1~66 완료 - core community, notifications, upload UX, trust/safety, GuestAuthor, community board 기반, growth/ops 문서 초석을 마쳤다.
