# PROGRESS.md

## 현재 상태

- 작업: 2일 백엔드 포트폴리오 고도화
- 상태: `in_progress`
- 현재 초점: P0 증거 패키징과 P1 route test gap 1차 보강을 완료했고, 다음은 남은 auth route gap 또는 알림 outbox 재처리/관측 루틴이다.

## 진행 중 메모

- 시작 증거:
  - API route handler: 48개
  - App page: 39개
  - Vitest test file: 229개
  - Playwright spec: 25개
  - Prisma model/enum declaration: 60개
- 이번 slice 변경:
  - `business/reports/backend-portfolio-case-study.md`
  - `business/reports/api-route-inventory.md`
  - `app/.env.example`
  - `app/.env.production.example`
  - `README.md`
  - `docs/PLAN.md`
  - `docs/PROGRESS.md`
- 완료한 내용:
  - 백엔드 case study 문서로 도메인 모델, service/query 구조, 보안, 운영, 테스트, 다음 리팩터링 후보를 정리했다.
  - API route inventory로 48개 route의 method/access/validation/monitoring 상태와 8개 adjacent route test gap을 정리했다.
  - clone 사용자가 바로 시작할 수 있도록 `app/.env.example`을 추가하고, 운영 env 예시인 `app/.env.production.example`을 추적 가능하게 했다.
  - README 빠른 실행을 `cp app/.env.example app/.env`로 수정하고 백엔드 포트폴리오 증거 문서를 연결했다.
- 검증:
  - `node scripts/refresh-docs-index.mjs --check`: 통과
  - `corepack pnpm@9.12.3 -C app lint`: 통과
  - `corepack pnpm@9.12.3 -C app typecheck`: 통과
  - `git diff --check --cached`: 통과
- 다음 작업:
  - P1 route test gap 1차 보강을 완료했다.
  - 추가 테스트:
    - `app/src/app/api/reports/[id]/route.test.ts`
    - `app/src/app/api/reports/bulk/route.test.ts`
    - `app/src/app/api/posts/[id]/content/route.test.ts`
    - `app/src/app/api/posts/[id]/stats/route.test.ts`
  - 검증:
    - `corepack pnpm@9.12.3 -C app test -- 'src/app/api/reports/[id]/route.test.ts' src/app/api/reports/bulk/route.test.ts 'src/app/api/posts/[id]/content/route.test.ts' 'src/app/api/posts/[id]/stats/route.test.ts'`: 통과, 4 files / 19 tests
  - 다음 후보:
    - 남은 auth route gap 보강: password reset confirm, password setup, email verification confirm
    - 알림 outbox 재처리/관측 루틴 개선
