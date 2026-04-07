# 24. 데모/문서/면접 패키지로 프로젝트를 마감하기

## 이번 글에서 풀 문제

프로젝트가 어느 정도 완성되면 새로운 문제가 생깁니다.

- 이걸 5분 안에 어떻게 보여줄 것인가
- README, 문서, 데모 사이트, 관리자 화면 중 무엇을 먼저 보여줄 것인가
- 면접관이나 리뷰어가 “깊이 있는 프로젝트”로 받아들이게 하려면 무엇을 묶어 설명해야 하는가

TownPet는 이 질문에 답하기 위해 코드 외의 자산도 꽤 많이 정리했습니다.

이 글은 TownPet를 **데모 가능한 제품**, **읽을 수 있는 문서**, **설명 가능한 면접 패키지**로 묶는 방법을 설명합니다.

## 왜 이 글이 중요한가

좋은 프로젝트는 코드만 좋다고 끝나지 않습니다.

- 데모가 가능해야 하고
- README가 첫인상을 만들어야 하고
- 문서가 깊이를 증명해야 하고
- 면접에서 서사가 정리돼 있어야 합니다.

TownPet는 이 포인트를 꽤 의식적으로 정리한 프로젝트입니다.

## 먼저 볼 문서와 파일

- [README.md](/Users/alex/project/townpet/README.md)
- [docs/개발_운영_가이드.md](/Users/alex/project/townpet/docs/%EA%B0%9C%EB%B0%9C_%EC%9A%B4%EC%98%81_%EA%B0%80%EC%9D%B4%EB%93%9C.md)
- [PLAN.md](/Users/alex/project/townpet/PLAN.md)
- [PROGRESS.md](/Users/alex/project/townpet/PROGRESS.md)
- [docs/security/보안_계획.md](/Users/alex/project/townpet/docs/security/%EB%B3%B4%EC%95%88_%EA%B3%84%ED%9A%8D.md)
- [docs/security/보안_진행상황.md](/Users/alex/project/townpet/docs/security/%EB%B3%B4%EC%95%88_%EC%A7%84%ED%96%89%EC%83%81%ED%99%A9.md)
- [app/src/app/admin/ops/page.tsx](/Users/alex/project/townpet/app/src/app/admin/ops/page.tsx)
- [app/src/server/demo-content-seeding.ts](/Users/alex/project/townpet/app/src/server/demo-content-seeding.ts)
- [blog/README.md](/Users/alex/project/townpet/blog/README.md)

## 먼저 알아둘 개념

### 1. TownPet는 “코드”만이 아니라 “운영 가능한 데모”까지 제품이다

TownPet는 README, 배포 사이트, 관리자 대시보드, health endpoint, demo content seed까지 같이 갖고 있습니다.

즉 포트폴리오를 보여줄 때:

- GitHub 코드
- 문서
- 라이브 데모

를 따로따로 보여주는 것이 아니라, 하나의 패키지처럼 보여줄 수 있습니다.

### 2. 데모는 기능 수보다 서사가 중요하다

면접이나 리뷰 상황에서는 모든 기능을 다 보여줄 수 없습니다.

그래서 TownPet는 보통 아래 서사로 보여주는 편이 가장 강합니다.

1. 문제 정의
2. 핵심 제품 화면
3. 검색/운영/모더레이션 같은 깊이
4. AI-native 개발 방식

## 1. README가 왜 첫 번째 패키지인가

[README.md](/Users/alex/project/townpet/README.md)는 TownPet를 처음 여는 사람이 가장 먼저 보는 문서입니다.

여기서 하는 일:

- 제품 한 줄 소개
- 문제 정의
- 비즈니스 아이디어
- 대표 화면
- 제품 설계 포인트
- 기술 스택
- AI-native 개발 방식

즉 README는 설치 가이드보다 먼저 **“이 프로젝트가 무엇을 보여주는가”**를 설명하는 랜딩 페이지 역할을 합니다.

TownPet README가 중요한 이유는,  
면접관이 코드를 보기도 전에 이 프로젝트를 어떤 프레임으로 해석할지 정해주기 때문입니다.

## 2. 라이브 데모는 무엇을 보여줘야 하는가

TownPet는 배포 사이트가 있습니다.

