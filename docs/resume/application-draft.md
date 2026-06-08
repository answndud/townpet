# 지원서 초안

이 문서는 Sionic AI Native Engineer Fellowship 제출폼에 맞춘 원문 초안이다. 실제 제출 전 `[이름]`, `[GitHub URL]`, `[이메일]`만 채우고 글자 수 제한에 맞게 줄인다.

## 1. 제출용 자기소개

안녕하세요. 저는 정해진 커리큘럼보다 실제 문제를 직접 정의하고, AI agent와 함께 동작하는 결과물까지 만들어 보며 성장해 온 [이름]입니다.

대표 프로젝트로 TownPet을 만들었습니다. TownPet은 지역과 상황별 반려 정보를 빠르게 찾고 공유하는 동네 반려생활 정보 커뮤니티입니다. 겉으로는 커뮤니티 서비스처럼 보이지만, 내부적으로는 `LOCAL/GLOBAL` 피드 정책, 구조화 게시판, 비회원 작성 안전장치, 신고/제재, 검색 품질, 알림, 배포 preflight, production evidence까지 포함한 서비스형 백엔드 포트폴리오입니다.

저는 이 프로젝트에서 AI를 단순 코드 자동완성 도구로 사용하지 않았습니다. 문제를 작게 쪼개고, AI agent와 함께 구현한 뒤, targeted test, Playwright e2e, `typecheck`, `lint`, `quality:check`, 문서 동기화, Vercel 배포 결과로 검증했습니다. AI가 만든 결과물도 최종 품질은 제가 책임진다는 기준으로 작업했습니다.

## 2. 제출용 지원 이유

사이오닉 AI Native Engineer Fellowship에 지원하는 이유는, 이 전형이 제가 성장해 온 방식과 가장 직접적으로 맞닿아 있기 때문입니다.

저는 학력이나 자격증보다 실제 문제를 얼마나 집요하게 해결했는지가 엔지니어의 실력을 더 잘 보여준다고 생각합니다. TownPet을 만들 때도 "게시판을 만든다"에서 멈추지 않고, 반려 정보가 병원 후기, 입양, 산책, 거래, 분실/목격처럼 서로 다른 맥락을 갖는다는 문제에서 출발했습니다. 그래서 `LOCAL/GLOBAL` 피드, 구조화 게시판, guest safety, 신고/제재, 검색 품질, 운영 체크까지 제품과 백엔드 요구사항을 함께 설계했습니다.

공고에서 특히 공감한 부분은 AI를 체험 도구가 아니라 업무 방식 자체로 내재화한 사람을 찾는다는 점이었습니다. 저는 AI를 통해 속도만 높이는 것보다, AI가 놓칠 수 있는 부분을 검증 루프로 보완하는 데 집중해 왔습니다. 실제로 Vercel 배포 실패가 반복됐을 때도 임시로 env만 고치는 대신, build preflight와 운영자용 strict check의 책임이 섞여 있던 구조를 분리해 이후 다른 작업에서도 같은 문제가 반복되지 않게 했습니다.

Fellowship에서는 실제 고객 문제를 더 큰 스케일로 다루며, AI와 함께 문제를 더 빠르게 쪼개고 더 엄밀하게 검증하는 엔지니어로 기여하고 싶습니다.

## 3. AI 활용 경험

제가 AI를 사용하는 방식은 "질문하고 답을 받는 것"보다 "개발 루프를 함께 운용하는 것"에 가깝습니다.

TownPet에서는 작업을 시작할 때 먼저 목표와 완료 기준을 정하고, AI agent와 함께 구현 범위를 좁혔습니다. 구현 이후에는 결과를 바로 신뢰하지 않고, 변경 범위에 따라 service/query test, API route test, Playwright e2e, `typecheck`, `lint`, `quality:check`, docs freshness check, Vercel deployment check를 실행했습니다. 완료한 작업은 `docs/DONE.md`에 남겨 다음 세션에서도 맥락이 이어지게 했습니다.

가장 대표적인 사례는 Vercel 배포 실패 재발 방지입니다. 배포가 `security env preflight failed`로 반복 실패했을 때, 처음에는 단순 환경변수 누락처럼 보였습니다. 하지만 로그와 스크립트를 따라가 보니 build 단계에서 production 필수 env 체크와 원격 `/api/health` control-plane 진단이 섞여 있었습니다. 이 구조에서는 실제 필수 secret이 있어도 원격 health drift 때문에 unrelated 변경 후 배포가 다시 실패할 수 있었습니다.

