# 2026-05-12 | vercel security env build preflight

## 증상
- Vercel build가 `Error: [build:vercel] security env preflight failed.`로 중단됐다.
- 다른 세션에서 env/문서를 한 번 정리해도, 이후 unrelated 변경 뒤 다시 같은 배포 실패가 반복됐다.

## 원인
- `build:vercel`가 운영자용 `ops:check:security-env:strict`를 그대로 호출하고 있었다.
- strict preflight는 production 필수 env뿐 아니라 원격 `/api/health` control-plane drift까지 확인한다.
- 그래서 실제 필수 secret 누락이 없어도 `OPS_BASE_URL`, 네트워크, remote control-plane 상태 변화 때문에 build가 다시 실패할 수 있었다.

## 수정
- `app/scripts/check-security-env.ts`를 `build`/`full` profile로 분리했다.
- `ops:check:security-env:build`는 production 필수 env/정책만 검사하고 remote control-plane health fetch는 생략한다.
- `build:vercel`는 production/staging target에서 `ops:check:security-env:build`만 실행하도록 바꿨다.
- preflight 실패 시 `[FAIL]` key를 에러 메시지에 포함해 어떤 env가 build를 막는지 바로 보이게 했다.

## 재발 방지
- 배포 hot path와 운영 진단을 분리한다.
- Vercel build 실패 분석은 먼저 `pnpm ops:check:security-env:build`로 재현한다.
- remote health/control-plane drift 점검은 `pnpm ops:check:security-env:strict`를 별도로 실행한다.
- 운영 가이드와 보안 문서를 build preflight/full strict 역할 기준으로 동기화한다.

## 검증
- `corepack pnpm@9.12.3 -C app exec vitest run scripts/vercel-build.test.ts scripts/check-security-env.test.ts src/lib/env.test.ts`
- `corepack pnpm@9.12.3 -C app lint scripts/vercel-build.ts scripts/vercel-build.test.ts scripts/check-security-env.ts scripts/check-security-env.test.ts src/lib/env.ts src/lib/env.test.ts`
- `corepack pnpm@9.12.3 -C app typecheck`
- placeholder production env + `OPS_BASE_URL=https://127.0.0.1.invalid`로 `corepack pnpm@9.12.3 -C app ops:check:security-env:build` PASS
- 동일 env로 `corepack pnpm@9.12.3 -C app ops:check:security-env:strict` 실행 시 `MODERATION_CONTROL_PLANE_HEALTH` FAIL 확인
