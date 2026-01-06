# TownPet Frontend Blueprint (SSR): Thymeleaf + HTMX (+ minimal JS)
- File: docs/06_frontend/00_thymeleaf_htmx_blueprint.md
- Version: v0.1
- Target: JS/React 경험이 얕은 1인 백엔드 개발자가 “미니멀하게 완성” 가능한 구조
- Principle: 대부분은 SSR + HTML fragment 교체(HTMX), 지도/특수 UI만 최소 JS로 강화

---

## 0) 스택 결정 (최종)
### Core
- Spring Boot MVC + Thymeleaf (SSR)
- HTMX (부분 갱신 / 무한스크롤 / 폼 제출 / 모달)
- Tailwind CSS (MVP는 CDN 시작 가능 → 성장 시 빌드로 전환)

### Optional (필요할 때만)
- Alpine.js: 모달 open/close, 드롭다운 등 “아주 작은 UI 상태”에만 제한 사용
- 지도 SDK (카카오/네이버): 산책로/장소 기능은 별도 JS 화면으로 분리

---

## 1) 렌더링/라우팅 규칙 (가장 중요)
HTMX 프로젝트가 망하는 패턴은 “페이지와 fragment가 섞이는 것”이다.
그래서 규칙을 강제로 고정한다.

### 1.1 페이지 라우트 vs Fragment 라우트 분리
- `/p/**` : 전체 페이지(Full Page) 반환
- `/f/**` : HTML 조각(Fragment)만 반환 (layout 없음)
- `/api/**` : JSON API (가능한 최소화; SSR/HTMX에서는 HTML 응답을 우선)

> 원칙: HTMX는 서버에 “HTML”을 요구한다. JSON은 지도/특수 UI에서만 사용.

### 1.2 View Template 디렉토리 구조(권장)
src/main/resources/templates/
layout/
base.html                 # 공통 레이아웃(헤더/푸터/OG)
auth_base.html            # 로그인/콜백 전용
pages/                      # /p/** 에 대응
home.html
local/
feed.html
hospitals.html
walk_routes.html
places.html
market.html
jobs.html
lost_found.html
global/
hub.html
qna.html
foods.html
guides.html
me/
profile.html
settings.html
notifications.html
admin/
reports.html
audit.html
fragments/                  # /f/** 에 대응
post/
card.html               # 게시물 카드 1개
list.html               # 카드 리스트
detail.html             # 상세 본문
editor.html             # 작성/수정 폼
comment/
thread.html
item.html
form.html
ui/
toast.html
modal.html
empty.html
pagination_cursor.html

### 1.3 컨트롤러 패키지 구조(권장)
web/
page/   # /p/**
frag/   # /f/**
api/    # /api/** (최소)

---

## 2) Local/Global UI 구조 (페이지 단위)
### 2.1 Local (동네 기반)
- `/p/local/feed` : 동네 피드 (무한 스크롤)
- `/p/local/hospitals` : 병원 템플릿 리뷰 리스트 + 필터
- `/p/local/walk-routes` : 산책로 리스트
- `/p/local/places` : 동반 가능 장소 리스트
- `/p/local/market` : 중고/대여/나눔 리스트
- `/p/local/jobs` : 구인구직
- `/p/local/lost-found` : 실종/유기 신고 리스트(시간/거리 필터)

### 2.2 Global (지역 무관)
- `/p/global/qna` : Q&A 리스트/검색/정렬
- `/p/global/foods` : 사료/용품 DB (필터 중심)
- `/p/global/guides` : 전문가 가이드(SEO)

---

## 3) HTMX 적용 패턴 (TownPet 핵심 기능별)
### 3.1 무한 스크롤(피드/리스트) — Cursor Pagination
- 첫 페이지는 `/p/...`에서 SSR로 렌더
- 추가 로딩은 `/f/...`로 fragment 요청

#### 예: 동네 피드
- 페이지: `GET /p/local/feed?neighborhoodId=...`
  - 템플릿: `pages/local/feed.html`
  - 내부에 “로더(div)”를 두고, 스크롤 진입 시 다음 fragment를 요청

