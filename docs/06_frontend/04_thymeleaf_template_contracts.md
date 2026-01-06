# TownPet SSR Frontend Contracts: Templates / Fragment IO / HTMX Swap Rules
- File: docs/06_frontend/04_thymeleaf_template_contracts.md
- Version: v0.1 (2026-01-06)
- Scope:
  1) Thymeleaf 템플릿 파일 목록(실제 파일명)
  2) Fragment 계약(입력 파라미터 / 반환 HTML 구조)
  3) 페이지별 HTMX target/swap 규칙(표준화)

---

## 0) 전역 규칙(반드시 고정)

### 0.1 라우트 규칙
- `/p/**` : Full Page (layout 포함)
- `/f/**` : Fragment only (layout 없음, HTMX swap 전용)
- `/api/**`: JSON only (지도/업로드/push 등 특수 기능)

### 0.2 DOM Slot(공통 id) — 이 규칙이 유지보수 비용을 결정
모든 페이지는 아래 Slot id를 “항상 포함”한다.
- `#app` : 페이지 본문 래퍼
- `#toast-slot` : 토스트 표시 영역
- `#modal-slot` : 모달 표시 영역
- `#topbar` : 상단 바(동네, 검색)
- `#page-title` : 페이지 타이틀
- `#content` : 주 콘텐츠(리스트/상세)
- `#list` : 리스트 컨테이너(피드/검색/게시물)
- `#loader` : 무한스크롤 로더(끝이면 제거되거나 empty fragment로 교체)

### 0.3 Cursor 표준(서버-프론트 계약)
- 모든 리스트 fragment 응답에는 `nextCursor`(문자열 1개) 또는
  `nextCursorCreatedAt` + `nextCursorId`를 포함해야 한다.
- nextCursor가 없으면(=끝) 서버는 `fragments/ui/end_of_list.html`을 반환한다.

### 0.4 Fragment 반환 규칙(중요)
- fragment는 “교체될 DOM의 루트 element”를 반드시 포함한다.
- 교체되는 루트 element에는 **항상 id가 있어야** 한다.
- 예: 댓글 영역 교체 시 응답 루트는 반드시 `<div id="comments">...</div>`

---

## 1) Thymeleaf 템플릿 파일 목록(실제 파일명)

### 1.1 Layout
- `templates/layout/base.html`
- `templates/layout/auth_base.html`
- `templates/layout/admin_base.html` (선택: 관리자 레이아웃 분리)

### 1.2 Public / Auth Pages
- `templates/pages/public/home.html`            (GET /p)
- `templates/pages/public/about.html`           (GET /p/about)
- `templates/pages/public/terms.html`           (GET /p/terms)
- `templates/pages/public/privacy.html`         (GET /p/privacy)

- `templates/pages/auth/login.html`             (GET /p/auth/login)
- `templates/pages/auth/oauth_callback.html`    (GET /p/auth/oauth/{provider}/callback) (필요 시)

### 1.3 Neighborhood Pages
- `templates/pages/neighborhood/select.html`    (GET /p/neighborhood/select)
- `templates/pages/neighborhood/manage.html`    (GET /p/neighborhood/manage)

### 1.4 Local Pages
- `templates/pages/local/feed.html`             (GET /p/local/feed)
- `templates/pages/local/hospitals_list.html`   (GET /p/local/hospitals)
- `templates/pages/local/hospitals_detail.html` (GET /p/local/hospitals/{id})
- `templates/pages/local/hospitals_new.html`    (GET /p/local/hospitals/new)
- `templates/pages/local/hospitals_edit.html`   (GET /p/local/hospitals/{id}/edit)

- `templates/pages/local/places_list.html`
- `templates/pages/local/places_detail.html`
- `templates/pages/local/places_new.html`
- `templates/pages/local/places_edit.html`

- `templates/pages/local/walk_routes_list.html`
- `templates/pages/local/walk_routes_detail.html`
- `templates/pages/local/walk_routes_new.html`

- `templates/pages/local/market_list.html`
- `templates/pages/local/market_detail.html`
- `templates/pages/local/market_new.html`
- `templates/pages/local/market_edit.html`

- `templates/pages/local/jobs_list.html`
- `templates/pages/local/jobs_detail.html`
- `templates/pages/local/jobs_new.html`
- `templates/pages/local/jobs_edit.html`        (선택)

