# 25. quality gate와 deploy pipeline을 과하게 설계하면 생기는 일

## 이번 글에서 풀 문제

검증은 많을수록 좋아 보입니다.

- coverage도 돌리고
- browser smoke도 돌리고
- data rehearsal도 돌리고
- security preflight도 돌리고
- deploy build에서도 여러 preflight를 또 돌리고

처음에는 이 구성이 “안전해 보이는 설계”처럼 느껴집니다.

하지만 TownPet를 실제로 계속 밀어보니,  
검증이 많다는 사실 자체보다 **어떤 검증이 어디에 붙어 있느냐**가 훨씬 더 중요했습니다.

이 글은 TownPet에서 quality gate와 deploy pipeline이 과해졌을 때 어떤 문제가 생겼는지,  
그리고 왜 hot path를 다시 줄였는지를 회고합니다.

## 왜 이 글이 중요한가

개인 프로젝트나 소규모 팀에서 CI/CD는 단순 자동화가 아닙니다.

그건 곧 개발 속도 그 자체입니다.

만약 한 번의 push마다:

- unit test를 여러 번 다시 돌리고
- browser install까지 하고
- 운영 rehearsal도 같이 돌고
- deploy build에서도 필수 아닌 preflight가 계속 실행되면

문제는 “검증이 엄격하다”가 아니라,  
**피드백 루프가 느려지고 실패 원인이 흐려진다**는 점입니다.

TownPet는 이 문제를 실제로 겪었습니다.

## 먼저 볼 핵심 파일

- [`.github/workflows/quality-gate.yml`](../.github/workflows/quality-gate.yml)
- [`.github/workflows/browser-smoke.yml`](../.github/workflows/browser-smoke.yml)
- [`.github/workflows/guest-legacy-maintenance.yml`](../.github/workflows/guest-legacy-maintenance.yml)
- [`.github/workflows/docs-quality.yml`](../.github/workflows/docs-quality.yml)
- [`app/scripts/vercel-build.ts`](../app/scripts/vercel-build.ts)
- [`blog/19-testing-and-quality-gate.md`](./19-testing-and-quality-gate.md)

## 1. 과설계는 보통 이렇게 시작된다

처음에는 모든 검증이 다 타당해 보입니다.

- migration chain 검증
- coverage
- notification contract
- browser smoke
- guest legacy cleanup rehearsal
- security env preflight
- auth email readiness
- neighborhood sync

각각만 따로 보면 다 이유가 있습니다.

문제는 이걸 전부:

- PR hot path
- merge 직전 CI
- deploy build

같은 **가장 자주, 가장 빨리 돌아야 하는 경로**에 넣는 순간부터 시작됩니다.

즉 과설계는 “쓸모없는 검증을 넣었다”보다,  
**유효한 검증을 잘못된 위치에 넣었다**에 더 가깝습니다.

## 2. 첫 번째 리스크: 배포 속도 지연

이건 가장 눈에 띄는 리스크입니다.

예를 들어:

- browser 설치
- coverage 계산
- 전체 auth email readiness 스캔
- neighborhood sync
- maintenance rehearsal

이런 단계는 중요할 수 있어도, 모든 배포마다 꼭 필요하지는 않습니다.

그런데 이게 deploy hot path에 들어가면:

- 코드 수정은 이미 끝났는데
- build가 오래 걸리고
- 실패해도 deploy-essential 문제인지 아닌지 바로 알기 어렵고
- 작은 수정도 큰 배포처럼 느려집니다

결과적으로 배포 속도 자체가 떨어집니다.

## 3. 두 번째 리스크: unrelated failure coupling

이게 더 위험합니다.

예를 들어 내가 고친 것은:

- UI 문구
- 간단한 route contract
- 작은 validation bug

인데 CI는:

- docs freshness
- browser smoke
- maintenance rehearsal
- security preflight dummy env

중 하나에서 깨질 수 있습니다.

그러면 실패 메시지는 “네가 방금 고친 코드가 위험하다”가 아니라,  
**지금 hot path에 같이 붙어 있던 다른 검증이 깨졌다**가 됩니다.

이 구조는 리뷰와 디버깅 둘 다 느리게 만듭니다.

## 4. 세 번째 리스크: flaky gate 증가

브라우저 E2E, 외부 env preflight, production-like rehearsal은  
로직 unit test보다 환경 영향이 큽니다.

이런 검증을 매 PR마다 강제하면:

- CI가 자주 느려지고
- 가끔 재실행으로만 통과하고
- 실패가 진짜 regression인지 환경 noise인지 애매해집니다

검증이 많아질수록 안전해지는 게 아니라,  
**잡음이 많아져서 중요한 failure가 묻히는 상태**가 될 수 있습니다.

## 5. 네 번째 리스크: 우회 행동을 유도한다

이건 팀 규모와 상관없이 나쁜 신호입니다.

파이프라인이 너무 느리거나 unrelated failure가 많아지면 사람은 자연스럽게:

- “일단 direct push 할까?”
- “이 단계는 그냥 재실행하면 되겠지”
- “지금은 smoke 건너뛰고 나중에 보자”

같은 행동을 하게 됩니다.

