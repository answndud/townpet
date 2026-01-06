# TownPet Route Catalog (SSR + HTMX): Pages / Fragments / JSON APIs
- File: docs/06_frontend/01_route_catalog_ssr_htmx.md
- Version: v0.1 (2026-01-06)
- Conventions:
  - `/p/**`  : Full Page (Thymeleaf layout 포함)
  - `/f/**`  : Fragment only (layout 없음, HTMX swap 대상)
  - `/api/**`: JSON only (지도/특수 UI, presign upload, 일부 비동기 전용)
- Cursor convention:
  - 리스트 응답은 `nextCursorCreatedAt`, `nextCursorId`(또는 하나의 `cursor` 문자열) 중 하나로 통일
  - 정렬 기본: `created_at DESC, id DESC`

---

## 0) 공통 UI/동작 규칙

### 0.1 HTMX 요청 헤더/타겟 규칙
- 모든 HTMX 요청은 `HX-Request: true`를 포함
- fragment 응답은 “교체할 최소 DOM 단위”만 반환
- 표준 타겟 id 규칙:
  - 리스트 컨테이너: `#list`
  - 리스트 로더: `#loader`
  - 토스트 영역: `#toast-slot`
  - 모달 슬롯: `#modal-slot`
  - 댓글 영역: `#comments`
  - 반응 버튼 영역: `#reactions-{postId}`

### 0.2 에러 응답 규칙(권장)
- `/p/**` 에러: 에러 페이지 렌더(403/404/500)
- `/f/**` 에러:
  - 401/403 → `f/ui/toast` 또는 `HX-Redirect: /p/auth/login`
  - 422(validation) → `f/ui/form_errors`(inline)
  - 500 → `f/ui/toast`(traceId 포함)

---

## 1) Public / Auth / Shell

### 1.1 Pages
- `GET  /p`  
  - 랜딩(로그인 전), 또는 로그인 시 “Local feed”로 리다이렉트 가능
- `GET  /p/about`
- `GET  /p/terms`
- `GET  /p/privacy`

### 1.2 Auth Pages
- `GET  /p/auth/login`
- `GET  /p/auth/logout` (또는 POST로 처리)

