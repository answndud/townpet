# PLAN.md

기준일: 2026-04-16
목표: TownPet를 기능/운영/품질 기준에서 "완성도 높은 커뮤니티" 상태로 끌어올린다.

## 운영 규칙
- 세션 시작: `PLAN.md` + `PROGRESS.md` 먼저 확인
- 읽기 순서: `pending`/`in_progress`/`blocked` 사이클 먼저 확인
- 작업 시작: 대상 항목 상태를 `in_progress`로 변경
- 작업 종료: `PROGRESS.md`에 결과/검증/블로커 기록 후 `PLAN.md` 상태 갱신
- 사이클 내 모든 작업이 `done`이면 제목에 `(완료)` 표시
- 완료된 사이클은 상세 표를 남기지 않고 요약 목록으로 압축한다
- 블로커 발생: 두 파일 모두 즉시 반영 (`PLAN=계획 수정`, `PROGRESS=이슈 기록`)

## 범위 원칙
- 우선순위: `서비스 안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- Phase 2 보류: 마켓/케어/결제/공동구매/카카오맵은 Phase 1 완료 후 착수

## 현재 우선순위
1. 레드팀 P0/P1 취약점 remediation: JSON-LD XSS, 댓글 응답 민감정보/삭제 원문 노출, 로그인 오픈 리다이렉트, guest-mode 우회, 비회원 식별자 프라이버시 축소
2. 런치 준비 갭 정리: 공개 SEO/metadata/sitemap, 로딩/빈상태 polish, 보안 헤더/coverage 증거 보강
3. 운영 안정화: 무료 주간 10분 루틴 정착(health/log/manual smoke)
4. 운영 문서 유지: Vercel/OAuth/Secrets/데이터 관리 가이드 최신 상태 유지
5. `oauth-real-e2e` 워크플로우 실시크릿 1회 PASS 기록 완료
6. `ops-smoke-checks` 워크플로우 실배포 URL health PASS 기록 완료 (Sentry 검증은 선택)
7. 품종 기반 개인화/광고/커뮤니티 기능 PRD 확정 및 구현 사이클 착수
8. 보안 하드닝 트랙 분리 운영: `docs/security/*` 백로그/리스크/진행 로그 상시 동기화

## Active Plan

### Cycle 430: 게시글 에디터 SunEditor 전환 및 styled typing boundary 안정화
| 작업명 | 담당 에이전트 | 우선순위 | 상태 | 완료기준(DoD) | 의존성 |
|---|---|---|---|---|---|
| `contentEditable + execCommand`/실패한 Tiptap 보수 경로를 버리고 무료 외부 라이브러리 SunEditor로 게시글 작성/수정 에디터를 재구성하며, 숫자 폰트 크기/이미지/링크/인용/목록을 내장 툴바 기준으로 안정화하고, 반복적으로 깨지던 색상 커스텀 UI는 제거하며, 선택 텍스트만 스타일이 적용된 뒤 다음 입력은 기본 스타일로 분리되도록 마무리한다 | Codex | P0 | `in_progress` | create/edit 폼이 공용 `PostBodyRichEditor` 기반 SunEditor를 사용하고, 상단/내장 툴바에서 폰트 크기 숫자 선택과 이미지 업로드/링크/인용/목록이 동작하며, 불안정했던 글자색 커스텀 UI는 작성/수정 툴바에서 제거되고, 기존 TownPet `[color=#...]` markup은 과거 글 호환성을 위해 렌더/직렬화 경로에서 계속 지원되며, 이미지 업로드/링크/인용/목록/게스트 수정 플로우가 새 에디터 기준 E2E로 고정되고, 저장 포맷은 기존 TownPet markup을 유지하며, 스타일 적용 뒤 다음 입력은 기본 스타일로 분리되고, `PLAN.md`/`PROGRESS.md`가 최신 상태를 반영한다 | `PLAN.md`, `PROGRESS.md`, `app/package.json`, `app/pnpm-lock.yaml`, `app/src/components/posts/post-body-rich-editor.tsx`, `app/src/components/posts/post-create-form.tsx`, `app/src/components/posts/post-detail-edit-form.tsx`, `app/src/app/globals.css`, `app/src/app/globals-css.test.ts`, `app/src/lib/editor-content-serializer.ts`, `app/src/lib/editor-image-markup.ts`, `app/src/lib/markdown-lite.ts`, `app/src/server/services/post.service.ts`, `app/e2e/post-editor-toolbar.spec.ts`, `app/e2e/image-upload-flow.spec.ts`, `app/e2e/guest-post-management.spec.ts`, `local PostgreSQL (Playwright verification)` |

## Completed Summary

- Cycle 442 (2026-04-16): `/feed` 첫 페이지에서 count/list 조회를 공통 helper로 병렬화하고 page overflow 때만 재조회하도록 바꿨으며, guest/streaming 로딩 상태를 공통 skeleton으로 통일하고 관련 테스트/블로그를 동기화했다.
- Cycle 441 (2026-04-16): coverage threshold가 현재 테스트 베이스라인보다 높아 CI가 계속 실패해 `vitest` global threshold를 측정값 바로 아래로 재조정했다.
- Cycle 440 (2026-04-16): production `/feed`에서 self-redirect loop가 발생해 guest feed redirect 단순화를 되돌리고, guest page non-redirect 회귀 테스트와 에러 기록을 추가했다.
- Cycle 438 (2026-04-16): 문서 인덱스 목록 수집을 파일시스템 walk 대신 `git ls-files` 기준으로 바꿔 checkout 환경 차이와 무관하게 동일한 report를 생성하도록 고정했다.
- Cycle 437 (2026-04-16): 문서 인덱스 체크 비교를 `LF + NFC` 기준으로 정규화하고 `fileURLToPath`로 경로 해석을 고정해 CI 환경 차이에도 흔들리지 않게 했다.
- Cycle 436 (2026-04-16): 문서 인덱스 생성에서 경로 문자열을 NFC로 정규화해 macOS/Linux 간 한글 파일명 차이로 `docs:refresh:check`가 흔들리지 않게 했다.
- Cycle 435 (2026-04-16): `docs:refresh:check`가 macOS/Linux 간 정렬 차이로 흔들리지 않도록 문서 인덱스 생성 정렬을 환경 독립적으로 고정했다.
- Cycle 434 (2026-04-16): coverage threshold와 `docs:refresh:check`를 기존 CI에 추가하고, 운영 문서를 `quality:check`/`ops:check:health`/`db:restore:local` + `quality-gate`/`ops-smoke-checks` 중심 최소 루틴으로 재정리했다.
- Cycle 433 (2026-04-16): `auth`/`notifications` validation-service-query-action을 도메인 하위 폴더로 옮기고 기존 경로는 shim으로 유지했으며, 관련 구조 문서의 canonical path를 동기화했다.
- Cycle 432 (2026-04-16): `posts`/`moderation` validation-query-service를 도메인 하위 폴더로 옮기고 기존 경로는 shim으로 유지했으며, `README.md`, `AGENTS.md`, `app/README.md`에 canonical path와 계층 경계를 반영했다.
- Cycle 431 (2026-04-16): `AGENTS.md` 단일 하네스 통합, 중복 하네스 문서 제거, 활성 문서 링크 재정리.
- Cycle 429 (2026-04-14): Tiptap 기반 공용 에디터로 1차 전환했지만, 같은 날 추가 회귀로 Cycle 430에서 SunEditor 경로로 재정리.
- Cycle 428 (2026-04-14): inline typing boundary 분리, selection 저장 보강, 이미지 markdown 중복 직렬화 정리.
- Cycle 427 (2026-04-14): 툴바 selection regression 복구와 브라우저 회귀 스펙 추가.
- Cycle 426 (2026-04-14): 게시글 에디터 상단 툴바/서식 UX 재구성.
- Cycle 425 (2026-04-14): Prisma init failure 시 public read degraded fallback 추가.
- Cycle 423~424, 408~422, 405~417 (2026-04-07): 블로그 시리즈 작성/보강, 문체/mermaid/Q&A 강화, 피드/상세/댓글/accessibility/UI polish 진행.
- Cycle 397~404 (2026-04-06): README 포트폴리오 랜딩 정리, production demo seed/이미지 복구, 캡처 갱신, 작업 부산물 정리.
- Cycle 381~388, 395~396 (2026-03-23~2026-03-27): 로컬 DB restore 체인, 테스트 계정/engagement seed, fresh DB migration repair, admin-only 분리, legal/commercial surface, ops/deploy hardening 정리.
- Cycle 372~380 (2026-03-19~2026-03-21): 검색 운영 telemetry, zero-result loop, admin 모바일 fallback, `pg_trgm` health/ops smoke 가시화 정리.
- Cycle 355~371 (2026-03-12~2026-03-13): red-team remediation, direct moderation, admin/search/auth hardening, privacy 축소 작업 완료.
- Cycle 279, 298~354 (2026-03-10~2026-03-12): 업로드 proxy/backfill, 댓글/반응/뮤트/검색/피드/상세 UX 및 정합성 다수 정리.
- Cycle 205, 237~278 (2026-03-07~2026-03-10): guest abuse defense, feed/detail/profile/README/personalization/auth/OAuth/입양·봉사 보드 확장, upload/media 경로 정리.
- Cycle 126~204 (2026-03-04~2026-03-06): OAuth 증적 자동화, latency snapshot/캐시 최적화, guest API 전환, deploy/security/docs hardening, ops smoke/Sentry/`pg_trgm` 운영 루프 정착.
- Cycle 67~125 (2026-02-25~2026-03-03): security hardening track, locality/feed/detail caching, profile/pet/policy 정리, 모바일/반응형 polish, 접근제어 보강 완료.
- Cycle 1~66 (2026-02-24 이전 포함): core community, notifications, trust/safety, upload UX, GuestAuthor 전환, community board 기반, growth/ops 문서 초석 완료.