- `templates/pages/local/lost_found_list.html`
- `templates/pages/local/lost_found_detail.html`
- `templates/pages/local/lost_found_new.html`

- `templates/pages/local/meetups_list.html`     (선택/Phase2)
- `templates/pages/local/meetups_detail.html`
- `templates/pages/local/meetups_new.html`

- `templates/pages/local/sitter_list.html`      (선택/Phase2)
- `templates/pages/local/sitter_detail.html`
- `templates/pages/local/sitter_new.html`

### 1.5 Local Map Pages (JS 격리)
- `templates/pages/local/map.html`              (GET /p/local/map)
- `templates/pages/local/map_draw_walk_route.html` (GET /p/local/map/walk-routes/draw)

### 1.6 Global Pages
- `templates/pages/global/hub.html`             (GET /p/global)
- `templates/pages/global/breed_topic.html`     (GET /p/global/breeds/{breedSlug})
- `templates/pages/global/qna_list.html`        (GET /p/global/qna)
- `templates/pages/global/qna_detail.html`      (GET /p/global/qna/{id})
- `templates/pages/global/qna_ask.html`         (GET /p/global/qna/ask)
- `templates/pages/global/foods_list.html`      (GET /p/global/foods)
- `templates/pages/global/food_detail.html`     (GET /p/global/foods/{itemId})
- `templates/pages/global/guides_list.html`     (GET /p/global/guides)
- `templates/pages/global/guide_detail.html`    (GET /p/global/guides/{id})

### 1.7 Search / Me / Admin Pages
- `templates/pages/search/search.html`          (GET /p/search)

- `templates/pages/me/home.html`                (GET /p/me)
- `templates/pages/me/profile.html`             (GET /p/me/profile)
- `templates/pages/me/settings.html`            (GET /p/me/settings)
- `templates/pages/me/posts.html`               (GET /p/me/posts)
- `templates/pages/me/blocks.html`              (GET /p/me/blocks)
- `templates/pages/me/notifications.html`       (GET /p/me/notifications)

- `templates/pages/admin/home.html`             (GET /p/admin)
- `templates/pages/admin/reports.html`          (GET /p/admin/reports)
- `templates/pages/admin/audit.html`            (GET /p/admin/audit)

### 1.8 Fragments (부분 UI)
#### UI primitives
- `templates/fragments/ui/toast.html`
- `templates/fragments/ui/modal.html`
- `templates/fragments/ui/confirm.html`
- `templates/fragments/ui/end_of_list.html`
- `templates/fragments/ui/inline_errors.html`
- `templates/fragments/ui/loading_spinner.html`
- `templates/fragments/ui/empty_state.html`

#### Post card / list / detail
- `templates/fragments/post/card.html`
- `templates/fragments/post/list_append.html`
- `templates/fragments/post/detail_body.html`
- `templates/fragments/post/reactions.html`
- `templates/fragments/post/media_grid.html`

#### Comments
- `templates/fragments/comment/thread.html`
- `templates/fragments/comment/list_append.html`
- `templates/fragments/comment/item.html`
- `templates/fragments/comment/form.html`

#### Local domain fragments
- `templates/fragments/local/hospitals/list_append.html`
- `templates/fragments/local/hospitals/card.html`
- `templates/fragments/local/places/list_append.html`
- `templates/fragments/local/places/card.html`
- `templates/fragments/local/walk_routes/list_append.html`
- `templates/fragments/local/walk_routes/card.html`
- `templates/fragments/local/market/list_append.html`
- `templates/fragments/local/market/card.html`
- `templates/fragments/local/jobs/list_append.html`
- `templates/fragments/local/jobs/card.html`
- `templates/fragments/local/lost_found/list_append.html`
- `templates/fragments/local/lost_found/card.html`

#### Global fragments
- `templates/fragments/global/breeds/list_append.html`
- `templates/fragments/global/qna/list_append.html`
- `templates/fragments/global/foods/list_append.html`
- `templates/fragments/global/guides/list_append.html`

#### Admin fragments
- `templates/fragments/admin/reports/list_append.html`
- `templates/fragments/admin/audit/list_append.html`

#### Neighborhood fragments
- `templates/fragments/neighborhood/search_results.html`
- `templates/fragments/neighborhood/my_list.html`
- `templates/fragments/neighborhood/topbar_badge.html`

