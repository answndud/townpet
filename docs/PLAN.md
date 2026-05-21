# PLAN.md

목표: TownPet를 기능/운영/품질/속도 기준에서 실제 유저 획득이 가능한 동네 반려생활 정보 서비스 상태로 끌어올린다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- 우선순위: `서비스 속도/안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- Phase 2 보류: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### P0 성능 측정과 속도 개선 루프

- 상태: `in_progress`
- 배경:
  - 사용자가 production `https://townpet.vercel.app/` 첫 진입, 게시판 이동, 댓글 작성이 체감상 너무 느리다고 보고했다.
  - 프레임워크를 Next.js에서 Vite+React로 바꾸거나 DB를 PostgreSQL에서 SQLite로 바꾸는 대형 교체는 현재 우선순위가 아니다.
  - TownPet의 다음 제품 개선은 마케팅/지역 랜딩보다 먼저 **현재 체감 속도를 정확히 측정하고, 같은 측정 기준으로 개선 전후를 수치화하는 것**이다.
  - 이후 결과는 `/blog`에 성능 개선 기록으로 남겨 포트폴리오와 운영 문서 양쪽에서 재사용한다.
- 현재까지의 빠른 관찰:
  - Node `fetch` 기준 production 서버 응답은 항상 10초로 재현되지는 않았다.
    - `/`: 약 `110-220ms`
    - `/feed -> /feed/guest`: 약 `210-240ms`
    - `/feed/guest`: 약 `100-120ms`
    - `/api/health`: 첫 요청 약 `946ms`, 이후 약 `212ms`
    - `/sitemap/0.xml`: 첫 요청 약 `955ms`, 이후 약 `15-27ms`
  - 따라서 “서버 HTML 응답이 항상 10초”라기보다 아래 중 하나 또는 복합일 가능성이 높다.
    - 브라우저 JS bundle/hydration 비용
    - 첫 방문 cold start 또는 DB connection warm-up
    - Vercel function region과 PostgreSQL region 거리
    - `/feed` 서버 렌더 중 auth, user, policy, count/list, personalization query가 한 요청에 과하게 묶이는 문제
    - 댓글 작성 후 전체 상세/댓글 재조회 또는 revalidation 과다
    - 이미지/font/third-party script가 first paint를 지연하는 문제
- 원칙:
  - Next.js와 PostgreSQL은 유지한다.
  - 큰 교체보다 측정 가능한 병목 제거를 우선한다.
  - “빠른 느낌”이 아니라 `TTFB`, `FCP`, `LCP`, `TBT/INP`, route transition time, mutation latency를 전후 수치로 비교한다.
  - 측정 도구를 먼저 만들고, 개선 후 같은 스크립트를 다시 실행한다.
  - 성능 개선 결과는 `docs/reports`에 raw evidence로 남기고, 정리본은 `blog/29-성능개선-측정과-최적화-기록.md`로 작성한다.

#### P0-Perf-3. `/feed` query 경량화

- 현재 관찰:
  - `app/src/app/feed/page.tsx`는 한 서버 렌더에서 auth, community nav, viewer context, guest policy, count/list, best/list, personalization context를 처리한다.
  - `resolveFeedPageSlice`는 `countItems()`와 `listPage()`를 병렬 실행하지만, 전체 페이지 수를 위해 count query가 매번 필요하다.
- 개선 후보:
  - 게스트 feed와 로그인 feed의 서버 경로를 더 명확히 분리한다.
  - 첫 페이지에서는 `countPosts`를 생략하고 `limit + 1` 기반 `hasNextPage`로 전환한다.
  - 전체 페이지 수 UI가 꼭 필요한 경우에만 count를 lazy fetch한다.
  - `personalization.context`는 `personalized=1`일 때만 계산하고, 기본 feed에서는 lazy load한다.
  - `listCommunityNavItems(50)`는 layout/header에서 중복 호출되는지 확인하고 캐시 TTL을 늘린다.
  - guest read policy와 login required type 조회는 짧은 TTL cache를 적용한다.
- 완료 기준:
  - `/feed/guest`와 `/feed`의 server timing phase가 baseline 대비 감소한다.
  - feed 첫 페이지 렌더가 count query에 묶이지 않는다.
  - pagination UX가 깨지지 않는다. 필요하면 “더보기” 중심으로 전환한다.
- 검증:
  - `feed-page-query.service` 단위 테스트
  - feed list/count 관련 query test
  - `/feed?perf=1` production 또는 local 측정 비교

#### P0-Perf-4. 댓글 작성 체감 속도 개선

- 현재 우려:
  - 댓글 작성 후 전체 post detail 또는 댓글 목록을 다시 가져오면 사용자는 mutation이 느리다고 느낀다.
  - revalidation 범위가 넓거나 댓글 count/notification side effect가 동기 처리되면 체감 지연이 커질 수 있다.
