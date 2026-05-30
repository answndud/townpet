# PLAN.md

목표: TownPet를 기능/운영/품질/속도 기준에서 실제 유저 획득이 가능한 동네 반려생활 정보 서비스 상태로 유지한다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- 새 작업을 시작할 때는 코드보다 먼저 이 문서에 새 phase를 추가한다.
- 지역을 하나로 제한하지 않는다. `/`과 public acquisition UI에는 사용자가 선택하지 않은 특정 지역명을 기본값처럼 노출하지 않는다.
- 보류 범위: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### 성능 개선 8단계 루프

- 상태: `in_progress`
- 목표: 접속/로딩 체감 성능을 감이 아니라 production 수치로 측정하고, hot path를 90점 이상 수준으로 끌어올린 뒤 개선 전후를 문서화한다.
- 기준 경로:
  - 페이지: `/`, `/login`, `/feed/guest`, 대표 public 게시글 상세
  - API: `/api/home/feed`, `/api/feed/guest`, `/api/health`

#### Phase 1. 성능 기준선 고정
- 상태: `completed`
- 작업:
  - 기존 `perf:baseline`, `perf:browser`, `perf:assets`의 기본 측정 target을 현재 hot path 기준으로 보강한다.
  - production server fetch, browser mobile/desktop LCP, route asset/resource snapshot을 같은 날짜 report로 남긴다.
  - cold/warm outlier, resource count, transfer size, API response를 한 리포트에서 비교 가능하게 정리한다.
- 완료 기준:
  - `docs/reports/performance-*-2026-05-30*.md/json` 산출물이 생성된다.
  - `/`, `/login`, `/feed/guest`, 대표 public 상세, `/api/home/feed`, `/api/feed/guest`, `/api/health`가 측정 대상에 포함된다.

#### Phase 2. Web Vitals 실사용 수집 MVP
- 상태: `completed`
- 작업:
  - 개인정보 없이 LCP, INP, CLS, FCP, TTFB를 route 단위로 수집한다.
  - production p75/p95를 볼 수 있는 read-only query 또는 report를 추가한다.

#### Phase 3. 홈 첫 화면 데이터 표시 개선
- 상태: `completed`
- 작업:
  - `/`의 live board client fetch/skeleton 체감을 줄인다.
  - 필요 시 `/api/home/feed` cache 또는 server-rendered preview 구조를 조정한다.

#### Phase 4. 초기 JS/resource diet
- 상태: `completed`
- 작업:
  - `/login`, `/`, `/feed/guest`의 route resource count와 JS transfer를 줄인다.
  - 불필요한 client boundary와 모든 페이지에 실리는 client code를 점검한다.

#### Phase 5. API outlier 원인 분리
- 상태: `completed`
- 작업:
  - `/api/health`, `/api/home/feed`, `/api/feed/guest`의 cold/warm outlier를 endpoint 내부 단계별 timing으로 분리한다.
  - Vercel cold start, DB/Prisma warm-up, cache miss, query 비용을 구분한다.

#### Phase 6. Feed/API cache와 query 최적화
- 상태: `in_progress`
- 작업:
  - guest feed/home preview query select, aggregate, cache key를 점검한다.
  - sort/filter/type 조합별 p95가 안정적인지 확인한다.

#### Phase 7. 이미지/폰트/정적 리소스 최적화
- 상태: `pending`
- 작업:
  - 로고, font, upload thumbnail, above-the-fold image loading을 점검한다.
  - 모바일 data transfer와 LCP blocking resource를 줄인다.

#### Phase 8. 성능 budget과 개선 전후 블로그
- 상태: `pending`
- 작업:
  - route별 budget과 on-demand performance smoke를 문서화한다.
  - `blog/`에 baseline, 병목, 개선, before/after 수치를 정리한다.

## 다음 작업 후보

- authenticated admin queue smoke production credential 확보 후 재실행