---

## 2) Fragment 계약(입력 파라미터 / 반환 HTML 구조)

> 표기 규칙:
> - Route: `/f/...`
> - Params: query/path/form
> - Target: 기본 교체 대상 DOM id
> - Swap: 기본 swap 방식
> - Return root: fragment가 반드시 포함해야 하는 루트 element (id 필수)

---

### 2.1 UI: Toast
- Route: `GET /f/ui/toast`
- Params:
  - `level` (info|success|warning|error)
  - `message` (string)
  - `traceId` (optional)
- Target: `#toast-slot`
- Swap: `innerHTML`
- Return root:
  - `<div id="toast-slot"> ...toast items... </div>`
- Notes:
  - 서버 에러(500) 시 traceId 포함

---

### 2.2 UI: Modal (generic)
- Route: `GET /f/ui/modal`
- Params:
  - `title`, `bodyHtmlFragmentName`(서버에서 안전하게 제한), `okLabel`, `cancelLabel`
- Target: `#modal-slot`
- Swap: `innerHTML`
- Return root:
  - `<div id="modal-slot"><div class="modal">...</div></div>`
- Notes:
  - 실제 내용은 서버에서 정해진 fragment만 include (XSS 방지)

---

### 2.3 Local Feed Items (통합 피드 무한 스크롤)
- Route: `GET /f/local/feed/items`
- Params:
  - `neighborhoodId` (uuid, required)
  - `type` (optional, postType)
  - `tag` (optional)
  - `cursor` (optional)
  - `limit` (default 20)
- Target: `#list`
- Swap: `beforeend`
- Return root:
  - **append용**으로 아래 중 하나를 반환
    1) `<div class="append-block" data-next-cursor="..."> ...<article class="post-card">...</article>...</div>`
       - 필수: `data-next-cursor` 또는 내부 hidden input으로 nextCursor 전달
    2) `<div id="loader">` 자리를 교체하는 `fragments/ui/end_of_list.html`
- Required HTML inside:
  - 각 카드: `<article id="post-{postId}" class="post-card">...</article>`
  - 카드 내부 반응영역: `<div id="reactions-{postId}">...</div>`
- Notes:
  - 카드 자체는 `fragments/post/card.html` 재사용

---

### 2.4 Domain List Append (Hospitals/Places/Market/Jobs/LostFound 등)
공통 규격(도메인만 다름)

#### Example: Hospitals
- Route: `GET /f/local/hospitals/items`
- Params:
  - `neighborhoodId` required
  - filters: `treatment`, `maxCost`, `maxWait`
  - `cursor`, `limit`
- Target: `#list`
- Swap: `beforeend`
- Return root:
  - `<div class="append-block" data-next-cursor="..."> ... </div>` 또는 `end_of_list`
- Required HTML inside:
  - 카드: `<article id="post-{postId}" class="post-card hospital">...</article>`
  - 카드 하위: `#reactions-{postId}`, `#post-meta-{postId}` (선택)

---

### 2.5 Post Reactions (LIKE/SAVE)
- Route:
  - `POST   /f/posts/{postId}/reactions/{reaction}`
  - `DELETE /f/posts/{postId}/reactions/{reaction}`
- Params:
  - path: `postId`, `reaction` (LIKE|SAVE)
- Target: `#reactions-{postId}`
- Swap: `outerHTML` (반응영역 자체 교체)
- Return root:
  - `<div id="reactions-{postId}"> ...buttons... </div>`
- Notes:
  - 서버가 “내가 이미 눌렀는지”를 확정 렌더

---

### 2.6 Comments Thread
- Route: `GET /f/posts/{postId}/comments`
- Params:
  - `cursor` optional, `limit` default 50
- Target: `#comments`
- Swap: `innerHTML` (초기 로딩) / `beforeend` (추가 로딩은 별도 route 권장)
- Return root:
  - `<div id="comments"> ...thread... </div>`
- Required HTML:
  - 입력폼 컨테이너: `<form id="comment-form-{postId}">...</form>`
  - 댓글 item: `<div id="comment-{commentId}" class="comment-item">...</div>`
  - 더보기 로더: `<div id="comments-loader">...</div>`

#### 추가 로딩 전용(권장)
- Route: `GET /f/posts/{postId}/comments/items`
- Target: `#comments-list`
- Swap: `beforeend`
- Return root:
  - `<div class="append-comments" data-next-cursor="...">...</div>` 또는 `end_of_list`

