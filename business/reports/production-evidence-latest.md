# 최신 프로덕션 증빙

작성일: 2026-05-18

## 범위

TownPet 1인 운영 기준 프로덕션 smoke 증빙이다.

이 증빙은 `business/operations/운영_문서_안내.md`에 정리된 축소 운영 경로를 따른다. public health만 확인하고, browser smoke, production test data, 외부 OAuth 실계정 흐름은 포함하지 않는다.

## 결과

- 상태: `PASS`
- 기준 URL: `https://townpet.vercel.app`
- 프로파일: `solo`
- 실행 명령: `OPS_BASE_URL=https://townpet.vercel.app corepack pnpm@9.12.3 -C app ops:evidence:solo`
- 로컬 evidence 파일: `docs/reports/ops-evidence-2026-05-18T08-11-17-318Z.md`
- evidence 파일 추적 방식: local evidence라서 git 추적 제외

## health 증빙

- endpoint: `https://townpet.vercel.app/api/health`
- HTTP status: `200`
- payload status: `ok`
- payload timestamp: `2026-05-18T08:11:21.726Z`
- elapsed: `3974ms`
- runner step: `health`
- runner status: `PASS`
- runner duration: `4538ms`

## 배포 가능성 판단

- 1인 운영 health smoke: `PASS`
- full strict release readiness: 이번 증빙에서는 주장하지 않음

이번 1인 운영 증빙이 다루지 않은 항목:

- `OPS_HEALTH_INTERNAL_TOKEN`을 사용하지 않았기 때문에 internal health diagnostics는 확인하지 않았다.
- internal health를 요청하지 않았기 때문에 `pg_trgm` 필수 여부도 확인하지 않았다.
- solo profile은 의도적으로 strict security env preflight를 건너뛰므로 production secret strict 검증은 포함하지 않았다.
- browser smoke와 실제 OAuth 계정 확인은 on-demand 점검으로 분리되어 있다.

## 후속

- 평상시 1인 운영에서는 production이 살아 있는지 확인하는 용도로 충분하다.
- release candidate, incident, env, DB extension, auth, browser behavior까지 확인해야 하는 상황에서는 `business/operations/배포전_on-demand_체크.md`의 해당 점검을 실행한다.