- 개선 후보:
  - 댓글 작성 시 optimistic UI 적용
  - 서버 action/API는 새 댓글 payload와 count delta만 반환
  - 댓글 목록 전체 refetch를 피하고 부분 append로 처리
  - notification 생성/전송은 outbox 또는 비동기 경로로 분리되어 있는지 확인
  - `revalidatePath` 또는 cache invalidation 범위를 post detail 최소 단위로 제한
- 완료 기준:
  - 댓글 submit 클릭 후 사용자가 보는 화면 반응이 200ms 이내에 시작된다.
  - 서버 완료 전에는 pending 댓글 상태가 보인다.
  - 실패 시 rollback과 오류 안내가 있다.
  - 실제 API latency와 perceived latency를 분리 측정한다.
- 검증:
  - comment component test
  - post-comment auth sync e2e 또는 targeted Playwright
  - mutation latency 측정

#### P0-Perf-5. route bundle/hydration 비용 측정과 절감

- 목표:
  - 서버 응답은 빠른데 브라우저 체감이 느린 경우를 잡는다.
- 확인할 항목:
  - public feed에 rich editor bundle이 섞이는지
  - admin/ops/personalization 코드가 public route chunk에 섞이는지
  - `SunEditor`는 글쓰기/수정 화면에서만 dynamic import되는지
  - header viewer shell fetch가 first paint를 막지 않는지
  - Google font 로딩이 render blocking처럼 보이는지
  - image/media proxy가 LCP를 지연하는지
- 구현 후보:
  - bundle analyzer 추가 또는 Next build analyze script 추가
  - Playwright trace에서 JS parse/evaluate time 확인
  - public route별 JS size budget 문서화
- 완료 기준:
  - `/`, `/feed/guest`, post detail의 주요 JS chunk 크기를 알 수 있다.
  - 불필요한 heavy client component가 public initial route에서 빠진다.
  - hydration 이후 첫 클릭 가능 시점이 baseline 대비 줄어든다.

#### P0-Perf-6. DB region/index/query plan 점검

- 목표:
  - PostgreSQL을 유지하면서 실제 query 병목을 줄인다.
- 확인할 항목:
  - Vercel function region
  - PostgreSQL provider region
  - connection pooling endpoint 사용 여부
  - cold connection 시간이 큰지
  - feed/search/comment query의 `EXPLAIN ANALYZE`
- 우선 query:
  - feed list:
    - `scope,status,createdAt`
    - `scope,status,likeCount,commentCount,viewCount,createdAt`
    - `neighborhoodId,type,status,createdAt`
  - search:
    - `structuredSearchText`
    - `title/content contains`
    - pg_trgm 사용 여부
  - comments:
    - `postId,createdAt`
  - reports/moderation:
    - 운영 화면에서 느린 query
- 완료 기준:
  - 느린 query top 5와 원인 후보가 문서화된다.
  - index 추가가 필요한 경우 migration 계획이 따로 분리된다.
  - DB region/pooling 설정 문제가 있으면 운영 체크리스트에 반영한다.

#### P0-Perf-7. 개선 전후 블로그/리포트 산출물

- 목표:
  - 성능 개선을 단순 작업 로그가 아니라 백엔드 포트폴리오 글로 정리한다.
- 산출물:
  - `docs/reports/performance-baseline-YYYY-MM-DD.md`
  - `docs/reports/performance-after-YYYY-MM-DD.md`
  - `blog/29-성능개선-측정과-최적화-기록.md`
- blog 구성:
  1. 문제: 첫 방문/게시판 이동/댓글 작성이 느리게 느껴짐
  2. 가설: 서버 TTFB vs 브라우저 hydration vs DB query vs mutation UX
  3. baseline 측정 표
  4. 적용한 개선:
     - `/` shell/cached feed
     - feed count 제거/lazy
     - personalization lazy
     - 댓글 optimistic UI
     - bundle/hydration 개선
     - DB query/index 점검
  5. after 측정 표
  6. 개선률:
     - FCP/LCP/route transition/mutation perceived latency
  7. 남은 tradeoff:
     - 실시간성 vs 캐시
     - SEO HTML 포함 vs client fetch
     - 단순 운영 vs 복잡한 cache invalidation
- 완료 기준:
  - 개선 전후 수치가 같은 도구/같은 대상/같은 반복 횟수로 비교된다.
  - 성능 개선률이 README 또는 blog에서 설명 가능한 숫자로 남는다.
  - “Next.js/PostgreSQL을 바꾸지 않고 병목을 줄였다”는 서사가 완성된다.

### 마케팅 피드백 기반 제품 획득 루프 재정렬