---

### 2.7 Comment Create
- Route: `POST /f/posts/{postId}/comments`
- Params:
  - form: `body`, optional `parentId`
- Target: `#comments` (또는 `#comment-form-{postId}` 아래 `#comment-errors`)
- Swap:
  - success: `innerHTML` (thread 전체 재렌더) 또는 `afterbegin` (새 댓글 prepend)
  - failure: `innerHTML` (inline_errors만 교체)
- Return root (권장: thread 재렌더):
  - `<div id="comments"> ...updated thread... </div>`

---

### 2.8 Report Create (신고)
- Route: `POST /f/reports`
- Params:
  - form/json: `targetType`(POST|COMMENT|USER), `targetId`, `reasonCode`, `detail`
- Target: 기본 `#toast-slot`
- Swap: `innerHTML`
- Return root:
  - (A) 토스트 성공/실패 UI
  - (B) 정책상 AUTO_HIDDEN이 발생한 경우:
    - `fragments/post/card.html`을 반환하여 해당 카드 `#post-{id}`를 `outerHTML`로 교체하도록 설계 가능
- Notes:
  - “신고 성공”과 “숨김 처리됨”을 UX에서 구분(문구 다르게)

---

### 2.9 Admin Reports List Append
- Route: `GET /f/admin/reports/items`
- Params:
  - `status` required, `cursor`, `limit`
- Target: `#list`
- Swap: `beforeend`
- Return root:
  - `<div class="append-block" data-next-cursor="...">...</div>` 또는 `end_of_list`
- Required HTML:
  - `<div class="report-row" id="report-{id}">...</div>`

---

### 2.10 Neighborhood Search Results
- Route: `GET /f/neighborhood/search?query=...`
- Target: `#neighborhood-search-results`
- Swap: `innerHTML`
- Return root:
  - `<div id="neighborhood-search-results"> ...items... </div>`
- Required HTML:
  - 각 항목은 “선택” 버튼 포함, 선택 시 `/f/neighborhood/me` POST 트리거

---

## 3) 페이지별 HTMX target/swap 규칙(표준)

> 표기:
> - Page route: `/p/...`
> - Initial SSR: 서버가 처음 렌더하는 영역
> - HTMX actions: 페이지에서 발생하는 대표 HTMX 동작
> - Target/Swap: 필수 규칙
> - Required DOM ids: 해당 페이지에 반드시 존재해야 하는 id

---

## 3.1 `/p/local/feed` (동네 통합 피드)
### Initial SSR
- `#list`에 첫 20개 카드 SSR 렌더
- `#loader`에 HTMX “revealed” 트리거 로더 삽입

### HTMX actions
1) 무한 스크롤
- Request: `GET /f/local/feed/items?...&cursor=...`
- Target: `#list`
- Swap: `beforeend`
- Loader: `#loader`는 리스트 하단에 유지, end_of_list면 제거/교체

2) 좋아요/저장
- Request: `POST/DELETE /f/posts/{id}/reactions/{reaction}`
- Target: `#reactions-{id}`
- Swap: `outerHTML`

3) 댓글 로딩(상세 페이지로 이동 전 “미리보기”를 한다면)
- optional

### Required DOM ids
- `#list`, `#loader`, `#toast-slot`, `#modal-slot`

---

## 3.2 `/p/local/hospitals`
### Initial SSR
- 필터 폼 SSR
- `#list` SSR + `#loader` 삽입

### HTMX actions
1) 필터 적용(페이지 전체 reload 대신 fragment 갱신)
- Request: `GET /f/local/hospitals/items?...` (cursor 없음으로 초기화)
- Target: `#list`
- Swap: `innerHTML` (필터 변경 시 리스트 리셋)
- Then: 새 `#loader`가 다시 revealed로 append 호출

2) 무한 스크롤(추가 로딩)
- Request: 동일 endpoint + cursor
- Target: `#list`
- Swap: `beforeend`

3) 카드 단일 갱신(신고로 hidden 처리/상태 변경)
- Request: `GET /f/local/hospitals/card/{postId}`
- Target: `#post-{postId}`
- Swap: `outerHTML`

---

