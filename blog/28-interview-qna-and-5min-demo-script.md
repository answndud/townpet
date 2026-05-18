# 28. 면접 Q&A 카드와 5분 데모 스크립트

## 이번 글에서 풀 문제

TownPet는 기능과 문서가 많습니다.

면접에서는 이게 장점이면서 동시에 위험이 됩니다. 전부 설명하려고 하면 산만해지고, 화면만 보여주면 깊이가 약해 보입니다.

이 글은 TownPet를 **백엔드 개발자 포트폴리오**로 설명할 때 바로 사용할 수 있는 두 가지 자료를 정리합니다.

- 5분 데모 스크립트
- 면접 Q&A 카드

## 먼저 볼 핵심 파일

- [README.md](../README.md)
- [24-demo-docs-and-interview-pack.md](./24-demo-docs-and-interview-pack.md)
- [27-backend-portfolio-hardening-log.md](./27-backend-portfolio-hardening-log.md)
- [backend-portfolio-case-study.md](../business/reports/backend-portfolio-case-study.md)
- [api-route-inventory.md](../business/reports/api-route-inventory.md)
- [api-route-contracts.generated.md](../business/reports/api-route-contracts.generated.md)
- [production-evidence-latest.md](../business/reports/production-evidence-latest.md)
- [app/src/server/services/posts/post.service.ts](../app/src/server/services/posts/post.service.ts)
- [app/src/server/queries/posts/post.queries.ts](../app/src/server/queries/posts/post.queries.ts)
- [app/src/server/services/moderation/report.service.ts](../app/src/server/services/moderation/report.service.ts)
- [app/src/app/api/health/route.ts](../app/src/app/api/health/route.ts)

## 5분 데모 스크립트

### 0:00-0:30. 한 문장 소개

> TownPet는 반려 생활 정보를 지역과 상황 맥락으로 나눠 탐색하게 만든 커뮤니티입니다. 단순 게시판이 아니라 검색, 작성, 신고, 제재, 알림, 관리자 운영, health check까지 포함한 제품형 백엔드 포트폴리오로 만들었습니다.

여기서 먼저 강조할 점은 기능 수가 아닙니다.

- `LOCAL / GLOBAL`을 단순 필터가 아니라 운영 경계로 설계했다.
- 게스트와 회원 모두 사용할 수 있지만 abuse-prone flow는 서비스 레이어에서 제어한다.
- 배포 후 production health evidence까지 남긴다.

### 0:30-1:20. README로 전체 구조 보여주기

먼저 [README.md](../README.md)를 엽니다.

보여줄 포인트:

- 제품 문제 정의
- 대표 화면
- 기술적으로 한 일
- 백엔드 포트폴리오 증거
- 대표 도메인 묶음

말할 내용:

> README는 설치 가이드보다 먼저 이 프로젝트가 어떤 백엔드 역량을 보여주는지 설명하도록 구성했습니다. API route 48개 contract, production health evidence, `quality:check` 결과, post query/create 리팩터링 결과를 첫 문서에서 바로 확인할 수 있게 했습니다.

### 1:20-2:00. 사용자 hot path 보여주기

데모 사이트 또는 로컬에서 피드와 검색을 보여줍니다.

추천 경로:

- `/feed/guest`
- `/feed`
- `/search` legacy redirect 또는 하단 검색 흐름
- 게시글 상세

말할 내용:

> 피드와 검색은 게스트/회원 모두 쓸 수 있지만, 회원 상태에서는 개인화 추천과 명시 정렬/기간 조건이 충돌하지 않게 분리했습니다. 검색은 별도 검색 페이지만이 아니라 피드 탐색 흐름 안에서 제목/내용 기준으로 사용할 수 있게 정리했습니다.

강조할 코드:

- [app/src/app/feed/page.tsx](../app/src/app/feed/page.tsx)
- [app/src/server/queries/posts/post-list.queries.ts](../app/src/server/queries/posts/post-list.queries.ts)
- [app/src/server/queries/posts/post-feed-personalization.queries.ts](../app/src/server/queries/posts/post-feed-personalization.queries.ts)

### 2:00-3:00. 쓰기 정책과 구조화 게시글 설명

글 작성 흐름을 보여주거나 코드로 설명합니다.

말할 내용:

> 글 작성은 단순 CRUD가 아닙니다. 게시판 type에 따라 병원 후기, 산책로, 거래, 돌봄, 입양, 실종 같은 structured payload가 달라지고, 게스트 작성과 회원 작성도 정책이 다릅니다. 그래서 validation, service, transaction, moderation hook을 분리했습니다.