- 상태: `pending_after_performance`
- 재개 조건:
  - P0 성능 측정 baseline이 작성된다.
  - `/` 첫 화면 또는 feed 핵심 병목 중 최소 1개 이상이 개선된다.
  - 개선 전후 수치가 `docs/reports`에 남는다.
- 배경:
  - TownPet를 “반려동물 커뮤니티”로 마케팅하면 기존 네이버카페, 인스타그램, 당근, 펫 SNS 앱과 직접 경쟁하게 되어 차별화가 약하다.
  - 현재 repo의 강점은 이미 `LOCAL / GLOBAL`, 구조화 게시판, 검색, 신고/제재/운영 구조에 있으므로 “커뮤니티”보다 “우리 동네 반려생활 문제 해결 정보 DB”로 제품 표면을 재정렬해야 한다.
  - 초기 커뮤니티는 전국 단위로 열면 빈 화면이 드러나므로 특정 지역 1곳에 콘텐츠와 참여 밀도를 먼저 쌓아야 한다.
- 핵심 포지셔닝:
  - 기존 표현: `반려동물 전용 커뮤니티`, `동네 기반 반려동물 커뮤니티`
  - 목표 표현: `우리 동네 반려생활 정보, TownPet`
  - 보조 설명: `동물병원 · 산책코스 · 분실동물 · 입양 · 중고거래 정보를 지역별로 모아보세요.`
  - 더 공격적인 설명: `네이버카페보다 찾기 쉽고, 당근보다 반려동물에 특화된 동네 반려생활 게시판`
- 초기 운영 가정:
  - 첫 지역은 `마포구`를 기본 후보로 두되, 실제 실행 전 `마포 / 성동 / 송파 / 분당` 중 하나를 최종 선택한다.
  - 첫 90일은 전국 서비스가 아니라 `선택 지역 반려인을 위한 동네 반려생활 게시판`으로 운영한다.
  - 첫 웨지는 `분실동물 + 병원 + 산책`으로 고정하고, 마켓/돌봄/입양은 기존 구조를 유지하되 획득 메시지의 전면에는 두지 않는다.
- 외부 근거:
  - 농림축산식품부 2025 반려동물 양육현황조사는 반려동물 양육가구 비율 29.2%를 발표했다. 시장 크기는 충분하지만, 신규 반려인 폭증보다 기존 반려인의 반복 문제 해결이 핵심이다.
  - 네이버 서치어드바이저는 검색로봇이 수집할 수 있도록 `robots.txt`, sitemap 위치, 수집 가능 리소스, 사이트맵 제출을 확인하라고 안내한다. TownPet은 지역 SEO 페이지를 sitemap/metadata와 함께 제품 표면에 포함해야 한다.
  - Kakao Developers 문서는 게시글/상품/지도 등 서비스 페이지 공유에는 카카오톡 공유 API를 사용한다고 설명한다. TownPet의 분실동물/병원/산책 글은 카카오톡 공유 품질이 획득 루프에 직접 연결된다.

## P0. 포지셔닝과 첫 화면 재정렬

### P0-1. `/` 홈을 redirect가 아니라 획득형 랜딩으로 전환

- 현재 문제:
  - `app/src/app/page.tsx`는 `/feed`로 redirect하고 `noindex` metadata를 사용한다.
  - 광고/SEO/오프라인 QR에서 들어온 첫 방문자가 제품 가치를 이해하기 전에 피드로 이동한다.
  - 커뮤니티 글 밀도가 낮은 상태에서는 피드 첫 화면이 빈집처럼 보일 수 있다.
- 구현 방향:
  - `/`을 public indexable landing page로 바꾼다.
  - 첫 화면 H1은 `우리 동네 반려생활 정보, TownPet`으로 둔다.
  - 지원 문구는 `병원 · 산책 · 분실 · 입양 · 중고거래를 지역별로 모아보세요.`로 통일한다.
  - CTA는 3개로 제한한다.
    - `내 동네 선택하기`
    - `분실동물 등록하기`
    - `병원/산책 정보 보기`
  - “커뮤니티 가입”보다 “문제 해결”을 먼저 보여준다.
  - 초기 지역이 정해지기 전에는 `마포구 반려생활 지도 만들기` 캠페인 teaser를 노출한다.
- 관련 파일:
  - `app/src/app/page.tsx`
  - `app/src/app/layout.tsx`
  - `app/src/lib/page-metadata.ts`
  - `README.md`
- 완료 기준:
  - `/`이 `/feed`로 redirect하지 않는다.
  - `/` metadata가 indexable public metadata로 바뀐다.
  - 모바일 첫 viewport에서 `내 동네 선택`, `분실동물 등록`, `병원/산책 정보` CTA가 보인다.
  - 기존 로그인/피드 경로는 깨지지 않는다.
- 검증:
  - targeted component/page test
  - metadata unit test 또는 page metadata policy test 갱신
  - Playwright mobile screenshot smoke

