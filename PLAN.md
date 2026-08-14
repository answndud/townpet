# PLAN.md

## Goal

TownPet의 공개 피드·동물 게시판·공통 게시판을 최신 `townpet-springboot`의 Atlas 디자인 방향으로 정렬한다. 기준은 `?view=all` 실제 화면과 GitHub의 `HomeFeedPage.tsx`·`styles.css`이며, 제목 중심 단일 행 목록, compact toolbar, 얇은 구분선, 낮은 radius/shadow, 일관된 1320px 콘텐츠 폭을 적용한다. TownPet의 게시판 경계, 정책 상태, 접근성, canonical route는 유지한다.

## Design findings

- Spring Boot의 전체글 화면은 `커뮤니티 / 전체글`과 `전체글` 제목만 간결하게 보여주고, 불필요한 설명 영역을 줄인다.
- 목록 행은 `게시판 칩 → 범위 칩 → 제목 → 우측 작성자·시간`의 한 줄 구조다. 본문/본문 요약은 목록에 노출하지 않는다.
- 목록은 `padding: 7px 16px`, 얇은 border-bottom, hover 배경만 사용해 높은 정보 밀도를 만든다.
- 검색은 탭과 같은 compact toolbar 안에 들어가며, 34–40px control과 낮은 shadow를 사용한다.
- 모바일은 목록 행을 무리하게 고정하지 않고 제목을 줄이며, toolbar와 게시판 탭은 가로 스크롤/재배치로 overflow를 막는다.
- Spring Boot 소스에는 기본 CSS와 후단 Atlas override가 함께 있으므로 TownPet에서는 override를 계속 덧붙이지 않고 공용 토큰과 primitive를 정리한다.

## Active

### Phase 1 — Atlas 토큰과 공용 셸 정리

- [ ] `app/src/app/globals.css`의 공용 토큰을 Atlas 기준으로 재정렬한다.
  - page background `#f7f8fc` 계열, white surface, hairline border, `4/6/8px` radius, `0 1px 2px` 수준 shadow, compact control을 기준으로 한다.
  - 기존 `tp-*` 계층과 실제 사용 중인 전역 규칙을 조사해 중복·상충 cascade를 제거하고, 임시 override를 남발하지 않는다.
- [ ] `app/src/app/feed/guest/page.tsx`, `app/src/app/feed/page.tsx`, `app/src/components/animals/animal-board-page.tsx`, 공통 게시판 페이지의 공용 shell을 맞춘다.
  - `max-width: 1320px`, 페이지 좌우 padding, hero 높이, toolbar/list 간격을 통일한다.
  - hero는 제목·breadcrumb·글쓰기만 남기고 페이지마다 다른 과도한 설명/패딩을 정리한다.
  - 게시판 탭, 검색 toolbar, 상태/빈 상태, pagination도 같은 surface/border 밀도를 사용한다.
- [ ] header와 dropdown은 compact Atlas 톤으로 조정하되 기존 hover bridge, 바깥 클릭, Escape, Arrow/Home/End, 모바일 동작을 보존한다.

### Phase 2 — 공용 제목 중심 목록 primitive

- [ ] `app/src/components/posts/feed-infinite-list.tsx`, `app/src/components/posts/post-list-item-shell.tsx`를 단일 행 모델로 개편한다.
  - 기본 순서: 게시판 chip, 범위/동물 chip, 제목, 우측 작성자·날짜·간단한 engagement meta.
  - 본문 excerpt, 본문성 summary, 불필요한 운영 설명은 기본 목록에서 제거한다.
  - 분실·목격/거래 등 정책상 필요한 상태와 위치/가격 등 핵심 필드는 짧은 meta로만 유지한다.
  - desktop은 `display:flex; align-items:center`, mobile은 제목을 `min-width:0`·line clamp로 줄여 가로 overflow를 막는다.
  - hover/focus-visible, 링크 영역, screen reader label, 긴 제목/긴 게시판명 회귀를 함께 정의한다.
- [ ] 다음 화면이 동일 primitive를 사용하도록 적용한다.
  - `/`, `/feed/guest`, `/feed`
  - `/animals/all`, `/animals/dog`, `/animals/cat`, `/animals/:animalCode/:boardType`
  - `/boards/all`, `/boards/adoption`, `/boards/lost-found`, `/boards/hospital-reviews` 및 기존 공통 게시판 route
- [ ] 목록 테스트를 보강한다.
  - 제목은 렌더링되고 본문은 목록 행에 렌더링되지 않음
  - catalog 기반 동물/게시판 표시명과 범위 chip 유지
  - 운영 상태/정책 필드가 필요한 게시판에서만 compact meta로 표시
  - keyboard focus와 긴 제목/빈 목록/로딩 상태가 깨지지 않음

### Phase 3 — 반응형·브라우저 회귀·품질 게이트

- [ ] 인앱 브라우저에서 Spring Boot `http://localhost:5173/?view=all`과 TownPet 화면을 같은 viewport로 비교한다.
  - desktop 1280×900: header, hero, toolbar, 목록 행 높이·폭·우측 meta 정렬
  - mobile 390×844: header/menu, toolbar, chip/title wrapping, horizontal overflow, pagination
- [ ] 다음 TownPet route를 직접 확인한다.
  - `/`, `/feed/guest`, `/animals/all`, `/animals/dog`, `/animals/dog/questions`
  - `/boards/all`, `/boards/adoption`, `/boards/lost-found`, `/boards/hospital-reviews`, `/posts/:id`
  - 동물 게시판과 공통 게시판이 서로의 탭/글을 중복 표시하지 않는지 확인한다.
- [ ] 검증을 실행하고 실제 결과만 기록한다.
  - `pnpm -C app lint`
  - `pnpm -C app typecheck`
  - 관련 Vitest 및 `pnpm -C app test`
  - 관련 Playwright smoke/e2e
  - `pnpm -C app build`
  - migration/schema 변경이 없더라도 변경 범위에 맞는 문서 index check를 확인한다.
- [ ] 화면 회귀와 테스트가 통과하면 기능 단위 커밋 후 main push/deploy와 production 화면을 재확인한다.

## Backlog

- 보호자-제보자 비공개 대화와 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다. 분실·목격 상태 변경과 상태 이력은 구현했다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
- 실제 트래픽이 증가하면 search context fan-out을 sampled batch aggregation으로 전환한다.