강조할 코드:

- [app/src/lib/validations/posts/post.ts](../app/src/lib/validations/posts/post.ts)
- [app/src/server/services/posts/post.service.ts](../app/src/server/services/posts/post.service.ts)
- [app/src/server/services/posts/post-create-variants.ts](../app/src/server/services/posts/post-create-variants.ts)

### 3:00-4:00. 운영과 모더레이션 보여주기

관리자 surface와 신고 흐름을 설명합니다.

추천 경로:

- `/admin`
- `/admin/ops`
- `/admin/reports`

말할 내용:

> 개인 프로젝트지만 신고, 차단, 제재, 직접 모더레이션, 감사 로그를 포함했습니다. 중요한 정책은 UI에만 있지 않고 service layer에서 집행합니다. 운영 화면은 보기 좋은 admin이 아니라 신고 적체, health, 검색 품질, auth 실패 같은 운영 판단을 돕기 위한 surface입니다.

강조할 코드:

- [app/src/server/services/moderation/report.service.ts](../app/src/server/services/moderation/report.service.ts)
- [app/src/server/services/moderation/sanction.service.ts](../app/src/server/services/moderation/sanction.service.ts)
- [app/src/server/queries/ops-overview.queries.ts](../app/src/server/queries/ops-overview.queries.ts)

### 4:00-5:00. 검증과 운영 증거로 마무리하기

마지막은 기능 화면이 아니라 증거 문서로 닫습니다.

보여줄 파일:

- [api-route-contracts.generated.md](../business/reports/api-route-contracts.generated.md)
- [production-evidence-latest.md](../business/reports/production-evidence-latest.md)
- [backend-portfolio-case-study.md](../business/reports/backend-portfolio-case-study.md)

말할 내용:

> 마지막으로 이 프로젝트는 기능 구현 후 끝내지 않고 검증 가능한 증거를 남겼습니다. 현재 API route 48개에 대해 method/access/validation/monitoring/test adjacency를 관리하고, `validation=none`과 `monitoring=none`은 0건입니다. `quality:check`는 lint, typecheck, Vitest 248 files / 1198 tests, Next build까지 통과했고, production health도 200 / ok로 기록했습니다.

## 면접 Q&A 카드

### Q1. 이 프로젝트를 한 문장으로 설명하면?

TownPet는 반려 생활 정보를 지역과 상황 맥락으로 나눠 탐색하게 만든 커뮤니티입니다. 단순 게시판이 아니라 피드, 검색, 작성, 댓글, 알림, 신고, 제재, 관리자 운영, health check까지 포함한 백엔드 중심 제품형 포트폴리오입니다.

### Q2. 왜 일반 게시판이 아니라 `LOCAL / GLOBAL` 구조를 만들었나요?

반려 생활 정보는 지역성이 강한 정보와 지역성이 약한 정보가 섞입니다. 병원, 산책로, 실종, 모임은 지역 맥락이 중요하지만, 질문이나 일반 정보는 더 넓은 범위에서 보는 편이 낫습니다.

그래서 `LOCAL / GLOBAL`을 단순 UI 필터가 아니라 운영 경계로 봤습니다. 이 경계는 피드, 검색, 작성 정책, 노출 정책에 영향을 줍니다.

### Q3. 백엔드 개발자 포트폴리오로서 가장 강한 지점은 무엇인가요?

기능을 많이 만든 것보다, 기능이 운영 가능한 형태로 묶여 있다는 점입니다.

- 서비스 레이어에서 정책을 집행합니다.
- query 모듈로 read model을 분리했습니다.
- API route 48개의 contract inventory를 남겼습니다.
- 신고/제재/감사 로그/health/운영 스크립트를 포함했습니다.
- production health evidence를 최신 산출물로 유지합니다.

### Q4. Next.js 프로젝트인데 백엔드 역량을 어떻게 보여주나요?

Next.js App Router를 프론트엔드 프레임워크로만 쓰지 않았습니다.

- route handler는 API boundary로 사용했습니다.
- Prisma는 data layer로 사용했습니다.
- Zod는 외부 입력 계약으로 사용했습니다.
- service는 write orchestration과 정책 집행을 담당합니다.
- query는 read-only read model을 담당합니다.

Spring/Django 관점으로 보면 controller, request validation, service, repository/read model, admin/ops surface를 한 프로젝트 안에서 나눠 구현한 것에 가깝습니다.

### Q5. 정책을 UI가 아니라 service에 둔 이유는 무엇인가요?