### P0-2. 전역 카피와 메타데이터 통일

- 현재 문제:
  - README와 앱 metadata에 아직 `반려동물 커뮤니티` 표현이 강하다.
  - 실제 강점인 `지역 + 상황별 정보 탐색`이 첫 문장에 충분히 드러나지 않는다.
- 구현 방향:
  - README 상단 문구, 앱 layout metadata, feed/search metadata, footer 문구를 새 포지셔닝으로 통일한다.
  - `커뮤니티`는 결과로만 쓰고, 획득 카피에서는 `동네 반려생활 정보`, `분실동물`, `동물병원`, `산책코스`를 먼저 배치한다.
  - 법적/운영 문구는 과장하지 않고 “방문 전 전화 확인 필요”, “경험 공유 중심” 같은 안전 문구를 기본화한다.
- 관련 파일:
  - `README.md`
  - `app/src/app/layout.tsx`
  - `app/src/app/feed/page.tsx`
  - `app/src/app/search/page.tsx`
  - `app/src/components/navigation/app-shell-footer.tsx`
- 완료 기준:
  - public title/description에서 `반려동물 SNS` 또는 범용 커뮤니티처럼 읽히는 문구가 줄어든다.
  - `우리 동네 반려생활 정보`가 README와 앱 metadata의 중심 표현이 된다.
  - 검색/공유 미리보기 문구가 분실/병원/산책 intent와 연결된다.
- 검증:
  - metadata unit test
  - copy audit
  - `git diff --check`

### P0-3. 초기 지역 선택 UX 명확화

- 현재 문제:
  - LOCAL/GLOBAL 정책은 존재하지만, 첫 방문자가 “내 동네 서비스”라고 느끼는 진입점이 약하다.
  - 전국 서비스처럼 보이면 자기 동네 글이 적을 때 바로 이탈할 수 있다.
- 구현 방향:
  - launch region config를 둔다.
    - 후보: `mapo`, `seongdong`, `songpa`, `bundang`
    - 기본값은 문서상 `mapo`로 둔다.
  - 랜딩에서 `지금은 마포구부터 만들고 있어요` 같은 범위 고지 UI를 제공한다.
  - 동네 선택 전에는 전체 피드보다 지역 허브/캠페인으로 유도한다.
  - 이미 `Neighborhood` 모델과 `/api/neighborhoods`가 있으므로, 별도 대규모 지도 기능 없이 선택/허브 구조부터 만든다.
- 관련 파일:
  - `app/src/app/page.tsx`
  - `app/src/app/api/neighborhoods/route.ts`
  - `app/src/lib/neighborhood-region.ts`
  - `app/src/server/queries/community.queries.ts`
- 완료 기준:
  - 사용자가 초기 지역이 어디인지 첫 화면에서 이해한다.
  - 지역 선택 또는 지역 허브 이동 CTA가 명확하다.
  - 초기 지역 변경이 코드 곳곳에 하드코딩되지 않는다.

## P0. 지역 SEO와 랜딩 페이지

### P0-4. 지역 허브 route 추가

- 현재 문제:
  - `/towns/*` route가 없다.
  - sitemap은 `/feed`, `/search`, `/boards/adoption`, public GLOBAL post 중심이라 지역 검색 유입을 받을 landing surface가 부족하다.
- 추가할 route:
  - `/towns/mapo`
  - `/towns/mapo/hospitals`
  - `/towns/mapo/walks`
  - `/towns/mapo/lost`
  - `/towns/mapo/used-market`
- MVP 화면 구성:
  - 지역명과 핵심 메시지
  - 병원/산책/분실/중고거래 카드
  - 운영자 콘텐츠와 사용자 글 분리 표시
  - “최근 분실동물 제보 없음” 같은 안전한 empty state
  - “첫 후기를 남기면 Founding Member 배지 지급 예정” CTA
- 완료 기준:
  - `/towns/mapo`에서 지역별 콘텐츠 묶음을 볼 수 있다.
  - 콘텐츠가 없어도 빈 화면이 아니라 준비 중/가이드/CTA가 표시된다.
  - route별 metadata, canonical, sitemap entry가 있다.
- 검증:
  - page render test
  - sitemap test 갱신
  - metadata test

### P0-5. SEO guide route 추가

- 현재 문제:
  - 검색 의도가 강한 생활형 query를 받을 guide page가 없다.
  - 커뮤니티 글이 쌓이기 전에는 검색 유입을 받을 정보 자산이 부족하다.
- 추가할 route:
  - `/guides/lost-dog-poster`
  - `/guides/24h-vet-checklist`
  - `/guides/pet-used-trade-safety`
  - `/guides/lost-pet-first-24-hours`
  - `/guides/pet-hospital-review-policy`
