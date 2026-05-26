# PLAN.md

목표: TownPet를 기능/운영/품질/속도 기준에서 실제 유저 획득이 가능한 동네 반려생활 정보 서비스 상태로 끌어올린다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- 우선순위: `서비스 속도/안정성 -> 커뮤니티 핵심 기능 -> 재방문/유입 -> 운영 자동화`
- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- Phase 2 보류: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### 마케팅 피드백 기반 제품 획득 루프 재정렬

- 상태: `in_progress`
- 선행 조건:
  - P0 성능 측정 baseline, 홈/피드/댓글/browser asset/DB readiness 개선 기록, `blog/29-성능개선-측정과-최적화-기록.md` 작성이 완료됐다.
- 배경:
  - TownPet를 “반려동물 커뮤니티”로 마케팅하면 기존 네이버카페, 인스타그램, 당근, 펫 SNS 앱과 직접 경쟁하게 되어 차별화가 약하다.
  - 현재 repo의 강점은 이미 `LOCAL / GLOBAL`, 구조화 게시판, 검색, 신고/제재/운영 구조에 있으므로 “커뮤니티”보다 “우리 동네 반려생활 문제 해결 정보 DB”로 제품 표면을 재정렬해야 한다.
  - 운영 지역은 하나로 제한하지 않는다. 전국 공통 정보 자산을 먼저 쌓고, 사용자가 선택한 동네/검색 유입/제보 요청이 생긴 지역부터 지역 맥락을 붙인다.
- 핵심 포지셔닝:
  - 기존 표현: `반려동물 전용 커뮤니티`, `동네 기반 반려동물 커뮤니티`
  - 목표 표현: `우리 동네 반려생활 정보, TownPet`
  - 보조 설명: `동물병원 · 산책코스 · 분실동물 · 입양 · 중고거래 정보를 지역별로 모아보세요.`
  - 더 공격적인 설명: `네이버카페보다 찾기 쉽고, 당근보다 반려동물에 특화된 동네 반려생활 게시판`
- 초기 운영 가정:
  - 첫 지역을 강제로 확정하지 않는다. public UI, sitemap, 운영 문서에 대표 launch 지역을 고정하지 않는다.
  - 첫 90일은 전국에서 접근 가능한 `동네 선택형 반려생활 정보 서비스`로 운영하고, 지역별 밀도는 사용자 선택 동네와 실제 제보 발생 지역을 기준으로 자연스럽게 쌓는다.
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
  - 초기 지역이 정해지기 전에는 `/`에서 특정 구 이름이나 캠페인 teaser를 노출하지 않는다.
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
  - 전국 어디서나 접근 가능하되, 사용자가 자기 동네 맥락을 빠르게 붙이지 못하면 글 밀도가 낮아 보일 수 있다.
- 구현 방향:
  - launch region config를 public 기본값으로 쓰지 않는다.
  - 랜딩에서는 `내 동네 설정`, `주제별 탐색` 중심으로 안내한다.
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
  - `/towns/*` route는 있으나 특정 고정 지역을 public surface로 밀지 않는다.
  - 사용자가 선택한 동네/지역을 기준으로 같은 템플릿의 동적 허브를 보여줘야 한다.
  - sitemap은 `/feed`, `/search`, `/boards/adoption`, public GLOBAL post 중심이라 사용자 선택 지역으로 돌아갈 landing surface가 부족하다.
- 추가할 route:
  - `/towns/{city--district}`
  - `/towns/{city--district}/hospitals`
  - `/towns/{city--district}/walks`
  - `/towns/{city--district}/lost`
  - `/towns/{city--district}/used-market`
- MVP 화면 구성:
  - 사용자가 선택한 지역명과 핵심 메시지
  - 병원/산책/분실/중고거래 카드
  - 카테고리별 글 수와 관련 피드/작성 CTA
  - “최근 분실동물 제보 없음” 같은 안전한 empty state
  - 선택 동네가 없거나 존재하지 않으면 404/noindex
- 완료 기준:
  - 선택한 지역 허브에서 지역별 콘텐츠 묶음을 볼 수 있다.
  - 콘텐츠가 없어도 빈 화면이 아니라 준비 중/가이드/CTA가 표시된다.
  - route별 metadata/canonical은 선택 지역을 기준으로 생성된다.
  - 특정 지역 기본값은 코드와 문서에 두지 않는다.
