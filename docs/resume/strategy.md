# 지원 전략

## 1. 공고의 실제 평가 기준

공고 문구를 그대로 보면 이 전형은 일반적인 "인턴 채용"이 아니다. 학력/자격증보다 아래 신호를 보겠다는 전형이다.

| 공고 문구 | 실제로 볼 가능성이 높은 질문 | 준비해야 할 증거 |
|---|---|---|
| 문제 해결력 | "스스로 정의한 문제가 무엇인가?" | TownPet 문제 정의: 지역+상황별 반려 정보 탐색 비용 |
| 실행력 | "실제로 돌아가는 결과물이 있는가?" | Demo, Vercel 배포, production health, e2e |
| AI 활용력 | "AI를 어떻게 업무 방식에 넣었는가?" | PLAN/DONE, AGENTS, 반복 검증 루프 |
| 복잡한 요구사항 구조화 | "요구사항을 어떻게 기술 단위로 번역했는가?" | Local/Global, guest safety, report/sanction, sequence diagrams |
| 검증 능력 | "AI 결과물을 어떻게 의심하고 확인했는가?" | targeted tests, quality:check, Playwright, docs freshness, deploy logs |
| 설명/협업 | "다른 사람이 이해할 수 있게 남겼는가?" | README, backend case study, API inventory, sequence diagrams |
| 책임감 | "터진 문제를 끝까지 닫았는가?" | Vercel preflight 재발 방지, lost/found hot path, 운영 루틴 단순화 |

결론: 지원자는 "기술을 많이 아는 사람"보다 "AI를 써서 실제 문제를 제품/운영 수준으로 닫아 본 사람"으로 보여야 한다.

## 2. 한 문장 포지셔닝

제출서와 면접에서 계속 반복할 문장:

> 저는 TownPet을 통해 지역/상황별 반려 정보 문제를 직접 정의하고, AI agent와 함께 요구사항 분해, 백엔드 정책, 테스트, 배포, 운영 문서까지 닫아 본 지원자입니다.

조금 더 공격적인 버전:

> TownPet은 단순 게시판이 아니라 인증, guest safety, 신고/제재, 검색 품질, 알림, 배포 preflight, production evidence까지 포함한 서비스형 백엔드 포트폴리오이며, 저는 AI를 코드 생성기가 아니라 문제 해결 루프의 협업자로 사용했습니다.

## 3. TownPet을 설명하는 프레임

### 약한 설명

> 반려동물 커뮤니티 웹앱을 만들었습니다.

문제:
- 흔한 CRUD 프로젝트처럼 들린다.
- 공고가 원하는 "문제를 직접 부수는 사람" 신호가 약하다.

### 강한 설명

> 반려 정보가 병원 후기, 입양, 산책, 거래, 분실/목격처럼 상황별 맥락이 다른데 한 채널에 뒤섞이는 문제를 해결하기 위해 TownPet을 만들었습니다. 단순 게시판이 아니라 `LOCAL/GLOBAL` 정책, 구조화 게시판, 비회원 작성 안전장치, 신고/제재, 검색 품질, 알림, 배포 preflight, 운영 evidence까지 포함한 서비스형 백엔드 포트폴리오로 확장했습니다.

강한 이유:
- 문제 정의가 있다.
- 제품 판단이 있다.
- 백엔드/운영 책임이 있다.
- AI-native 검증 방식으로 이어질 수 있다.

## 4. 제출서 대표 사례 우선순위

### 1순위: Vercel 배포 실패 재발 방지

왜 강한가:
- 공고의 "끝까지 책임", "AI 한계 대응", "실제로 작동하는 결과"를 가장 직접적으로 보여준다.
- 단순 기능 구현보다 엔지니어링 판단이 드러난다.

STAR:
- Situation: Vercel build가 `security env preflight failed`로 반복 실패했다.
- Task: 임시 env 수정이 아니라 재발하지 않는 구조로 원인을 분리해야 했다.
- Action: `build` profile과 `full/strict` profile을 분리하고, build hot path에서 원격 health drift를 제거했다.
- Result: targeted tests와 실제 Vercel 재배포로 성공 확인, 이후 실패 원인 key가 로그에 드러나도록 개선했다.

면접 핵심:
> 빌드에서 확인해야 할 것은 배포 필수 조건이고, 운영자가 수동으로 확인해야 할 것은 원격 control-plane 상태라고 책임을 나눴습니다.

### 2순위: 분실/목격 hot path

왜 강한가:
- 제품 문제를 사용자 여정으로 쪼갠 증거다.
- UI, API, privacy, e2e, production check가 연결되어 있다.