- 콘텐츠 방향:
  - “강아지를 잃어버렸을 때 30분 안에 할 일”
  - “24시 동물병원 찾기 전 확인할 것”
  - “반려동물 중고용품 거래 주의사항”
  - “병원 후기를 안전하게 남기는 방법”
- CTA:
  - `우리 동네 분실동물 게시판 보기`
  - `마포구 24시 동물병원 정보 보기`
  - `병원/산책 정보를 함께 제보하기`
- 완료 기준:
  - guide page가 sitemap에 포함된다.
  - 각 guide는 지역 허브 또는 게시글 작성 플로우로 연결된다.
  - 의료 단정/법적 위험 표현을 피한다.

### P0-6. robots/sitemap/canonical/Naver Search Advisor 체크리스트

- 현재 상태:
  - `app/src/app/robots.ts`와 `app/src/app/sitemap.ts`는 존재한다.
  - 지역/가이드 landing이 추가되면 sitemap과 canonical policy를 재정의해야 한다.
- 구현 방향:
  - sitemap에 public landing, guide, 지역 허브를 포함한다.
  - 로그인/프로필/알림/관리자/API는 계속 noindex 또는 disallow로 둔다.
  - 지역 페이지가 중복 query param으로 색인되지 않도록 canonical을 고정한다.
  - `business/operations`에 네이버 서치어드바이저 제출 체크리스트를 만든다.
- 완료 기준:
  - `/robots.txt`가 sitemap 위치를 노출한다.
  - `/sitemap/0.xml`에 지역/가이드 public page가 포함된다.
  - Search Advisor 제출/검증 순서가 문서화된다.

## P0. 분실동물 웨지 강화

### P0-7. 분실동물 전용 작성 플로우

- 현재 상태:
  - Prisma에는 `LostFoundAlert` 모델이 있다.
  - 게시글 type에는 `LOST_FOUND`가 있다.
  - 하지만 획득용 “분실동물 등록 도구”로는 아직 약하다.
- 구현 방향:
  - `/lost/new` 또는 `/posts/new?type=LOST_FOUND` 전용 진입을 명확히 만든다.
  - 필수 구조화 입력:
    - 분실/목격 구분
    - 동물 종류
    - 이름
    - 사진
    - 품종/색상/특징
    - 실종 또는 목격 위치
    - 시간
    - 연락 방식
  - 선택 입력:
    - 보상 여부 표시 금지 또는 주의 문구
    - 보호자 확인 질문
    - 공개 연락 방식 제한
  - 게스트도 작성 가능하되 악용 정책을 강하게 적용한다.
- 관련 파일:
  - `app/prisma/schema.prisma`
  - `app/src/lib/validations/posts/post.ts`
  - `app/src/components/posts/post-create-structured-fields.tsx`
  - `app/src/server/services/posts/post.service.ts`
  - `app/src/server/services/moderation/guest-safety.service.ts`
- 완료 기준:
  - 분실동물 등록은 일반 글쓰기보다 짧고 명확하다.
  - 필수 정보가 없으면 공유용 글이 생성되지 않는다.
  - 연락처/개인정보 노출 정책이 적용된다.
- 검증:
  - validation failure-path test
  - guest/member create service test
  - mobile form accessibility test

### P0-8. 분실동물 공유 이미지/카카오톡 공유 MVP

- 현재 문제:
  - 게시글 공유는 있지만 분실동물에 특화된 카카오/인스타/전단 생성 루프가 없다.
- 구현 방향:
  - 분실동물 상세에 공유 패널을 추가한다.
  - 공유 산출물:
    - 카카오톡 공유 문구
    - 링크 복사
    - 인스타 스토리 비율 이미지
    - 프린트용 간단 PDF 또는 A4 이미지
  - MVP에서는 서버 동적 이미지 또는 클라이언트 canvas 중 유지보수 쉬운 방식을 선택한다.
  - 이미지에는 위치/시간/특징/연락 방식/주의 문구를 포함한다.
- 완료 기준:
  - 분실동물 글에서 공유 이미지가 생성된다.
  - OG title이 `[TownPet] 마포구 실종 강아지 제보 요청`처럼 intent 기반으로 나온다.
  - 공유 클릭 이벤트를 추적할 수 있다.

### P0-9. “목격했어요” 제보 흐름

- 현재 문제:
  - 일반 댓글만으로는 제보와 응원을 구분하기 어렵다.
- 구현 방향:
  - LOST_FOUND 상세에 `목격했어요` CTA를 추가한다.
  - MVP에서는 댓글 subtype 또는 구조화 댓글 metadata로 구현한다.
  - 제보 필드:
    - 목격 위치
    - 목격 시간
    - 사진 선택
    - 보호자에게만 보일 민감 정보 여부
  - 허위 제보/장난 제보 신고 사유를 추가한다.
