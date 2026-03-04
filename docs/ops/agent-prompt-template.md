# Agent Prompt Template (TownPet)

작성일: 2026-03-04  
목적: 에이전트 지시문을 표준화해 도구 선택 드리프트와 정책 누락을 줄인다.

## 1) 공통 헤더 (항상 포함)
```text
[Context]
- Keep existing stack by default.
- Respect TownPet invariants: Local/Global separation, high-risk policy-first, report auto-hide + auditability.
- Follow implementation order for behavior/policy changes: Prisma -> Zod -> Service -> Action/Route -> UI -> Tests.
- Do not introduce unverified DIY in auth/report/sanction/rate-limit flows.
```

## 2) 작업 요청 템플릿
```text
[Task]
목표:
비목표:
범위(파일/레이어):
정책 영향(Local/Global, 신고/제재, 신규유저 제한):
데이터 영향(스키마/마이그레이션 여부):
위험도(낮음/중간/높음):
완료 기준(동작 + 검증 명령):
```

## 3) 에이전트 출력 계약
```text
[Expected Output]
1) 변경 요약 (무엇/왜)
2) 변경 파일 목록
3) 정책 체크 결과
4) 실패 경로 테스트(최소 1개) 결과
5) 운영 영향(배포/모니터링/롤백)
6) 남은 리스크
```

## 4) 사전 체크리스트
요청 전에 아래를 먼저 채운다.
- 기존 스택으로 해결 가능한가?
- Local/Global 경계를 깨지 않는가?
- 고위험 정책(auth/report/sanction/rate-limit)에 영향이 있는가?
- 캐시/실시간/관측 도구를 새로 도입하는가?
- 실패 경로 테스트를 정의했는가?

## 5) 금지 프롬프트 패턴
- "최신 트렌드니까 ORM 교체"
- "테스트는 생략하고 빠르게 반영"
- "정책 영향은 나중에 확인"
- "고위험 경로를 우선 DIY로 구현"

## 6) 권장 프롬프트 예시

### 6.1 정책/서버 변경
```text
[Context]
- Keep existing stack by default.
- Respect TownPet invariants: Local/Global separation, high-risk policy-first.
- Follow Prisma -> Zod -> Service -> Action/Route -> UI -> Tests.

[Task]
목표: 게시글 신고 처리에서 auto-hide(HIDDEN) 조건을 정책 서비스로 통합
비목표: UI 리디자인
범위: prisma/schema, validations, report service, api route, tests
정책 영향: 신고/제재 + 감사 추적 필수
데이터 영향: 없음
위험도: 높음
완료 기준: lint/typecheck + 관련 테스트 통과, 실패 경로 1개 포함
```

### 6.2 성능/캐시 변경
```text
[Context]
- Keep existing stack by default.
- Cache changes must define invalidation strategy first.

[Task]
목표: guest feed 조회 p95 완화
비목표: ORM/인증 스택 변경
범위: query-cache, feed route headers, tests
정책 영향: Local/Global 분리 유지
데이터 영향: 없음
위험도: 중간
완료 기준: 캐시 무효화 규칙 문서화 + 회귀 테스트 통과
```

### 6.3 운영 문서 변경
```text
[Task]
목표: 신규 운영 규칙을 PLAN/PROGRESS와 docs/ops에 동기화
비목표: 앱 동작 변경
범위: PLAN.md, PROGRESS.md, docs/ops/*.md
위험도: 낮음
완료 기준: 문서 간 상태/링크 불일치 없음
```

## 7) CLI 자동 생성기
- 실행: `pnpm -C app agent:prompt --goal "<goal>"`
- 파일 출력: `pnpm -C app agent:prompt --goal "<goal>" --out /tmp/agent-prompt.txt`
- 정책 작업 예시:
  - `pnpm -C app agent:prompt --mode policy --goal "Unify report auto-hide policy" --scope "prisma,zod,service,api,tests" --policy-impact "report/sanction path"`

## 8) plan-coordinator 연계 순서
1. `pnpm -C app agent:prompt ... --out /tmp/agent-task.txt`로 작업 프롬프트 생성
2. `@plan-coordinator`에 목표/완료기준을 먼저 등록하고 `PLAN.md` 상태를 `in_progress`로 전환
3. 생성된 프롬프트를 `@delivery-engineer` 또는 `@growth-operator`에 전달해 실행
4. `@safety-verifier` 검증 결과를 `@plan-coordinator`가 `PROGRESS.md`에 기록하고 `PLAN.md` 상태를 갱신
