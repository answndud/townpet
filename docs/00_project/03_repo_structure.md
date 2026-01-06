# 03. Repository Structure (Source Tree & Naming)
> 경로(권장): `docs/00_project/03_repo_structure.md`  
> 목적: TownPet 레포의 디렉터리/패키지/파일 네이밍을 고정해서, 혼자 개발해도 구조가 무너지지 않게 한다.  
> 전제: Spring Boot(Backend) + Thymeleaf(SSR) + HTMX/Alpine/Tailwind(CDN) + Flyway(PostgreSQL).

---

## 1) Top-level Directory Layout (권장)

```

townpet/
├─ docs/
├─ infra/
│  └─ local/
│     └─ docker-compose.yml
├─ src/
│  ├─ main/
│  │  ├─ java/
│  │  │  └─ com/townpet/
│  │  └─ resources/
│  │     ├─ application.yml
│  │     ├─ application-local.yml
│  │     ├─ application-prod.yml
│  │     ├─ db/
│  │     │  └─ migration/
│  │     │     ├─ V1__init_core_tables.sql
│  │     │     ├─ V2__init_local_core.sql
│  │     │     └─ ...
│  │     ├─ static/
│  │     │  ├─ css/
│  │     │  │  └─ app.css                # 선택: 커스텀 CSS(최소)
│  │     │  ├─ js/
│  │     │  │  └─ app.js                 # 선택: 공통 JS(최소, Alpine 사용 시 거의 없음)
│  │     │  └─ img/
│  │     └─ templates/
│  │        ├─ layout/
│  │        │  ├─ base.html              # 공통 레이아웃(헤더/푸터/토스트 루트)
│  │        │  └─ error.html             # 에러 페이지(선택)
│  │        ├─ fragments/
│  │        │  ├─ common/
│  │        │  │  ├─ toast.html          # toast fragment
│  │        │  │  ├─ pagination.html     # cursor "더보기" fragment(선택)
│  │        │  │  └─ empty_state.html    # empty 상태 fragment(선택)
│  │        │  ├─ places/
│  │        │  │  ├─ list.html           # places list fragment
│  │        │  │  └─ card.html           # place card fragment(선택)
│  │        │  ├─ market/
│  │        │  └─ jobs/
│  │        ├─ pages/
│  │        │  ├─ home.html
│  │        │  ├─ local/
│  │        │  │  ├─ places.html
│  │        │  │  ├─ walks.html
│  │        │  │  ├─ market.html
│  │        │  │  ├─ jobs.html
│  │        │  │  └─ missing.html
│  │        │  └─ global/
│  │        │     ├─ feed.html
│  │        │     ├─ breeds.html
│  │        │     └─ qa.html
│  └─ test/
│     └─ java/
├─ build.gradle
├─ settings.gradle
├─ .env.example
└─ README.md

```

---

## 2) URL Prefix Convention (고정)

> 라우팅/응답 타입을 prefix로 “명시”해서, HTMX/SSR/API가 섞여도 혼란이 없게 한다.

- `/p/**` : **Page Controller** (full HTML)
- `/f/**` : **Fragment Controller** (partial HTML; HTMX swap 대상)
- `/api/**` : **JSON API** (프론트가 아니라 외부/앱/확장용)

예시:
- `GET /p/local/places` → `templates/pages/local/places.html`
- `GET /f/places/list?neighborhoodId=...&cursor=...` → `templates/fragments/places/list.html`
- `POST /api/v1/market/listings/{id}/reserve` → JSON

---

## 3) Backend Package Structure (권장)

> 기능별(도메인별)로 수직 분리하고, 공통은 `common`으로 둔다.  
> 원칙: Controller → Service → Repository → Entity(또는 Domain) 흐름이 자연스럽게 보이게.

```

com.townpet/
├─ TownPetApplication.java
├─ common/
│  ├─ config/
│  │  ├─ WebMvcConfig.java
│  │  ├─ SecurityConfig.java
│  │  └─ ThymeleafConfig.java           # 선택
│  ├─ error/
│  │  ├─ ErrorCode.java
│  │  ├─ BusinessException.java
│  │  ├─ ApiErrorResponse.java
│  │  └─ GlobalExceptionHandler.java
│  ├─ web/
│  │  ├─ RequestIdFilter.java
│  │  ├─ HtmxUtil.java                  # HX-Request, HX-Redirect helper
│  │  └─ Cursor.java                    # cursor parse/encode
│  ├─ dto/
│  │  └─ CursorPage.java
│  └─ util/
│     └─ TimeUtil.java
├─ auth/
│  ├─ controller/
│  │  ├─ LoginPageController.java       # /p/login (선택)
│  │  └─ DevLoginController.java        # /dev/login (local only)
│  ├─ service/
│  └─ domain/
│     ├─ User.java
│     └─ OAuthAccount.java
├─ neighborhood/
│  ├─ controller/
│  ├─ service/
│  ├─ repository/
│  └─ domain/
├─ place/
│  ├─ controller/
│  │  ├─ PlacePageController.java       # /p/local/places
│  │  └─ PlaceFragmentController.java   # /f/places/*
│  ├─ service/
│  │  └─ PlaceService.java
│  ├─ repository/
│  │  ├─ PlaceRepository.java
│  │  ├─ PlaceReviewRepository.java
│  │  └─ PlaceQueryRepository.java      # QueryDSL cursor list
│  ├─ dto/
│  │  ├─ PlaceCardDto.java
│  │  ├─ PlaceReviewDto.java
│  │  └─ PlaceListQuery.java
│  └─ domain/
│     ├─ Place.java
│     └─ PlaceReview.java
├─ post/
│  ├─ controller/
│  ├─ service/
│  ├─ repository/
│  ├─ dto/
│  └─ domain/
├─ market/
├─ job/
├─ care/
├─ missing/
└─ moderation/
├─ service/
└─ domain/

```