- 완료 기준:
  - 분실동물 글에서 일반 댓글과 제보가 구분된다.
  - 보호자가 제보를 확인하고 상태를 `해결/종료`로 바꿀 수 있다.
  - 허위 제보 신고/제재 경로가 있다.

## P0. 병원/산책 콘텐츠를 획득용 구조로 전환

### P0-10. 병원 후기 템플릿 안전화

- 현재 상태:
  - `HospitalReview` 모델과 병원 후기 의심 신호 admin surface가 있다.
- 개선 방향:
  - 자유 서술보다 체크박스를 앞에 둔다.
  - 권장 필드:
    - 방문 목적
    - 동물 종류
    - 대기시간
    - 설명 충분성
    - 가격대
    - 주차
    - 야간진료
    - 재방문 의향
  - 비용 공유는 선택 입력으로 두고, 영수증 인증은 P1로 분리한다.
  - `과잉진료`, `사기`, `최악` 등 위험 표현은 작성 중 안내/검토 대상으로 분류한다.
  - 병원 측 정정 요청 경로를 public footer 또는 병원 페이지에 제공한다.
- 완료 기준:
  - 병원 후기는 “비방 게시판”이 아니라 비교 가능한 경험 데이터처럼 보인다.
  - 작성 전/중/후에 안전 문구가 노출된다.
  - admin hospital review flags와 연결된다.

### P0-11. 산책코스 카드 필드 보강

- 현재 상태:
  - `WalkRoute`는 routeName, distance, duration, difficulty, coordinates, street lights, restroom, parking, safetyTags를 가진다.
- 개선 방향:
  - 사용자에게 더 유용한 산책 정보로 재배치한다.
  - 필드 후보:
    - 대형견 적합 여부
    - 혼잡 시간
    - 목줄 필수 구간
    - 배변봉투함
    - 물 마실 곳
    - 야간 조명
    - 주차
    - 위험/공사 구간
  - 지도는 P1/P2로 미루고, MVP는 텍스트 위치와 태그 중심으로 시작한다.
- 완료 기준:
  - 산책코스 카드는 블로그 글보다 빠르게 비교 가능한 구조를 가진다.
  - 지역 허브에서 산책코스 카드가 SEO 콘텐츠로 재사용된다.

### P0-12. 운영자 콘텐츠와 사용자 글 분리

- 현재 문제:
  - 초기 시드가 사용자 글처럼 보이면 신뢰를 잃는다.
  - 운영자 조사 콘텐츠, 공식 링크, 유저 후기, 파트너 정정 요청이 구분되어야 한다.
- 구현 방향:
  - 최소 MVP:
    - `operatorContent` 표시 badge
    - 출처 URL
    - 마지막 확인일
    - 정보 수정 요청 CTA
  - 확장 모델 후보:
    - `LocalPlace`
    - `LocalHospital`
    - `WalkCourse`
    - `PlaceSource`
    - `PlaceCorrectionRequest`
  - 첫 단계에서는 별도 모델 없이 post metadata로 가능한지 검토하고, SEO 디렉토리 규모가 커지면 독립 모델로 분리한다.
- 완료 기준:
  - 운영자 작성 콘텐츠가 가짜 유저 글처럼 보이지 않는다.
  - 공식/운영자/사용자 제보 출처가 UI에서 구분된다.
  - 정보 수정 요청이 가능하다.

## P1. 창립 멤버와 지역 캠페인 루프

### P1-1. “우리 동네 반려생활 지도 만들기” 캠페인 페이지

- 목표:
  - 이벤트가 끝나도 콘텐츠 자산이 남는 캠페인을 만든다.
- 화면 구성:
  - 캠페인 설명
  - 참여 방법
    - 산책코스 추천
    - 병원 방문 경험 공유
    - 동반가능 장소 제보
    - 분실동물 게시판 공유
    - 중고용품 거래 글 작성
  - 보상 안내
    - Founding Member 배지
    - 우수 제보자 메인 노출
    - 소액 기프티콘 또는 지역 쿠폰
  - 콘텐츠 현황
    - 병원 정보 수
    - 산책코스 수
    - 제보 수
    - 창립 멤버 수
- 완료 기준:
  - 캠페인 링크 하나로 온라인 DM/오프라인 QR/블로그 CTA를 통일할 수 있다.
  - 가입보다 첫 제보/첫 글 작성이 더 강조된다.

### P1-2. Founding Member 배지

- 구현 방향:
  - 초기 지역/캠페인 기간에 첫 글 또는 검수된 제보를 남긴 사용자에게 badge를 부여한다.
  - 프로필/글 카드/캠페인 페이지에서 노출한다.
  - 운영자 수동 부여부터 시작하고, 자동 조건 부여는 이후 확장한다.