- fragment: `GET /f/local/feed/items?neighborhoodId=...&cursor=...&limit=20`
  - 반환: `fragments/post/list.html` (post cards 묶음 + nextCursor hidden)

#### HTMX 예시(개념)
- `hx-get="/f/local/feed/items?...&cursor=${nextCursor}"`
- `hx-trigger="revealed"` (로더가 보이면 자동 호출)
- `hx-swap="beforeend"` (리스트 끝에 추가)

> 서버 응답에 반드시 `nextCursor`를 포함하고, 없으면 더 이상 로딩하지 않도록 “끝(fragment/ui/empty)”를 반환.

---

### 3.2 댓글 스레드(부분 갱신)
- 페이지: `GET /p/posts/{id}` (상세 SSR)
- fragment:
  - `GET /f/posts/{id}/comments?cursor=...`
  - `POST /f/posts/{id}/comments` (댓글 작성 후 thread fragment 재렌더)

원칙:
- 댓글 작성 성공 시 “댓글 입력 폼 + 최신 댓글 N개” 영역만 교체한다.
- 실패 시 “에러 fragment(toast/inline)”를 해당 영역에만 표시한다.

---

### 3.3 좋아요/저장(반응) — 서버가 HTML로 버튼만 갱신
- `POST /f/posts/{id}/reactions/like`
- `DELETE /f/posts/{id}/reactions/like`

응답:
- `fragments/post/card.html`의 “반응 버튼 영역만” 반환
- `hx-target="#post-${id}-reactions"`로 해당 영역만 교체

장점:
- 클라 상태 관리가 필요 없다.
- 서버가 “내가 좋아요 눌렀는지 여부”를 확정하여 렌더한다.

---

### 3.4 신고/자동 블라인드(Moderation)
- 신고 버튼 클릭 → `POST /f/reports` (targetType/targetId/reason)
- 서버가 정책 조건 충족 시:
  - 해당 post status를 HIDDEN으로 전환
  - 응답으로 “숨김 처리 UI(fragment)” 반환 (또는 카드 제거)

권장 UI:
- 즉시 카드가 “숨김 처리됨”으로 바뀌고,
- 관리자 큐(`/p/admin/reports`)에서 검토 가능.

---

### 3.5 작성/수정 폼(템플릿 기반 리뷰)
- 작성 페이지: `GET /p/editor?type=HOSPITAL_REVIEW`
  - SSR로 폼 전체 렌더
- 제출: `POST /p/editor` 또는 `POST /f/posts` (선호: 페이지 제출 후 redirect)
  - “폼 제출은 전체 페이지 redirect”가 초기엔 운영이 더 쉽다.
  - 단, “영수증 업로드/미리보기”만 HTMX로 부분 갱신 가능

---

## 4) 지도/산책로 화면은 “독립 JS 화면”으로 격리
HTMX로 지도까지 해결하려고 하면 복잡도가 급증한다.
지도는 “한 페이지에 한 번만 JS를 크게 쓰는 방식”이 가장 낫다.

### 4.1 지도 페이지 설계
- `/p/local/map`
  - SSR로 기본 shell + 필터 UI + 지도 컨테이너 렌더
  - JS에서만 지도 SDK 로딩 및 마커/라인 렌더링
- 데이터 로딩은 JSON API 허용:
  - `GET /api/v1/map/walk-routes?bbox=...`
  - `GET /api/v1/map/places?bbox=...`
  - (MVP) 인증 필요 없으면 public 가능, 필요하면 세션 기반 인증 확인

### 4.2 산책로 “그리기”는 2단계
- 1) 지도에서 경로 좌표 생성(클라)
- 2) 서버로 `POST /api/v1/walk-routes` (geojson jsonb 포함)
- 3) 생성 후 상세 페이지로 redirect

---

## 5) 파일 업로드(이미지/영수증) — Presigned Upload 표준
SSR/HTMX 프로젝트에서 이미지 업로드가 병목이 되기 쉽다.
백엔드는 presign만 발급하고, 브라우저가 직접 업로드한다.