---

## 4) Controller Class Naming Rule (고정)

- Page Controller: `XxxPageController`
  - `@GetMapping("/p/...")`
- Fragment Controller: `XxxFragmentController`
  - `@GetMapping("/f/...")`, `@PostMapping("/f/...")`
- API Controller: `XxxApiController`
  - `@RequestMapping("/api/v1/...")`

> 혼자 개발에서 가장 흔한 문제는 “컨트롤러가 뒤섞이는 것”이다.  
> 이름으로부터 응답 타입이 바로 떠야 한다.

---

## 5) Thymeleaf Template Naming Rule (고정)

### 5.1 Full Page
- 위치: `templates/pages/**`
- 파일명: URL과 최대한 동일하게
  - `/p/local/places` → `pages/local/places.html`

### 5.2 Fragment
- 위치: `templates/fragments/**`
- 파일명: 도메인 단위로 분리
  - Places 목록 fragment → `fragments/places/list.html`
  - Places 카드 fragment → `fragments/places/card.html`

### 5.3 Fragment “계약”
- fragment는 반드시 **루트 엘리먼트 1개**를 가진다(outerHTML swap 안정성).
- fragment는 “입력 파라미터”를 모델 속성으로 문서화한다.
  - 상세 계약은 `docs/06_frontend/04_thymeleaf_template_contracts.md`를 따른다.

---

## 6) Static Assets Rule

### 6.1 기본 원칙
- 초기 MVP는 CDN(HTMX/Alpine/Tailwind)을 기본으로 하고,
- `static/`에는 “정말 필요한 최소”만 둔다.

### 6.2 권장 구성
- `static/css/app.css` : Tailwind CDN 기반에서 커스텀 최소 CSS만
- `static/js/app.js` : request-id, htmx global handler(에러/토스트) 정도만

---

## 7) Flyway Migration Rule (요약)

- 위치: `resources/db/migration/`
- 네이밍: `V{N}__{verb}_{subject}.sql`
- 수정 금지: 이미 실행된 마이그레이션 파일은 절대 수정하지 않는다.
- 상세: `docs/04_architecture/04_migration_policy.md` 준수

---

## 8) Local Infra Rule

- 로컬만:
  - `infra/local/docker-compose.yml`
- 운영 배포(선택):
  - `infra/prod/`를 추가할 수 있지만, 개인 MVP에서는 먼저 `07_infra` 문서 기준으로 단순화

---

## 9) “첫 Vertical Slice” 구현 시 파일 리스트(권장)

> 가장 먼저 “Places list”를 end-to-end로 만든다.

Backend:
- `place/controller/PlacePageController.java`
- `place/controller/PlaceFragmentController.java`
- `place/service/PlaceService.java`
- `place/repository/PlaceQueryRepository.java` (+ 구현체)
- `place/dto/PlaceCardDto.java`
- `common/error/*` (ErrorCode/Handler)
- `common/web/Cursor.java`

Templates:
- `templates/pages/local/places.html`
- `templates/fragments/places/list.html`
- `templates/fragments/common/toast.html`
- `templates/layout/base.html`

Migration/Seed:
- `db/migration/V2__init_local_core.sql` (places 테이블 포함)
- local seed runner(선택): places 5개 생성

---

## 10) Do/Don’t (혼자 개발 안정화 규칙)

### Do
- 도메인별 수직 구조 유지
- `/p`, `/f`, `/api` prefix 고정
- fragment는 “swap 안정성(루트 1개)” 지키기
- cursor paging은 `(created_at, id)` 기반 고정

### Don’t
- 모든 컨트롤러를 하나의 패키지에 몰아넣기
- templates에 “페이지와 fragment”를 섞어놓기
- 엔티티 변경을 ddl-auto update로 해결하기
- seed를 운영 마이그레이션에 섞기