STAR:
- Situation: 분실/목격은 글 작성보다 빠른 공유와 제보 수집이 중요한 긴급 흐름이다.
- Task: 단순 `LOST_FOUND` 타입이 아니라 랜딩, 작성, 공유, 제보, privacy, 검증을 하나의 흐름으로 만들어야 했다.
- Action: `/lost-found`, `/lost/new`, 구조화 템플릿, 전단 저장, 목격 댓글, 보호자 공개 privacy, 피드/랜딩 댓글 수 동기화, `test:e2e:lost-found`를 구성했다.
- Result: 모바일 e2e와 production acquisition check로 동작을 확인했다.

면접 핵심:
> 기능을 "화면 하나"가 아니라 "사용자가 문제를 해결하는 순서"로 봤습니다.

### 3순위: 백엔드 구조화와 문서화

왜 강한가:
- 멘토 피드백과 공고의 협업/설명 능력에 대응한다.
- "문서화는 부수 업무가 아니다"를 보여준다.

STAR:
- Situation: 기능이 늘어나면서 README만으로는 백엔드 흐름과 책임 경계를 설명하기 어려워졌다.
- Task: 면접/리뷰에서 코드 전체를 열지 않고도 구조를 설명할 수 있어야 했다.
- Action: backend case study, API inventory, generated contract report, Mermaid sequence diagrams를 만들었다.
- Result: route/service/query/DB/ops 경계를 문서로 설명 가능하게 만들었다.

면접 핵심:
> MSA/Kafka를 흉내 내지 않고, 현재 모놀리식 구조 안에서 실제 책임 경계를 정확히 설명했습니다.

## 5. 제출 링크 전략

지원서에는 링크를 많이 넣되, 평가자가 어디부터 볼지 정해줘야 한다.

추천 문장:

```text
포트폴리오는 TownPet 하나를 깊게 보시는 것을 추천드립니다. README에서 제품과 기술 개요를 확인한 뒤, `business/reports/backend-portfolio-case-study.md`와 `business/reports/backend-sequence-diagrams.md`를 보면 제가 문제를 어떻게 구조화하고 백엔드 책임 경계를 어떻게 나눴는지 빠르게 보실 수 있습니다.
```

링크 순서:
1. GitHub repository
2. Demo site
3. README
4. Backend case study
5. Sequence diagrams
6. API inventory
7. Production evidence

## 6. 리스크와 방어 논리

### 리스크 A. 실제 유저/트래픽이 크지 않다

방어:
> 대규모 트래픽을 경험했다고 말할 수는 없습니다. 대신 실제 배포된 서비스에서 production health, acquisition event smoke, e2e, 운영 루틴까지 이어지는 루프를 만들었습니다. 지금 단계에서 제가 보여줄 수 있는 강점은 대규모 운영 경험보다 문제를 운영 가능한 형태로 닫는 실행력입니다.

### 리스크 B. AI가 만든 것처럼 보일 수 있다

방어:
> AI를 많이 쓴 것은 맞습니다. 하지만 문제 정의, 완료 기준, 검증 선택, 배포 판단, 문서 정합성 책임은 제가 맡았습니다. AI 산출물을 바로 믿지 않고 test, typecheck, e2e, docs freshness, Vercel deployment로 확인했습니다.

### 리스크 C. 프로젝트 범위가 넓어 산만해 보일 수 있다

방어:
> 범위가 넓은 것은 맞습니다. 그래서 README와 backend case study에서는 핵심 백엔드 증거를 인증, guest safety, moderation, search, notification, ops로 묶었고, 면접에서는 Vercel preflight와 lost/found hot path 두 사례에 집중해서 설명하겠습니다.

### 리스크 D. MSA/Kafka 경험이 없다

방어:
> 현재 문제 규모에서는 모놀리식이 맞다고 판단했습니다. 대신 route/service/query/DB/ops 경계를 분리했고, sequence diagram으로 메시지 흐름을 설명할 수 있게 정리했습니다. 시스템이 커질 때 어떤 책임을 먼저 분리할지도 설명할 수 있습니다.

## 7. 제출 전 보강하면 좋은 것

우선순위 높은 보강:
1. `application-draft.md`에서 `[이름]`, `[GitHub URL]` 채우기
2. README의 backend sequence diagram 링크 포함 커밋
3. GitHub repository description을 "AI-native backend portfolio for local pet community operations" 계열로 조정
4. Demo site가 정상 접속되는지 확인
5. 면접 전 `interview-playbook.md`의 30초/3분 피치를 소리 내서 3회 연습

우선순위 낮은 보강:
1. resume PDF 만들기
2. PPT 만들기
3. 새 기능 추가
4. MSA/Kafka 문서 추가

새 기능보다 이미 있는 증거를 더 날카롭게 설명하는 것이 더 중요하다.