- 검증:
  - page render test
  - dynamic town slug parse/build test
  - metadata test

### P0-5. SEO guide route 추가

- 현재 문제:
  - 검색 의도가 강한 생활형 query를 받을 guide page가 없다.
  - 커뮤니티 글이 쌓이기 전에는 검색 유입을 받을 정보 자산이 부족하다.
- 상태:
  - 완료. 상세는 [COMPLETED.md](./COMPLETED.md)의 `2026-05-21 | SEO guide route 추가`를 본다.
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
  - `우리 동네 24시 동물병원 정보 보기`
  - `병원/산책 정보를 함께 제보하기`
- 완료 기준:
  - guide page가 sitemap에 포함된다.
  - 각 guide는 지역 허브 또는 게시글 작성 플로우로 연결된다.
  - 의료 단정/법적 위험 표현을 피한다.

### P0-6. robots/sitemap/canonical/Naver Search Advisor 체크리스트

- 현재 상태:
  - `app/src/app/robots.ts`와 `app/src/app/sitemap.ts`는 존재한다.
  - 지역/가이드 landing이 추가되면 sitemap과 canonical policy를 재정의해야 한다.
- 상태:
  - 완료. 상세는 [COMPLETED.md](./COMPLETED.md)의 `2026-05-21 | 검색엔진 제출 체크리스트 정리`를 본다.
- 구현 방향:
  - sitemap에 public landing, guide, 지역 허브를 포함한다.
  - 로그인/프로필/알림/관리자/API는 계속 noindex 또는 disallow로 둔다.
  - 지역 페이지가 중복 query param으로 색인되지 않도록 canonical을 고정한다.
  - `business/operations`에 네이버 서치어드바이저 제출 체크리스트를 만든다.
- 완료 기준:
  - `/robots.txt`가 sitemap 위치를 노출한다.
  - `/sitemap/0.xml`에 지역/가이드 public page가 포함된다.
  - Search Advisor 제출/검증 순서가 문서화된다.

## P1. 창립 멤버와 지역 캠페인 루프

## P1. 측정과 운영 대시보드

## P1. 정책/법적 리스크 보강

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
- 이벤트가 끝나도 `우리 동네 반려생활 가이드` 같은 콘텐츠 자산이 남는다.

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
2. 사용자 선택 동네 기반 `/towns/{city--district}` 지역 허브 MVP + metadata
3. 선택 동네 기반 `/towns/{city--district}/hospitals`, `/towns/{city--district}/walks`, `/towns/{city--district}/lost` read-only MVP
4. 분실동물 전용 작성/공유/OG MVP
5. 병원 후기 안전 템플릿 + 정정 요청 프로세스
6. 산책코스 카드 필드 보강
7. 캠페인 페이지 + Founding Member 배지
8. 획득 이벤트와 admin/ops 지표 연결

## 완료 기준

- TownPet의 첫인상이 `반려동물 커뮤니티`가 아니라 `동네 반려생활 정보 서비스`로 바뀐다.
- 사용자가 선택한 동네에 대한 public landing/guide/category page가 존재한다.
- 분실동물, 병원, 산책 중 최소 하나는 외부 공유/검색 유입을 받을 수 있는 독립 획득 루프를 가진다.
- sitemap/robots/canonical/metadata가 public landing 전략과 일치한다.
- 운영자 콘텐츠와 사용자 글이 구분된다.
- 첫 90일 지표가 admin 또는 문서상 측정 가능한 이벤트로 정의된다.

## 다음 작업 후보

- 현재 active 구현 항목 없음.
- 다음 작업을 시작할 때는 코드보다 먼저 이 문서에 새 phase를 추가한다.
- 후보:
  - 글쓰기 구조화 필드별 세부 안내(병원/산책/분실/거래)의 남은 nested surface와 긴 문구 정리
  - production DB에 남은 E2E/demo 데이터의 운영상 정리 절차 문서화
  - 최신 `main` 배포 후 production 성능 재측정
- 지역을 하나로 제한하지 않는다. `/`과 public acquisition UI에는 사용자가 선택하지 않은 특정 지역명을 기본값처럼 노출하지 않는다.