## 3.3 `/p/local/hospitals/{id}` (상세)
### Initial SSR
- 본문/메타/미디어 SSR
- 댓글 영역 `#comments`는 SSR 또는 HTMX로 초기 로딩

### HTMX actions
1) 댓글 초기 로딩(선택)
- Request: `GET /f/posts/{id}/comments`
- Target: `#comments`
- Swap: `innerHTML`

2) 댓글 작성
- Request: `POST /f/posts/{id}/comments`
- Target: `#comments`
- Swap: `innerHTML` (권장: thread 재렌더)

3) 반응 버튼
- Target: `#reactions-{id}`
- Swap: `outerHTML`

---

## 3.4 `/p/local/market`
- 리스트 규칙은 hospitals와 동일
- 필터 변경 시 `#list`는 `innerHTML`로 리셋
- 추가 로딩은 `beforeend`

---

## 3.5 `/p/local/jobs`
- 리스트 규칙 동일
- 상세(`/p/local/jobs/{id}`)에서 “지원” 버튼:
  - Request: `POST /f/local/jobs/{id}/apply` (또는 `/f/jobs/{id}/applications`)
  - Target: `#job-apply-panel` (상세 페이지에 반드시 존재)
  - Swap: `outerHTML` 또는 `innerHTML` (상태 패널 교체)

---

## 3.6 `/p/local/lost-found`
- 리스트 규칙 동일
- 신고 생성 후 AUTO_HIDDEN이면 해당 카드 교체(`outerHTML`)
- 푸시는 Phase2 이후(문서 02_pwa_push.md)

---

## 3.7 `/p/search`
### Initial SSR
- 검색 폼 SSR
- `#list`는 비어있거나 초기 결과 SSR
- `#loader`는 쿼리가 있을 때만 표시

### HTMX actions
1) 검색 실행(엔터/버튼)
- Request: `GET /f/search/items?q=...&scope=...&cursor=...`
- Target: `#list`
- Swap: `innerHTML` (검색 새 실행은 리셋)

2) 무한 스크롤
- Request: 동일 endpoint + cursor
- Target: `#list`
- Swap: `beforeend`

---

## 3.8 `/p/me/notifications`
### Initial SSR
- 알림 리스트 SSR + `#loader`

### HTMX actions
1) 더 불러오기
- Request: `GET /f/me/notifications/items?cursor=...`
- Target: `#list`
- Swap: `beforeend`

2) 읽음 처리
- Request: `PATCH /f/me/notifications/{id}/read`
- Target: `#notification-{id}`
- Swap: `outerHTML` (행 단위 갱신)

---

## 3.9 `/p/admin/reports`
- 리스트/무한스크롤 규칙 동일
- 액션(숨김/복원):
  - Request: `POST /f/admin/actions/hide-post/{postId}`
  - Target: `#post-{postId}` 또는 `#report-{reportId}` (선택)
  - Swap: `outerHTML`

---

## 4) 페이지 템플릿에 반드시 포함해야 할 HTMX 공통 스크립트(명세)
> “파일명 목록”과 별개로, base layout이 반드시 제공해야 하는 기능 명세

### 4.1 CSRF 자동 주입(세션+CSRF ON 기준)
- base.html에 `_csrf`, `_csrf_header` meta 포함
- `htmx:configRequest` 이벤트에서 헤더 자동 주입

### 4.2 표준 로더/끝 처리
- list append fragment는 반드시 nextCursor를 제공
- nextCursor 없으면 `end_of_list` fragment를 반환하고 `#loader` 제거/교체

### 4.3 표준 토스트 트리거
- 서버는 필요 시 `HX-Trigger`로 `toast` 이벤트를 보내고,
- 프론트는 해당 이벤트를 받아 `/f/ui/toast`를 로드하거나 즉시 표시

---

## 5) 최소 구현 체크리스트(Phase 1)
- [ ] base layout에 `#toast-slot`, `#modal-slot` 포함
- [ ] `/p/local/feed` + `/f/local/feed/items` 작동(무한스크롤)
- [ ] 반응 `/f/posts/{id}/reactions/{reaction}` 작동
- [ ] 댓글 `/f/posts/{id}/comments` + 작성 작동
- [ ] 신고 `/f/reports` + AUTO_HIDDEN 시 카드 교체
- [ ] search `/p/search` + `/f/search/items` 작동
- [ ] admin reports `/p/admin/reports` 최소 리스트 + hide/restore

---