저는 AI agent와 함께 `vercel-build.ts`, `check-security-env.ts`, package script를 추적했고, `check-security-env`를 `build` profile과 `full/strict` profile로 분리했습니다. 이후 Vercel build는 필수 env만 빠르게 확인하고, 원격 운영 상태 점검은 운영자용 strict check로 따로 실행하게 했습니다. 또 실패 로그에 실제 `[FAIL]` key가 나오도록 바꿔 다음 문제 분석 비용을 줄였습니다. 이 변경은 targeted Vitest, lint, typecheck, placeholder env 재현, 실제 Vercel 재배포 성공으로 검증했습니다.

이 경험을 통해 AI 활용의 핵심은 "더 빨리 코드를 쓰는 것"이 아니라, 문제를 더 작게 나누고 검증 가능한 형태로 만들며 결과를 끝까지 책임지는 것이라고 생각하게 됐습니다.

## 4. 포트폴리오 설명

TownPet은 지역과 상황별 반려 정보를 빠르게 찾고 공유하는 서비스입니다.

핵심 백엔드/운영 요소:
- `LOCAL/GLOBAL` 정책이 분리된 피드와 검색
- 병원 후기, 입양, 산책, 거래, 분실/목격 등 구조화 게시판
- Kakao/Naver/Credentials 인증과 세션/권한 제어
- 비회원 작성, guest step-up, rate-limit, guest safety
- 신고, 차단, 제재, 직접 모더레이션, 관리자 감사 로그
- 검색 자동완성, zero-result 분석, `/admin/ops` 운영 대시보드
- notification outbox retry, maintenance guard, production health evidence
- API route inventory, generated contract report, Mermaid sequence diagrams

기술 스택:
- Next.js App Router, React 19, TypeScript
- Prisma + PostgreSQL
- Zod, NextAuth v5
- Upstash Redis
- Vitest, Playwright
- Vercel

추천 확인 순서:
1. GitHub repository: `[GitHub URL]`
2. Demo: `https://townpet.vercel.app`
3. README
4. `business/reports/backend-portfolio-case-study.md`
5. `business/reports/backend-sequence-diagrams.md`
6. `business/reports/api-route-inventory.md`
7. `business/reports/production-evidence-latest.md`

## 5. 짧은 제출 버전

안녕하세요. 저는 AI agent와 함께 실제 동작하는 제품을 만들고, 테스트/문서/배포/운영까지 끝까지 책임지는 방식으로 성장해 온 [이름]입니다.

대표 프로젝트로 TownPet이라는 지역 기반 반려생활 정보 커뮤니티를 만들었습니다. 이 프로젝트는 단순 게시판이 아니라 `LOCAL/GLOBAL` 피드 정책, 구조화 게시판, 비회원 작성 안전장치, 신고/제재, 검색 품질, 알림, 배포 preflight, production evidence까지 포함한 서비스형 백엔드 포트폴리오입니다.

AI는 코드 자동완성 도구가 아니라 문제 분해, 구현, 검증, 문서화, 운영 개선을 함께 수행하는 협업자로 사용했습니다. 예를 들어 Vercel 배포 실패가 반복됐을 때 build preflight와 운영자용 strict check의 책임이 섞여 있던 구조를 분리하고, 테스트와 실제 재배포로 검증했습니다. 분실/목격 기능도 랜딩, 작성, 공유, 전단 저장, 목격 댓글, privacy, 모바일 e2e까지 사용자 여정 단위로 완성했습니다.

사이오닉의 AI Native Engineer Fellowship이 학력보다 실제 문제 해결력, 실행력, AI 활용력, 최종 품질 책임을 본다는 점에서 제 작업 방식과 잘 맞는다고 느꼈습니다. Fellowship에서 실제 고객 문제를 더 큰 스케일로 다루며, AI와 함께 더 높은 수준의 문제를 해결하는 엔지니어로 성장하고 싶습니다.

## 6. 아주 짧은 소개 문장

> AI agent와 함께 TownPet이라는 지역 반려생활 정보 서비스를 만들며, 문제 정의부터 백엔드 정책, 테스트, 배포 실패 재발 방지, 운영 문서까지 닫아 본 지원자입니다.

## 7. 포트폴리오 링크 안내 문장

```text
포트폴리오는 TownPet 하나를 깊게 보시는 것을 추천드립니다. README에서 제품과 기술 개요를 확인한 뒤, `business/reports/backend-portfolio-case-study.md`와 `business/reports/backend-sequence-diagrams.md`를 보면 제가 문제를 어떻게 구조화하고 백엔드 책임 경계를 어떻게 나눴는지 빠르게 보실 수 있습니다.
```