- 완료 기준:
  - 창립 멤버 30명을 직접 모집할 명분이 생긴다.
  - 배지가 과도한 게임화가 아니라 신뢰/기여 표시로 보인다.

### P1-3. 제보/추천 버튼과 첫 글 템플릿

- 개선 방향:
  - 빈 editor보다 지역 질문/제보 템플릿을 제공한다.
  - 예시:
    - `마포구 고양이 건강검진 병원 추천받아요`
    - `성동구 대형견 산책하기 좋은 곳 있나요?`
    - `송파구 강아지 미용 가격 어느 정도인가요?`
    - `분당에서 고양이 중성화 병원 찾고 있어요`
  - 각 지역 허브와 guide page 하단에 맞춤 템플릿 CTA를 둔다.
- 완료 기준:
  - 첫 글 작성 화면에서 사용자가 무엇을 써야 할지 바로 알 수 있다.
  - 지역/카테고리별 추천 제목이 자동으로 채워지거나 선택된다.

## P1. 측정과 운영 대시보드

### P1-4. 획득 이벤트 정의

- 추가 이벤트 후보:
  - `town_landing_viewed`
  - `town_category_clicked`
  - `lost_alert_created`
  - `lost_poster_generated`
  - `lost_sighting_created`
  - `kakao_share_clicked`
  - `guide_cta_clicked`
  - `operator_content_viewed`
  - `correction_request_submitted`
  - `founding_member_joined`
- 기존 문서 반영:
  - `business/analytics/핵심_지표.md`
  - `business/analytics/온동네_초기유저_30일_실행플레이북.md`
- 완료 기준:
  - 첫 90일 핵심 지표가 제품 이벤트와 연결된다.
  - `방문 -> 회원가입 -> 첫 글/댓글 -> 7일 재방문 -> 공유` 흐름을 볼 수 있다.

### P1-5. 초기 지역 운영 지표

- 운영자에게 필요한 수치:
  - 지역별 콘텐츠 수
  - 카테고리별 빈 상태
  - 분실동물 활성/해결 수
  - 병원 정보 마지막 확인일
  - 산책코스 제보 수
  - 카카오 공유 클릭 수
  - 첫 글 작성률
  - 첫 글 24h 댓글 수신율
  - 7일 재방문률
- 완료 기준:
  - `/admin/ops` 또는 별도 admin page에서 초기 지역 밀도를 볼 수 있다.
  - “전국 MAU”보다 지역별 콘텐츠 밀도와 작성자 수를 먼저 본다.

### P1-6. 오프라인 QR/파트너 운영 준비

- 구현 방향:
  - 병원/미용실/펫카페/보호소용 QR landing URL을 분리한다.
  - 예:
    - `/towns/mapo/lost?utm_source=hospital_qr`
    - `/campaigns/mapo-pet-life-map?utm_source=petcafe_qr`
  - 파트너 제안 문구와 포스터 PDF는 business 문서로 관리한다.
- 완료 기준:
  - 오프라인 QR 하나가 “가입”이 아니라 “분실동물/응급병원/산책 정보”로 연결된다.
  - 파트너 10곳 제안용 문구와 체크리스트가 준비된다.

## P1. 정책/법적 리스크 보강

### P1-7. 병원/업체 정정 요청 프로세스

- 배경:
  - 병원 후기는 SEO와 유저 획득에 강하지만, 명예훼손/영업방해 리스크가 있다.
- 구현 방향:
  - 병원/업체가 정정 요청을 제출할 수 있는 form을 제공한다.
  - admin에서 정정 요청을 검토하고 처리 상태를 기록한다.
  - 사용자 후기 본문은 임의 삭제보다 상태/검토 로그를 남긴다.
- 완료 기준:
  - 병원/업체 관련 분쟁이 들어왔을 때 운영자가 처리할 공식 경로가 있다.
  - 정책 문서와 UI가 같은 기준을 말한다.

### P1-8. 분실동물 허위 제보/개인정보 정책

- 구현 방향:
  - 분실동물 글에서 전화번호/주소 노출을 최소화한다.
  - 민감 제보는 보호자/운영자에게만 보이는 옵션을 검토한다.
  - 허위 제보 신고 사유와 제재 기준을 추가한다.
- 완료 기준:
  - 분실동물 기능이 긴급성과 확산성을 가지면서도 개인정보/악용 리스크를 통제한다.

### P1-9. 중고거래 안전 템플릿

- 구현 방향:
  - 반려동물 중고용품 특화 경고를 추가한다.
  - 예:
    - 개봉 사료/간식 주의
    - 유통기한 경고
    - 이동장/케이지 사이즈 템플릿
    - 고가 유모차/자동급식기 체크리스트
    - 직거래 장소 주의
- 완료 기준:
  - TownPet 마켓은 당근의 복제판이 아니라 반려동물 용품 특화 안전장치를 가진다.

## P2. 나중으로 미룰 것