### 5.1 흐름
1) `POST /api/v1/files/presign` (contentType, filename, objectType)
2) 브라우저가 `uploadUrl`로 PUT 업로드
3) 성공하면 `publicUrl`을 hidden input에 넣고
4) 게시물 저장 시 `post_media`로 묶어서 저장

### 5.2 HTMX 연계
- 업로드 성공 후, “미리보기 fragment”를 교체하는 정도만 HTMX로 처리
- 업로드 자체는 JS로 처리(최소 코드)

---

## 6) 인증/보안 (SSR 최적)
### 6.1 권장: 세션 기반 로그인(+OAuth) + CSRF 활성화
SSR/Thymeleaf와 가장 궁합이 좋고 운영이 단순하다.

- Spring Security:
  - OAuth2 Login(카카오/구글)
  - 세션 쿠키 (HttpOnly, Secure)
  - CSRF ON (기본 유지)

### 6.2 HTMX에서 CSRF 처리
- 모든 POST/PUT/DELETE 요청에 CSRF 헤더 필요
- 방법 A(권장): base layout에 meta 태그로 주입
  - `<meta name="_csrf" content="...">`
  - `<meta name="_csrf_header" content="...">`
- htmx 전역 이벤트로 헤더 자동 삽입
  - `document.body.addEventListener('htmx:configRequest', (e) => { ... })`

### 6.3 XSS 방어
- 사용자 입력은 기본적으로 Thymeleaf escaping 유지
- “마크다운 허용” 같은 요구는 MVP에서 금지(나중에 Sanitizer 도입)

### 6.4 권한(Policy) 포인트
- 신규 계정/미인증 동네는:
  - 마켓 등록 제한
  - 실종/유기 알림 제한
  - 구인 등록 제한
- 이는 “백엔드 정책”으로 강제하고, UI는 보조적으로만 숨긴다.

---

## 7) 에러 처리/UX 규칙(HTMX 품질의 핵심)
### 7.1 표준 에러 전략
- 페이지 요청(`/p/**`) 실패: 에러 페이지 렌더 (403/404/500)
- fragment 요청(`/f/**`) 실패:
  - 401/403이면 로그인 모달 fragment 반환 OR toast fragment 반환
  - 422(Validation)면 폼 아래에 inline error fragment 반환
  - 500이면 toast fragment + traceId 노출

### 7.2 서버 응답 헤더/규약(권장)
- traceId를 항상 응답 헤더에 포함(관측성)
- HTMX 요청에는:
  - `HX-Redirect` (성공 후 이동 필요 시)
  - `HX-Trigger` (클라에서 toast/analytics 트리거)

---

## 8) “학생 프로젝트”로 보이지 않게 만드는 체크리스트
프론트 스택이 아니라 “운영 가능한 설계”가 핵심이다.

- [ ] cursor pagination + 인덱스 설계(피드/검색)
- [ ] 신고→자동 블라인드→관리자 큐 + audit log
- [ ] rate limit / 스팸 억제(특히 마켓/구인/실종)
- [ ] presigned upload(백엔드 부하 절감)
- [ ] CI/CD + Flyway 마이그레이션 + 롤백 고려
- [ ] 에러 핸들링(HTMX fragment 레벨) + traceId

---

## 9) 구현 순서(현실적인 MVP)
### Phase 1 (2~4주 목표)
1) SSR 페이지 골격 + Tailwind(간단)
2) Local 병원/장소 템플릿 리뷰 CRUD
3) Local 피드 cursor 무한 스크롤(HTMX)
4) 댓글 + 좋아요/저장(HTMX)
5) 신고 + 자동 블라인드(운영 큐는 간단 리스트)

### Phase 2
6) 마켓(중고/대여/나눔)
7) 구인구직 + 지원
8) 실종/유기 알림(게시+노출, 푸시는 후순위)

### Phase 3
9) 지도 페이지(JS 분리)
10) Global Q&A/DB (SEO 페이지 강화)

---

## 10) 결정 사항 기록(운영을 위해 문서에 고정)
- 페이지: `/p/**`, fragment: `/f/**`, JSON: `/api/**`
- 인증: 세션 + CSRF ON
- HTMX는 HTML만 주고받는다(가능한 JSON 회피)
- 지도/그리기 화면은 JS로 격리한다