### 1.3 Auth APIs (서버 세션/OAuth)
- `GET  /api/v1/auth/oauth/{provider}/start`  (redirect URL 반환 또는 즉시 redirect)
- `GET  /api/v1/auth/oauth/{provider}/callback`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`

---

## 2) Neighborhood (동네 설정)

### 2.1 Pages
- `GET  /p/neighborhood/select`  
  - 동네 검색/선택(초기 온보딩)
- `GET  /p/neighborhood/manage`  
  - 내 동네 목록/primary 설정

### 2.2 Fragments
- `GET  /f/neighborhood/search?query=...`  
  - 검색 결과 리스트 fragment
- `POST /f/neighborhood/me`  
  - 내 동네 추가(성공 시 내 목록 fragment 반환)
- `PATCH /f/neighborhood/me/primary?neighborhoodId=...`  
  - primary 변경 후 상단 바/상태 fragment 갱신

### 2.3 JSON APIs
- `GET  /api/v1/neighborhoods/search?query=...`
- `GET  /api/v1/neighborhoods/me`
- `POST /api/v1/neighborhoods/me`
- `PATCH /api/v1/neighborhoods/me/{neighborhoodId}`

---

## 3) Local: 동네 피드(통합)

### 3.1 Pages
- `GET /p/local/feed?neighborhoodId=...`  
  - 동네 통합 피드(병원/장소/산책/마켓/구인/실종 포함)
- `GET /p/local/feed/filter`  
  - 필터(타입/태그/기간) UI 전용(선택)

### 3.2 Fragments
- `GET /f/local/feed/items?neighborhoodId=...&type=...&tag=...&cursor=...&limit=20`  
  - 카드 목록 append용 fragment
- `GET /f/local/feed/pills?neighborhoodId=...&type=...&tag=...`  
  - 선택된 필터 pill 영역 갱신(선택)

### 3.3 JSON APIs (가급적 미사용, 필요 시만)
- `GET /api/v1/posts/feed/local?...`  (지도/앱 뷰 등 특수 화면에서만)

---

## 4) Local: 병원 템플릿 리뷰

### 4.1 Pages
- `GET  /p/local/hospitals`
- `GET  /p/local/hospitals/{postId}`
- `GET  /p/local/hospitals/new`
- `GET  /p/local/hospitals/{postId}/edit`

### 4.2 Fragments (리스트/필터/작성 편의)
- `GET  /f/local/hospitals/items?neighborhoodId=...&treatment=...&maxCost=...&maxWait=...&cursor=...&limit=20`
- `GET  /f/local/hospitals/card/{postId}`  
  - 카드 1개만 재렌더(좋아요/신고 후 상태 변경 등)
- `POST /f/local/hospitals`  
  - (선택) HTMX 폼 제출. 초기엔 페이지 POST+redirect 권장.
- `PATCH /f/local/hospitals/{postId}`  
  - (선택) HTMX 인라인 수정

### 4.3 JSON APIs
- `POST /api/v1/local/hospitals`
- `GET  /api/v1/local/hospitals`
- `GET  /api/v1/posts/{postId}`

---

## 5) Local: 동반 가능 장소(식당/카페/테라스)

### 5.1 Pages
- `GET  /p/local/places`
- `GET  /p/local/places/{postId}`
- `GET  /p/local/places/new`
- `GET  /p/local/places/{postId}/edit`

### 5.2 Fragments
- `GET  /f/local/places/items?neighborhoodId=...&category=...&petFriendly=...&cursor=...&limit=20`
- `GET  /f/local/places/card/{postId}`

### 5.3 JSON APIs
- `POST /api/v1/local/places`
- `GET  /api/v1/local/places`

---

## 6) Local: 산책로(리스트) + 지도(특수 화면)

### 6.1 Pages
- `GET  /p/local/walk-routes`
- `GET  /p/local/walk-routes/{postId}`
- `GET  /p/local/walk-routes/new`  
  - 텍스트 기반 등록(간단) 또는 “지도 그리기”로 이동 링크
- `GET  /p/local/map`  
  - 지도 통합 화면(산책로/장소/실종을 지도 위에 표시)
- `GET  /p/local/map/walk-routes/draw`  
  - 산책로 그리기 전용(클라이언트 JS)

### 6.2 Fragments
- `GET /f/local/walk-routes/items?neighborhoodId=...&difficulty=...&tag=...&cursor=...&limit=20`
- `GET /f/local/walk-routes/card/{postId}`

### 6.3 JSON APIs (지도 전용)
- `GET  /api/v1/map/walk-routes?bbox=...&neighborhoodId=...&tag=...`
- `GET  /api/v1/map/places?bbox=...&neighborhoodId=...&category=...`
- `POST /api/v1/local/walk-routes`  
  - geojson/jsonb 포함
- (선택) `GET /api/v1/local/walk-routes/{postId}`

---

## 7) Local: 산책 메이트 & 펫친소(번개)

> MVP에서는 “Meetup Post” + “참여”만 최소로. 참여를 만들려면 별도 테이블 필요.

### 7.1 Pages
- `GET  /p/local/meetups`
- `GET  /p/local/meetups/{postId}`
- `GET  /p/local/meetups/new`

### 7.2 Fragments
- `GET  /f/local/meetups/items?neighborhoodId=...&cursor=...&limit=20`
- `POST /f/local/meetups/{postId}/join`  
  - 참여(성공 시 참여 버튼 영역만 교체)
- `POST /f/local/meetups/{postId}/leave`

### 7.3 JSON APIs (선택)
- `POST /api/v1/local/meetups`
- `POST /api/v1/local/meetups/{postId}/join`

---

## 8) Local: 마켓(중고/대여/나눔)

### 8.1 Pages
- `GET  /p/local/market`
- `GET  /p/local/market/{postId}`
- `GET  /p/local/market/new`
- `GET  /p/local/market/{postId}/edit`

### 8.2 Fragments
- `GET  /f/local/market/items?neighborhoodId=...&listingType=SALE|RENT|FREE_SHARE&minPrice=...&maxPrice=...&cursor=...&limit=20`
- `GET  /f/local/market/card/{postId}`
- `POST /f/local/market/{postId}/inquiries`  
  - 문의 생성(초기에는 댓글로 대체 가능)
- `GET  /f/local/market/{postId}/inquiries`  
  - 문의 리스트 fragment

### 8.3 JSON APIs
- `POST /api/v1/market/listings`
- `GET  /api/v1/market/listings`
- `GET  /api/v1/market/listings/{postId}`

---

## 9) Local: 심부름/긴급 돌봄(마이크로 펫시팅)

### 9.1 Pages
- `GET  /p/local/sitter`
- `GET  /p/local/sitter/{postId}`
- `GET  /p/local/sitter/new`

### 9.2 Fragments
- `GET  /f/local/sitter/items?neighborhoodId=...&requestType=...&cursor=...&limit=20`
- `POST /f/local/sitter/{postId}/offer`  
  - 지원/제안(간단 메시지)
- `GET  /f/local/sitter/{postId}/offers`  
  - 작성자만 제안 리스트 확인

### 9.3 JSON APIs (Phase2+)
- `POST /api/v1/local/sitter-requests`
- `POST /api/v1/local/sitter-requests/{postId}/offers`

---

## 10) Local: 실종/유기 신고 + 위치 기반 노출

### 10.1 Pages
- `GET  /p/local/lost-found`
- `GET  /p/local/lost-found/{postId}`
- `GET  /p/local/lost-found/new`

### 10.2 Fragments
- `GET /f/local/lost-found/items?neighborhoodId=...&alertType=LOST|FOUND|SHELTER&since=...&cursor=...&limit=20`
- `GET /f/local/lost-found/card/{postId}`
- `POST /f/local/lost-found/{postId}/share`  
  - 공유/확산 UI(선택)

### 10.3 JSON APIs (지도/푸시 연계)
- `POST /api/v1/local/lost-found`
- `GET  /api/v1/local/lost-found?bbox=...&since=...`
- (Phase+) `POST /api/v1/notifications/push/lost-found` (서버 내부 트리거로만 운용 권장)

---

## 11) Global: 품종 토픽 / Q&A / 사료·용품 DB / 가이드

### 11.1 Pages (SEO 대상)
- `GET /p/global` (허브)
- `GET /p/global/breeds/{breedSlug}`  
  - 토픽(게시판처럼)
- `GET /p/global/qna`
- `GET /p/global/qna/{postId}`
- `GET /p/global/qna/ask`
- `GET /p/global/foods`
- `GET /p/global/foods/{itemId}`
- `GET /p/global/guides`
- `GET /p/global/guides/{postId}`

### 11.2 Fragments
- `GET /f/global/breeds/{breedSlug}/items?cursor=...&limit=20`
- `GET /f/global/qna/items?sort=hot|new|unanswered&q=...&cursor=...&limit=20`
- `POST /f/global/qna` (질문 작성: 초기엔 page POST+redirect 권장)
- `GET /f/global/foods/items?allergy=...&ingredient=...&cursor=...&limit=20`
- `GET /f/global/guides/items?cursor=...&limit=20`

### 11.3 JSON APIs (선택: 사료 DB 필터가 복잡해지면)
- `GET /api/v1/global/qna/search?q=...`
- `GET /api/v1/global/foods/search?...`

---

## 12) Posts 공통: 상세/댓글/반응/신고 (전 타입 공용)

> “타입별 페이지”는 UX를 위해 분리하되, 내부적으로는 공통 Post Service를 사용.

### 12.1 Pages (공용 상세 - 선택)
- `GET /p/posts/{postId}`  
  - (옵션) 타입별 상세 페이지로 리다이렉트하거나, 공용 상세로 처리

### 12.2 Fragments (공용)
- `GET  /f/posts/{postId}/detail`  
  - 본문 fragment
- `GET  /f/posts/{postId}/comments?cursor=...&limit=50`
- `POST /f/posts/{postId}/comments`
- `DELETE /f/comments/{commentId}`
- `POST   /f/posts/{postId}/reactions/{reaction}` (LIKE, SAVE)
- `DELETE /f/posts/{postId}/reactions/{reaction}`
- `POST /f/reports`  
  - body: `targetType`, `targetId`, `reasonCode`, `detail`

### 12.3 JSON APIs
- `GET /api/v1/posts/{postId}`
- `GET /api/v1/posts/feed/local?...`
- `GET /api/v1/search?...`

---

## 13) Search (Local/Global 통합 검색)

### 13.1 Pages
- `GET /p/search?q=...&scope=local|global&type=...&neighborhoodId=...`

### 13.2 Fragments
- `GET /f/search/items?q=...&scope=...&type=...&neighborhoodId=...&cursor=...&limit=20`

### 13.3 JSON APIs
- `GET /api/v1/search?q=...&scope=...&type=...&neighborhoodId=...&cursor=...&limit=20`

---

## 14) My / Profile / Notifications

### 14.1 Pages
- `GET  /p/me`
- `GET  /p/me/profile`
- `GET  /p/me/settings`
- `GET  /p/me/posts`
- `GET  /p/me/blocks`
- `GET  /p/me/notifications`

### 14.2 Fragments
- `PATCH /f/me/profile`  
  - 닉네임/소개 수정(성공 시 프로필 카드 fragment 반환)
- `GET   /f/me/posts/items?cursor=...&limit=20`
- `POST  /f/me/blocks/{userId}`
- `DELETE /f/me/blocks/{userId}`
- `GET   /f/me/notifications/items?cursor=...&limit=20`
- `PATCH /f/me/notifications/{notificationId}/read`

### 14.3 JSON APIs
- `PATCH /api/v1/users/me`
- `GET   /api/v1/notifications`
- `POST  /api/v1/notifications/subscriptions`
- `DELETE /api/v1/notifications/subscriptions/{subscriptionId}`

---

## 15) Admin (모더레이션/감사 로그)

### 15.1 Pages
- `GET /p/admin`
- `GET /p/admin/reports?status=OPEN|AUTO_HIDDEN|RESOLVED|REJECTED`
- `GET /p/admin/audit`

### 15.2 Fragments
- `GET  /f/admin/reports/items?status=...&cursor=...&limit=50`
- `POST /f/admin/actions/hide-post/{postId}`
- `POST /f/admin/actions/restore-post/{postId}`
- `POST /f/admin/actions/suspend-user/{userId}`
- `GET  /f/admin/audit/items?cursor=...&limit=50`

### 15.3 JSON APIs
- `GET  /api/v1/admin/reports?status=...`
- `POST /api/v1/admin/actions/...`
- `GET  /api/v1/admin/audit`

---

## 16) Files (Presigned Upload)

### 16.1 JSON APIs (필수)
- `POST /api/v1/files/presign`
  - req: `contentType`, `filename`, `objectType=post_media|profile|receipt`
  - res: `uploadUrl`, `publicUrl`, `objectKey`, `expiresAt`

### 16.2 Fragments (선택: 업로드 미리보기)
- `POST /f/files/preview`
  - req: `publicUrl`, `mediaType`
  - res: `fragments/post/media_preview.html`

---

## 17) 최소 MVP 라우트 셋(1차 구현 범위 추천)
> “완성”을 위해 처음엔 라우트를 줄이는 게 맞다.

### Phase 1 (Local 템플릿 + 피드 + 댓글 + 신고)
- Pages:
  - `/p/local/feed`
  - `/p/local/hospitals`, `/p/local/hospitals/{id}`, `/p/local/hospitals/new`
  - `/p/local/places`, `/p/local/places/{id}`, `/p/local/places/new`
  - `/p/search`
  - `/p/me`, `/p/me/settings`
  - `/p/admin/reports` (간단 리스트만이라도)
- Fragments:
  - `/f/local/feed/items`
  - `/f/local/hospitals/items`, `/f/local/places/items`
  - `/f/posts/{id}/comments`, `/f/posts/{id}/reactions/{reaction}`
  - `/f/reports`
  - `/f/ui/toast`
- JSON:
  - `/api/v1/files/presign` (이미지/영수증 업로드가 필요하면)
  - `/api/v1/search` (원하면 fragment로도 대체 가능)

---

## 18) URL 네이밍 체크(실수 방지)
- “타입별 도메인”은 `/p/local/{domain}`로 고정  
  - hospitals / places / walk-routes / market / jobs / lost-found / meetups / sitter
- fragment는 동일 도메인 prefix 유지  
  - `/f/local/{domain}/items`, `/f/local/{domain}/card/{id}`
- 공용 기능(댓글/반응/신고)은 `/f/posts/**`, `/f/reports`로 통합
- 지도는 `/p/local/map` + `/api/v1/map/**`로 격리