- 앱 설치 유도
- 푸시 알림
- 실시간 채팅
- 포인트/레벨
- 사진 콘테스트
- 친구 맺기
- 펫 프로필 꾸미기
- 결제/보험/정산
- 카카오맵 deep integration
- 마켓/공동구매 deep transaction

이 항목들은 초기 유저 획득이나 지역 콘텐츠 밀도 형성보다 후순위다. 특히 “귀여운 SNS” 방향 기능은 기존 인스타그램/펫 SNS 앱과 정면 경쟁하게 만들 수 있으므로 보류한다.

## 90일 실행 계획

### 1-2주차: 제품/랜딩 정리

- `/` 랜딩 전환
- 메인 카피/metadata/README 통일
- 초기 지역 후보 결정
- 지역 허브 URL 구조 설계
- sitemap/robots/canonical 정책 갱신
- 카카오톡 공유/OG 품질 점검
- 모바일 첫 화면에서 `내 동네 선택` 강조

완료 기준:
- 랜딩에서 TownPet이 `우리 동네 반려생활 정보 서비스`로 읽힌다.
- `/towns/{region}` 설계가 확정된다.
- SEO/공유 기본 검증 루틴이 있다.

### 3-4주차: 콘텐츠 시드 기반 구축

- 초기 지역 병원 50-100개 정보 구조 설계
- 24시/야간진료 병원 별도 페이지
- 산책코스 20개 카드 구조
- 반려견 동반 장소 30개 구조
- 분실동물 대처 가이드 5개
- 입양/임보/보호소 링크 정리
- 중고거래 안전 가이드 작성

완료 기준:
- 커뮤니티 글이 없어도 지역 페이지에서 읽을 콘텐츠가 있다.
- 운영자 콘텐츠와 사용자 글이 명확히 구분된다.

### 5-6주차: 창립 멤버 모집 루프

- 캠페인 페이지 공개
- Founding Member 배지 MVP
- 첫 글/제보 템플릿
- DM/카페/당근/오프라인 QR용 URL 분리
- 파트너 제안 문구 작성

목표:
- 실제 가입자 100명
- 글 작성자 30명
- 댓글 작성자 50명
- 지역 파트너 10곳 접촉

### 7-8주차: 제보 이벤트와 콘텐츠 자산화

- 산책코스 제보 이벤트
- 병원 방문 경험 공유 이벤트
- 우수 제보자 메인 노출
- 캠페인 결과를 지역 가이드 페이지에 반영

완료 기준:
- 이벤트가 끝나도 `마포구 반려생활 가이드` 같은 콘텐츠 자산이 남는다.

### 9-12주차: 소액 광고/SEO 검증

- 네이버 검색광고 소액 테스트
- 인스타 릴스/스토리 테스트
- 당근 동네광고 테스트
- 네이버 블로그/마이크로 인플루언서 소액 테스트

측정 지표:
- 방문자 -> 회원가입: 5-15%
- 회원가입 -> 첫 글/댓글: 10-30%
- 첫 글 작성 후 7일 재방문: 20% 이상
- 지역 페이지 검색 유입: 매주 증가
- 카카오 공유 클릭률: 글 유형별 비교

## 첫 개발 사이클 추천 순서

1. `/` 랜딩 전환 + 전역 카피/metadata 통일
2. `/towns/mapo` 지역 허브 MVP + sitemap/metadata
3. `/towns/mapo/hospitals`, `/towns/mapo/walks`, `/towns/mapo/lost` read-only MVP
4. 분실동물 전용 작성/공유/OG MVP
5. 병원 후기 안전 템플릿 + 정정 요청 프로세스
6. 산책코스 카드 필드 보강
7. 캠페인 페이지 + Founding Member 배지
8. 획득 이벤트와 admin/ops 지표 연결

## 완료 기준

- TownPet의 첫인상이 `반려동물 커뮤니티`가 아니라 `동네 반려생활 정보 서비스`로 바뀐다.
- 초기 지역 1곳에 대한 public landing/guide/category page가 존재한다.
- 분실동물, 병원, 산책 중 최소 하나는 외부 공유/검색 유입을 받을 수 있는 독립 획득 루프를 가진다.
- sitemap/robots/canonical/metadata가 public landing 전략과 일치한다.
- 운영자 콘텐츠와 사용자 글이 구분된다.
- 첫 90일 지표가 admin 또는 문서상 측정 가능한 이벤트로 정의된다.

## 다음 작업 후보

- 위 Active 계획 중 `P0-1. / 홈을 획득형 랜딩으로 전환`부터 개발한다.
- 개발 전 초기 실험 지역을 `마포구 / 성동구 / 송파구 / 분당` 중 하나로 확정한다. 확정 전까지 문서와 config 기본 후보는 `마포구`로 둔다.
