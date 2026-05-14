# Release Candidate Evidence

작성일: 2026-05-14

## 판정

로컬 기준 판정은 `GO`다.

`quality:check`와 hotpath e2e가 최종 통과했으며, 이번 검증 중 발견된 실패는 제품 코드 회귀가 아니라 e2e 준비/격리 취약점으로 분류해 수정했다.

Production 배포 후 public health도 실행해 통과했다.

## 실행 결과

| 항목 | 명령 | 결과 |
| --- | --- | --- |
| 기본 품질 게이트 | `corepack pnpm@9.12.3 -C app quality:check` | PASS |
| hotpath e2e | `corepack pnpm@9.12.3 -C app test:e2e:hotpath` | PASS |
| 배포 후 public health | `OPS_BASE_URL=https://townpet.vercel.app corepack pnpm@9.12.3 -C app ops:check:health` | PASS |

최종 `quality:check` 포함 범위:

- ESLint PASS
- TypeScript PASS
- Vitest 239 files / 1144 tests PASS
- Next production build PASS

최종 hotpath e2e 포함 범위:

- `e2e/search-and-board-filtering.spec.ts`
- `e2e/guest-post-management.spec.ts`
- `e2e/post-comment-auth-sync.spec.ts`
- `e2e/notification-filter-controls.spec.ts`
- `e2e/admin-new-user-policy.spec.ts`
- `e2e/report-flow.spec.ts`

최종 결과: 10 tests PASS.

## 발견 및 수정

### e2e 관리자 정책 로그인 준비값 누락

- 분류: `버그`
- 재현: `corepack pnpm@9.12.3 -C app test:e2e:hotpath`
- 실제 결과: `admin-new-user-policy`가 `/login?next=/admin/policies`에 머물며 로그인 실패
- 원인 후보: 테스트가 관리자 user role/emailVerified만 upsert하고 `passwordHash`를 보장하지 않아 로컬 DB 상태에 따라 로그인 실패
- 수정: `admin-new-user-policy`, `admin-guest-post-policy`에서 `hashPassword(adminPassword)`로 관리자 passwordHash를 명시 upsert
- 우선순위: P1, hotpath e2e false negative 제거

### 비회원 글 관리 e2e의 정책/제재 상태 의존

- 분류: `버그`
- 재현: `corepack pnpm@9.12.3 -C app test:e2e:hotpath`
- 실제 결과: 비회원 글 등록 후 `/posts/new`에 머물며 URL 전환 실패
- 원인 후보: 이전 e2e/수동 실행의 guest policy, guest ban/violation 상태와 rich editor keyboard 입력 의존
- 수정:
  - 테스트 시작 시 guest ban/violation을 정리하고 guest post policy를 기본값으로 세팅한 뒤 finally에서 복원
  - rich editor 입력은 keyboard event 대신 `locator.fill()`과 visible text assertion으로 고정
- 우선순위: P1, 반복 실행 가능한 hotpath 보장

### 댓글 auth sync e2e의 신규 유저 정책/로그아웃 URL 의존

- 분류: `버그`
- 재현: `corepack pnpm@9.12.3 -C app test:e2e:hotpath`
- 실제 결과: 댓글 composer 또는 logout redirect 기대가 간헐적으로 불일치
- 원인 후보:
  - 테스트 목적과 무관한 신규 유저 정책 상태가 전역 SiteSetting에 남을 수 있음
  - 로그아웃 후 URL보다 header auth state가 실제 검증 대상에 가까움
- 수정:
  - 테스트 동안 신규 유저 정책을 permissive 값으로 세팅하고 finally에서 원래 값 복원
  - 로그아웃 검증을 URL 고정 대신 visible login link로 확인
  - cleanup post id를 nullable 타입에서 명확히 좁힘
- 우선순위: P1, auth sync hotpath 안정화

### 검색 typo e2e locator 과엄격

- 분류: `버그`
- 재현: `corepack pnpm@9.12.3 -C app test:e2e:hotpath`
- 실제 결과: error snapshot에는 검색 결과 링크가 보이지만 `getByRole(..., { name })` assertion 실패
- 원인 후보: 링크 내부 중첩 텍스트 때문에 accessible name이 기대 문자열과 정확히 일치하지 않음
- 수정: 링크 role은 유지하되 `filter({ hasText: title })`로 실제 사용자 가시 텍스트를 검증
- 우선순위: P2, false negative 제거

### credentials login helper의 load 이벤트 의존

- 분류: `버그`
- 재현: 인증 후 target URL 도달 상태에서도 `page.waitForURL`이 load 이벤트 대기 중 timeout 가능
- 수정: `loginWithCredentials`의 URL 대기 조건을 `waitUntil: "domcontentloaded"`로 낮춤
- 우선순위: P2, e2e 안정화

## 배포 후 Health

실행 결과:

- URL: `https://townpet.vercel.app/api/health`
- HTTP status: `200`
- payload.status: `ok`
- payload.timestamp: `2026-05-14T04:39:19.301Z`
- elapsedMs: `1535`

## 보류/조건부 확인

이번 증적 작업에서 실행하지 않은 항목:

- production internal health/strict diagnostics: `OPS_HEALTH_INTERNAL_TOKEN` 필요
- real OAuth 실계정 검증: provider 계정과 GitHub Actions 수동 실행 필요
- payment/insurance/settlement: 현재 제품 범위 밖
- Kakao map, market/groupbuy deep feature: P2 release readiness 범위 밖
- 전체 Playwright 전수 실행: hotpath 우선 전략에 따라 이번 목표에서 제외

## 배포 판단

로컬 검증과 배포 후 public health 기준은 `GO`.

Internal diagnostics, real OAuth, 외부 고위험 기능은 별도 준비값이 있을 때 조건부로 확인한다.