- [데모 사이트](https://townpet.vercel.app)

이 데모는 단순 빈 화면이 아니라, 샘플 콘텐츠가 들어간 상태로 운영됩니다.

관련 코드:

- [app/src/server/demo-content-seeding.ts](/Users/alex/project/townpet/app/src/server/demo-content-seeding.ts)

즉 TownPet는 README 스크린샷과 실제 배포 화면이 어느 정도 일치하도록 관리합니다.

### 5분 데모 추천 순서

1. `/feed`
   - 피드, 정렬, 보드 태그, 리스트 스캔
2. `/search`
   - 구조화 검색, 자동완성, fallback
3. `/boards/adoption`
   - 구조화 게시판 카드형 경험
4. 글 상세
   - 댓글/반응/구조화 메타
5. `/admin/ops`
   - 운영 가능한 서비스라는 증거

이 순서가 좋은 이유는:

- 사용자 제품 경험
- 검색 품질
- 구조화 보드
- 운영 깊이

를 가장 짧은 시간 안에 다 보여주기 때문입니다.

## 3. 문서는 어떻게 깊이를 증명하는가

TownPet는 문서가 많습니다.  
하지만 면접에서는 모두 보여줄 필요가 없습니다.

핵심만 보면 됩니다.

### 1) [PLAN.md](/Users/alex/project/townpet/PLAN.md)

- 어떤 문제를 어떤 사이클로 해결했는지
- 작업을 어떻게 쪼갰는지

### 2) [PROGRESS.md](/Users/alex/project/townpet/PROGRESS.md)

- 실제로 무엇을 바꿨는지
- 어떤 검증을 돌렸는지

### 3) 보안 문서

- [보안 계획](/Users/alex/project/townpet/docs/security/%EB%B3%B4%EC%95%88_%EA%B3%84%ED%9A%8D.md)
- [보안 진행상황](/Users/alex/project/townpet/docs/security/%EB%B3%B4%EC%95%88_%EC%A7%84%ED%96%89%EC%83%81%ED%99%A9.md)

이 문서들은 “기능만 만들었다”가 아니라  
운영/보안까지 같이 밀었다는 증거가 됩니다.

### 4) [docs/개발_운영_가이드.md](/Users/alex/project/townpet/docs/%EA%B0%9C%EB%B0%9C_%EC%9A%B4%EC%98%81_%EA%B0%80%EC%9D%B4%EB%93%9C.md)

- 로컬 복구
- 시드
- health check
- 운영 명령

즉 “실제 돌아가는 프로젝트”라는 증거가 됩니다.

## 4. 관리자 화면은 왜 면접용으로 강한가

대부분의 개인 프로젝트는 사용자 화면만 보여줍니다.

TownPet는 다릅니다.

- `/admin`
- `/admin/ops`
- `/admin/reports`
- `/admin/auth-audits`
- `/admin/moderation-logs`

같은 운영 surface가 있습니다.

이게 중요한 이유:

1. 단순 CRUD 앱이 아니라는 점을 보여줍니다.
2. 운영과 품질을 생각한 프로젝트라는 인상을 줍니다.
3. 검색 telemetry, 신고 적체, auth 실패 같은 실제 운영 관점을 설명할 수 있습니다.

즉 면접에서 TownPet를 설명할 때 관리자 화면은 “깊이”를 증명하는 매우 좋은 도구입니다.

## 5. 블로그 시리즈는 어떤 역할을 하는가

이 `blog/` 폴더는 README와는 역할이 다릅니다.

- README: 첫인상
- 블로그 시리즈: 깊이 있는 해설

예를 들어:

- [02-how-townpet-is-structured.md](/Users/alex/project/townpet/blog/02-how-townpet-is-structured.md)
- [09-search-structured-search-and-suggestions.md](/Users/alex/project/townpet/blog/09-search-structured-search-and-suggestions.md)
- [14-report-block-sanction-direct-moderation.md](/Users/alex/project/townpet/blog/14-report-block-sanction-direct-moderation.md)
- [19-testing-and-quality-gate.md](/Users/alex/project/townpet/blog/19-testing-and-quality-gate.md)

이런 글들은 “어디서부터 읽어야 하는가”까지 설명해주기 때문에,  
리뷰어나 면접관이 저장소를 더 쉽게 파고들 수 있게 만듭니다.

## 6. 면접에서는 무엇을 먼저 말해야 하는가

TownPet를 설명할 때 가장 좋은 순서는 보통 이렇습니다.

### 1단계. 문제 정의

“반려 정보는 맥락이 강한데 기존 채널에서는 섞여 있어서 탐색 비용이 크다.”

### 2단계. 제품 구조

“그래서 `지역 + 상황` 구조로 나눴고, 자유글보다 구조화 보드와 검색을 더 강하게 설계했다.”

### 3단계. 운영 구조

“신고, 차단, 제재, `/admin/ops`, health/cleanup workflow까지 같이 만들었다.”

### 4단계. 개발 방식

“AI agent를 코드 생성기가 아니라 계획-구현-검증-운영 기록을 잇는 시스템으로 사용했다.”

이 순서는 TownPet의 강점을 가장 짧게 압축해 줍니다.

## 7. 면접에서 바로 보여줄 코드 파일은 무엇인가

화면만 보여주고 끝내면 얕아 보일 수 있습니다.  
그래서 TownPet는 몇 개의 “대표 코드 파일”을 준비해 두면 좋습니다.

### 제품 구조

- [app/src/app/feed/page.tsx](/Users/alex/project/townpet/app/src/app/feed/page.tsx)
- [app/src/server/queries/post.queries.ts](/Users/alex/project/townpet/app/src/server/queries/post.queries.ts)

### 쓰기 정책

- [app/src/server/services/post.service.ts](/Users/alex/project/townpet/app/src/server/services/post.service.ts)
- [app/src/lib/validations/post.ts](/Users/alex/project/townpet/app/src/lib/validations/post.ts)

### 운영/모더레이션

- [app/src/server/services/report.service.ts](/Users/alex/project/townpet/app/src/server/services/report.service.ts)
- [app/src/app/admin/ops/page.tsx](/Users/alex/project/townpet/app/src/app/admin/ops/page.tsx)

### 품질/운영

- [.github/workflows/quality-gate.yml](/Users/alex/project/townpet/.github/workflows/quality-gate.yml)
- [app/src/app/api/health/route.ts](/Users/alex/project/townpet/app/src/app/api/health/route.ts)

이 파일들만 잘 설명해도 TownPet의 깊이를 꽤 잘 보여줄 수 있습니다.

## 8. TownPet 패키지를 한 문장으로 요약하면

TownPet는 단순히 “기능이 많은 개인 프로젝트”가 아닙니다.

> README, 라이브 데모, 관리자 화면, 운영 문서, 보안 문서, 블로그 해설까지 같이 갖춘 제품형 포트폴리오 패키지

라고 보는 편이 더 정확합니다.

## 테스트는 어떻게 읽어야 하는가

이 글 자체는 데모/문서 패키지 글이라 test 파일 하나보다 아래 묶음을 같이 보는 것이 좋습니다.

- [README.md](/Users/alex/project/townpet/README.md)
- [PLAN.md](/Users/alex/project/townpet/PLAN.md)
- [PROGRESS.md](/Users/alex/project/townpet/PROGRESS.md)
- [docs/개발_운영_가이드.md](/Users/alex/project/townpet/docs/%EA%B0%9C%EB%B0%9C_%EC%9A%B4%EC%98%81_%EA%B0%80%EC%9D%B4%EB%93%9C.md)
- [blog/README.md](/Users/alex/project/townpet/blog/README.md)

즉 TownPet는 테스트만으로 보여지는 프로젝트가 아니라,  
문서와 데모 패키지가 함께 작동하는 프로젝트로 읽는 편이 맞습니다.

## 현재 구현의 한계

- 데모 콘텐츠는 운영자가 의식적으로 관리해야 합니다.
- README와 블로그 시리즈는 계속 다듬을 수 있습니다.
- 아직 면접 전용 슬라이드나 별도 발표 자료는 없습니다.

## Python/Java 개발자용 요약

- TownPet는 코드만 준비한 프로젝트가 아니라, README, 배포 데모, 운영 대시보드, 문서, 블로그까지 함께 준비된 패키지입니다.
- 그래서 면접이나 코드 리뷰에서 “이 프로젝트가 왜 깊은가”를 설명하기 쉽습니다.
- 기술 구조와 제품 서사를 연결해 보여주기 좋은 형태로 마감된 프로젝트라고 볼 수 있습니다.

## 면접에서 이렇게 설명할 수 있다

> TownPet는 코드만 쌓아둔 저장소가 아니라, README로 첫인상을 만들고, 배포 사이트에서 실제 화면을 보여주고, `/admin/ops`로 운영 깊이를 증명하고, PLAN/PROGRESS와 보안 문서로 구현 과정을 추적할 수 있게 만든 프로젝트입니다. 그래서 데모와 코드 설명, 운영 설명을 하나의 패키지처럼 보여줄 수 있습니다.