UI 체크는 우회될 수 있습니다. 특히 게스트 작성, 신고, 댓글, 업로드, 관리자 조치 같은 흐름은 악용 가능성이 있습니다.

그래서 권한, rate limit, sanction, audit log, notification trigger 같은 것은 service layer에서 처리합니다. UI는 상태를 보여주고 입력을 받지만, 최종 정책 판단은 서버에서 합니다.

### Q6. 게스트 기능을 열어두면 악용 위험이 크지 않나요?

맞습니다. 그래서 게스트 기능은 product feature이면서 abuse surface로 봤습니다.

TownPet는 게스트 식별, step-up, rate limit, guest safety service, moderation visibility rule을 분리했습니다. 게스트도 읽고 쓸 수 있지만, 신고/제재/자동 숨김/운영 확인 흐름과 연결되도록 설계했습니다.

### Q7. 검색은 어떤 점을 신경 썼나요?

검색은 단순 keyword matching으로 끝내지 않았습니다.

- 제목/내용 기준 선택
- 피드 필터와 검색 조건 조합
- 검색 suggestion
- zero-result 분석
- legacy URL 수렴
- 검색 품질을 보는 admin/ops surface

사용자 경험과 운영 개선 루프를 같이 본 것이 핵심입니다.

### Q8. 테스트 전략은 어떻게 나눴나요?

모든 검증을 한 CI hot path에 몰아넣지 않았습니다.

- Vitest: service, query, route, validation, script 회귀
- Playwright: 브라우저 상호작용이 중요한 hot path
- `quality:check`: lint, typecheck, unit, build
- browser smoke: on-demand
- production evidence: 배포 후 health smoke

1인 운영 프로젝트라서 검증은 유지하되, 매번 돌리는 경로는 작게 유지했습니다.

### Q9. 현재 검증 수치를 말해보면?

최신 기준으로 `quality:check`는 ESLint, TypeScript, Vitest 248 files / 1198 tests, Next production build까지 통과했습니다.

API contract는 48 route handler를 커버하고, missing method export 0건, `validation=none` 0건, `monitoring=none` 0건입니다. production health는 `https://townpet.vercel.app/api/health` 기준 200 / `ok`로 기록했습니다.

### Q10. API route contract report는 왜 만들었나요?

route가 많아지면 “어떤 API가 있고, 어떤 보안/검증/관측 상태인지”를 감으로 관리하게 됩니다.

그래서 route handler별로 method, access, validation, monitoring, adjacent test 상태를 생성 산출물로 남겼습니다. 이 문서는 코드 리뷰와 면접 설명 모두에서 API surface를 빠르게 보여주는 역할을 합니다.

### Q11. post query를 왜 나눴나요?

post query는 feed, detail, personalization, widget 조회가 한 파일에 계속 쌓이기 쉬운 영역이었습니다.

public facade는 유지하면서 내부를 아래로 나눴습니다.

- list
- personalization
- detail widget

이렇게 하면 호출부를 크게 흔들지 않고도 수정 범위를 줄이고, 테스트와 코드 리뷰 단위를 더 작게 만들 수 있습니다.

### Q12. post create flow 리팩터링은 왜 했나요?

글 작성은 단순 insert가 아니라 게시판 type별 structured payload, 권한, transaction, moderation 정책이 만나는 경로입니다.

그래서 variant별 helper로 분리했습니다. 목적은 추상화를 늘리는 것이 아니라, 고위험 write path의 분기 책임을 줄이고 회귀 위험을 낮추는 것입니다.

### Q13. 운영 기능 중 가장 보여주고 싶은 것은 무엇인가요?

`/admin/ops`와 API/production evidence입니다.

관리자 화면은 이 프로젝트가 사용자 화면만 만든 것이 아니라, 실제 운영자가 상태를 보고 판단할 수 있게 설계됐다는 증거입니다. production evidence는 배포된 URL 기준으로 health가 정상인지 기록합니다.

### Q14. 과설계였던 부분은 어떻게 줄였나요?

초기에는 browser smoke, coverage, maintenance rehearsal, security preflight를 여러 경로에 붙이려는 경향이 있었습니다.

이후 1인 운영 기준으로 나눴습니다.

- PR hot path는 `quality:check` 중심으로 작게 유지
- browser smoke는 on-demand
- deploy build는 deploy-essential only
- post-deploy는 작은 health evidence 중심

검증을 없앤 것이 아니라 위치를 조정한 것입니다.

### Q15. 이 프로젝트의 가장 큰 tradeoff는 무엇인가요?