즉 gate가 너무 무거우면,  
gate가 안전장치가 아니라 **우회하고 싶은 장애물**이 됩니다.

그 순간 검증 설계는 이미 실패한 것입니다.

## 6. 다섯 번째 리스크: deploy와 maintenance의 경계가 무너진다

TownPet에서 특히 중요했던 포인트입니다.

deploy는 기본적으로:

- 새 코드를 올리고
- 필요한 migration을 적용하고
- build를 성공시키고
- runtime이 뜨는지 확인하는 일

이어야 합니다.

그런데 여기에:

- backfill rehearsal
- cleanup readiness
- 참조 데이터 sync
- 일회성 repair SQL

까지 묶기 시작하면 deploy는 더 이상 deploy가 아닙니다.

그건 **maintenance runner**가 됩니다.

이렇게 되면 운영성 작업 하나 때문에 정상 배포가 같이 흔들릴 수 있습니다.

## 7. 그래서 TownPet는 어떻게 다시 나눴는가

현재 기준은 단순합니다.

### PR hot path

- `prisma migrate deploy`
- `quality:check`

즉 merge safety에 직접 필요한 것만 둡니다.

### lightweight side workflow

- docs freshness

즉 cheap하지만 hot path와 목적이 다른 검증은 따로 둡니다.

### on-demand workflow

- browser smoke
- guest legacy maintenance

즉 중요하지만 every push에 강제할 필요는 없는 검증은 필요할 때만 돌립니다.

### deploy build

- security env preflight
- `prisma migrate deploy`
- `prisma generate`
- `next build`

즉 deploy-essential only로 줄입니다.

### post-deploy

- health
- prewarm
- optional pg_trgm
- optional sentry

즉 실제 URL은 별도 smoke로 다시 봅니다.

## 8. 핵심 판단 기준은 이것 하나다

어떤 검증이든 아래 질문에 답하면 됩니다.

### 질문 1. 이 검사가 실패하면 merge를 막아야 하는가?

그러면 PR hot path에 둡니다.

### 질문 2. 이 검사가 실패하면 deploy를 막아야 하는가?

그러면 deploy build에 둡니다.

### 질문 3. 중요하지만 항상 막아야 하는 것은 아닌가?

그러면 manual/on-demand/post-deploy로 보냅니다.

대부분의 과설계는 이 세 질문을 구분하지 않았을 때 생깁니다.

## 9. TownPet에서 얻은 교훈

TownPet에서 실제로 얻은 교훈은 이렇습니다.

- 검증 항목 수보다 배치 위치가 더 중요하다
- hot path는 작고 빠를수록 좋다
- 무거운 검증은 버리지 말고 on-demand로 보내야 한다
- deploy에는 deploy-essential만 남겨야 한다
- “안전해 보인다”와 “지속 가능하다”는 다르다

즉 좋은 CI/CD는 모든 검증을 다 실행하는 파이프라인이 아니라,  
**언제 어떤 검증을 돌려야 하는지가 분명한 파이프라인**입니다.

## 직접 실행해 보고 싶다면

현재 TownPet 기준으로는 아래 정도만 기억하면 충분합니다.

```bash
corepack pnpm -C app quality:check
corepack pnpm -C app test:e2e:smoke
corepack pnpm -C app ops:check:security-env:strict
corepack pnpm -C app ops:check:auth-email-readiness
```

그리고 workflow 기준으로는:

- PR hot path: `quality-gate.yml`
- docs-only/lightweight: `docs-quality.yml`
- on-demand browser smoke: `browser-smoke.yml`
- on-demand maintenance: `guest-legacy-maintenance.yml`
- post-deploy: `ops-smoke-checks.yml`

이 구도를 보면 전체 판단이 바로 보입니다.

## 현재 구현의 한계

- browser smoke를 매 PR에 강제하지 않기 때문에 release 직전 수동 확인 책임은 남습니다.
- auth email readiness를 manual로 돌리기 때문에, 관련 migration에서는 운영자가 의식적으로 확인해야 합니다.
- maintenance workflow를 분리해도, 그 자체의 필요성이 사라진 것은 아닙니다.

## Python/Java 개발자용 요약

- 과설계된 pipeline은 “검증이 많아서 안전한 구조”가 아니라 “검증 위치가 잘못된 구조”일 수 있습니다.
- PR CI는 JUnit 빠른 회귀와 migration sanity 정도만 남기고,
- 무거운 Selenium/maintenance 성격 검증은 on-demand로 보내고,
- deploy는 build-essential만 남기는 쪽이 더 현실적입니다.

## 면접에서 이렇게 설명할 수 있다

> TownPet를 하면서 배운 건 검증을 많이 넣는 것보다, 어느 검증을 hot path에 둘지 결정하는 일이 더 중요하다는 점입니다. browser smoke, maintenance rehearsal, auth data readiness 같은 검사는 가치가 있지만 every push/every deploy에 다 묶으면 배포가 느려지고 failure coupling이 생깁니다. 그래서 TownPet는 PR gate, on-demand smoke, deploy-essential build, post-deploy smoke로 검증 위치를 다시 나눴습니다.
