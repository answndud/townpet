# 제출 체크리스트

## 1. 제출 전 채울 값

- `[이름]`
- `[GitHub URL]`
- `[이메일]`
- `[연락처]`
- GitHub repository description
- Demo URL 접속 여부

## 2. 제출 링크 순서

1. GitHub repository
2. Demo: `https://townpet.vercel.app`
3. README
4. Backend case study: `business/reports/backend-portfolio-case-study.md`
5. Backend sequence diagrams: `business/reports/backend-sequence-diagrams.md`
6. API route inventory: `business/reports/api-route-inventory.md`
7. Production evidence: `business/reports/production-evidence-latest.md`

## 3. 지원서 핵심 문장

반드시 들어가야 할 문장:

> 저는 AI를 사용해 코드를 빠르게 쓰는 사람보다, AI와 함께 문제를 쪼개고 결과를 검증하며 운영 가능한 형태까지 닫는 엔지니어입니다.

대체 문장:

> TownPet은 단순 게시판이 아니라 인증, guest safety, 신고/제재, 검색 품질, 알림, 배포 preflight, production evidence까지 포함한 서비스형 백엔드 포트폴리오입니다.

## 4. 금지 표현

- AI가 거의 다 만들어줬습니다.
- 아직 사용자는 별로 없습니다.
- MSA/Kafka도 고려했습니다.
- 테스트를 많이 했습니다.
- 반려동물 커뮤니티 앱입니다.

위 표현은 아래처럼 바꾼다.

| 약한 표현 | 강한 표현 |
|---|---|
| AI가 거의 다 만들어줬습니다 | AI agent와 함께 구현했지만, 문제 정의와 검증 책임은 제가 맡았습니다 |
| 아직 사용자는 별로 없습니다 | 대규모 트래픽 대신 실제 배포, health, e2e, 운영 루틴을 갖췄습니다 |
| MSA/Kafka도 고려했습니다 | 현재 규모에서는 모놀리식이 맞다고 판단했고, route/service/query/DB 경계를 분리했습니다 |
| 테스트를 많이 했습니다 | 기능 위험도에 따라 unit/API/e2e/quality gate/production smoke를 선택했습니다 |
| 반려동물 커뮤니티 앱입니다 | 지역/상황별 반려 정보 탐색 문제를 구조화한 운영형 커뮤니티 백엔드입니다 |

## 5. 제출 전 10분 리허설

1. 30초 자기소개를 읽는다.
2. 3분 프로젝트 설명을 읽는다.
3. Vercel preflight 사례를 말한다.
4. 분실/목격 hot path 사례를 말한다.
5. "AI가 대부분 만든 것 아닌가요?" 답변을 말한다.

## 6. 마지막 점검

- README 링크가 깨지지 않는가
- Demo site가 열리는가
- 지원서에 없는 경험을 과장하지 않았는가
- AI 활용을 "생성"이 아니라 "검증 가능한 개발 루프"로 설명했는가
- TownPet을 단순 앱이 아니라 문제 해결/운영 포트폴리오로 설명했는가