기능 범위가 넓어서 모든 영역이 같은 깊이는 아닙니다.

그래서 최근에는 범위를 더 넓히기보다 API contract, test gap, production evidence, 대형 모듈 분리처럼 “이미 만든 기능을 믿을 수 있게 만드는 작업”에 집중했습니다. Sentry 같은 외부 관측은 선택사항으로 두고, health/log/script 기반 운영 증거를 우선했습니다.

### Q16. 장애가 났을 때 어떻게 볼 수 있나요?

먼저 public health와 internal diagnostics를 분리해서 봅니다. 그 다음 운영 문서와 스크립트를 따라 확인합니다.

주요 진입점:

- `/api/health`
- `ops:check:health`
- security env preflight
- latency snapshot
- notification retry
- cleanup/repair dry-run

운영 문서는 `business/operations`에 있고, 최신 증거는 `business/reports`에 둡니다.

### Q17. AI agent를 어떻게 활용했나요?

단순 코드 생성기로 쓰지 않았습니다.

작업을 계획, 구현, 테스트, 문서화, 운영 증거 갱신 단위로 나누고, 각 사이클을 `PLAN.md`, `PROGRESS.md`, `COMPLETED.md`에 남겼습니다. AI가 변경한 코드도 quality gate와 문서 동기화를 통과해야 완료로 봤습니다.

### Q18. 지금 다시 만든다면 무엇을 다르게 하겠나요?

처음부터 API contract inventory와 module boundary를 더 일찍 만들었을 것입니다.

기능이 어느 정도 쌓인 뒤에 route surface와 대형 query/service를 정리하면 비용이 커집니다. 다음 프로젝트에서는 API contract, service/query boundary, 운영 evidence를 더 초기에 기본값으로 둘 것 같습니다.

### Q19. 이 프로젝트에서 백엔드 채용 담당자가 봐야 할 파일은?

먼저 README를 보고, 그 다음 아래 파일을 보면 됩니다.

- [backend-portfolio-case-study.md](../business/reports/backend-portfolio-case-study.md)
- [api-route-inventory.md](../business/reports/api-route-inventory.md)
- [api-route-contracts.generated.md](../business/reports/api-route-contracts.generated.md)
- [app/src/server/services/posts/post.service.ts](../app/src/server/services/posts/post.service.ts)
- [app/src/server/services/moderation/report.service.ts](../app/src/server/services/moderation/report.service.ts)
- [app/src/server/queries/posts/post.queries.ts](../app/src/server/queries/posts/post.queries.ts)
- [app/scripts/check-api-route-contracts.ts](../app/scripts/check-api-route-contracts.ts)

### Q20. 30초 자기소개 버전은?

> TownPet는 반려 생활 정보를 지역과 상황 맥락으로 탐색하는 커뮤니티입니다. 저는 이 프로젝트에서 Next.js App Router를 API boundary로 쓰고, Prisma/Zod/service/query 계층을 나눠 피드, 검색, 작성, 댓글, 알림, 신고, 제재, 관리자 운영까지 구현했습니다. 특히 최근에는 API route 48개 contract, production health evidence, 1198개 Vitest가 포함된 quality gate, post query/create 리팩터링까지 정리해서 기능이 많은 프로젝트가 아니라 검증 가능한 백엔드 포트폴리오로 만드는 데 집중했습니다.

## 답변할 때 피해야 할 말

- “그냥 커뮤니티 사이트입니다.”
- “Next.js로 풀스택 만들었습니다.”
- “AI로 빠르게 만들었습니다.”
- “테스트도 조금 있습니다.”

이렇게 말하면 프로젝트의 깊이가 사라집니다.

대신 아래처럼 말합니다.

- “LOCAL / GLOBAL을 운영 경계로 봤습니다.”
- “정책은 UI가 아니라 service layer에서 집행합니다.”
- “API route 48개를 contract report로 관리합니다.”
- “배포 후 production health evidence를 남깁니다.”
- “1인 운영 기준으로 hot path와 on-demand 검증을 나눴습니다.”

## 마지막 체크리스트

면접 전에 아래만 확인하면 됩니다.

1. README의 최신 검증 수치가 현재와 맞는가
2. production health evidence가 너무 오래되지 않았는가
3. 데모 사이트 `/feed/guest`, `/feed`, `/admin/ops`가 열리는가
4. API contract report에서 `validation=none`, `monitoring=none`이 다시 생기지 않았는가
5. `quality:check` 최신 결과를 말할 수 있는가
