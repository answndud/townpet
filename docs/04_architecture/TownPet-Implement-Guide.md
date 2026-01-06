# TownPet Spring Boot 구현 가이드 (SSR: Thymeleaf + HTMX)

> 목적: TownPet을 **“1인 백엔드 개발자가 끝까지 완주 가능한”** 형태로 구현하기 위한 실행 지침서입니다. 기존 초안의 큰 흐름(프로젝트 생성 → 구조 → 설정 → 공통 → 도메인 → 테스트 → 보안 → 패턴)을 유지하되, **SSR(Thymeleaf) + HTMX** 전제에 맞게 더 엄격한 규약과 실전 순서로 재정렬했습니다. :contentReference[oaicite:0]{index=0}

---

## 0. 핵심 결정 사항 (반드시 고정)

### 0.1 라우팅 3분할 규약
- **페이지(SSR)**: `/p/**` → layout 포함, “전체 화면” HTML 반환
- **프래그먼트(HTMX)**: `/f/**` → layout 없음, “부분 교체” HTML만 반환
- **JSON API**: `/api/**` → JSON (지도/특수 UI, 외부연동, 관리자 도구에만 제한적으로 사용)

> 실패 패턴: `/p`와 `/f`가 섞이면 템플릿/에러 처리/권한/캐시 전략이 망가집니다.  
> 성공 패턴: `/p`는 “페이지 골격”, `/f`는 “교체 블록”, `/api`는 “예외적”입니다.

### 0.2 인증/보안 기본값
- 기본: **세션 기반 로그인 + CSRF ON**
- OAuth2 Client로 소셜 로그인(카카오/구글 등) 연동 가능
- Rate limit / 신고-블라인드(Moderation)는 “운영 가능성”을 위해 MVP에 포함

### 0.3 DB/마이그레이션
- DB: PostgreSQL 권장
- 스키마: **Flyway**로 버전 관리
- JPA `ddl-auto=validate`(운영/개발 모두 원칙)

---

## 1. 프로젝트 생성

### 1.1 Spring Initializr 권장
- Project: Gradle - Groovy
- Language: Java
- Spring Boot: 3.x (stable)
- Java: 17 (LTS)
- Packaging: Jar

### 1.2 build.gradle (권장 기본 세트)
> “필요 최소 + 이력서에서 설득력 있는 선택지” 기준

```groovy
dependencies {
  // Web + Validation
  implementation 'org.springframework.boot:spring-boot-starter-web'
  implementation 'org.springframework.boot:spring-boot-starter-validation'

  // SSR View
  implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'
  implementation 'nz.net.ultraq.thymeleaf:thymeleaf-layout-dialect:3.3.0'

  // Data
  implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
  runtimeOnly 'org.postgresql:postgresql'

  // Security (SSR)
  implementation 'org.springframework.boot:spring-boot-starter-security'
  implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'

  // Redis (rate limit / cache / session-store 옵션)
  implementation 'org.springframework.boot:spring-boot-starter-data-redis'

  // Migration
  implementation 'org.flywaydb:flyway-core'

  // Observability
  implementation 'org.springframework.boot:spring-boot-starter-actuator'

  // Dev convenience
  compileOnly 'org.projectlombok:lombok'
  annotationProcessor 'org.projectlombok:lombok'

  // Tests
  testImplementation 'org.springframework.boot:spring-boot-starter-test'
  testImplementation 'org.testcontainers:junit-jupiter'
  testImplementation 'org.testcontainers:postgresql'
  testImplementation 'org.testcontainers:redis'
}

#### 선택(확장/이력서 포인트)

```groovy
// QueryDSL (피드/검색/필터 고도화)
implementation 'com.querydsl:querydsl-jpa:5.0.0:jakarta'
annotationProcessor 'com.querydsl:querydsl-apt:5.0.0:jakarta'
annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
annotationProcessor 'jakarta.persistence:jakarta.persistence-api'

// OpenAPI (JSON API가 늘어날 때만)
implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0'
```

---

## 2. 프론트 자원 구성 (빌드 최소화)

### 2.1 HTMX / Alpine / Tailwind 적용 원칙

* HTMX: **부분 갱신(AJAX) 로직을 JS가 아니라 “HTML 속성”으로 표현**
* Alpine.js: “진짜 작은 상태”만(모달 open/close, 드롭다운)
* Tailwind: MVP는 CDN로 시작 가능 → 운영에서는 빌드 산출물만 배포하는 방식으로 전환

### 2.2 정적 자원 배치(권장)

* `src/main/resources/static/`

  * `vendor/htmx.min.js`
  * `vendor/alpine.min.js` (선택)
  * `css/app.css` (tailwind 빌드 결과, 또는 CDN 사용 시 생략)

---

## 3. 디렉토리/패키지 구조 (모듈러 모놀리스)

### 3.1 Java 패키지 구조(권장)

```
com.townpet
├── TownPetApplication.java
├── global
│   ├── config            # WebMvc, Security, JPA, Redis, Flyway
│   ├── exception         # ErrorCode, BusinessException, GlobalExceptionHandler
│   ├── response          # ApiResponse(JSON), Hx(HTMX 유틸/헤더)
│   ├── security          # Principal, Authorization, OAuth2 handlers
│   ├── web               # Interceptor, ArgumentResolver, Locale/Time
│   └── util              # Cursor, Id, Slug, Sanitizer 등
└── domain
    ├── auth              # OAuth2 login, session user
    ├── user              # user/profile/pet
    ├── neighborhood      # 동네 소속/인증 레벨
    ├── place             # 병원/식당/시설 + 템플릿 리뷰
    ├── walk              # 산책로/코스 + 후기
    ├── meetup            # 산책 메이트/번개
    ├── market            # 중고/대여/나눔
    ├── job               # 펫케어 구인/구직
    ├── care              # 심부름/긴급돌봄
    ├── missing           # 실종/유기 신고
    ├── moderation        # 신고/블라인드/어드민 큐
    ├── media             # presign/attachments
    └── notification      # 알림(웹/메일 → 확장)
```

### 3.2 Web 레이어 분리(강제)

* `web.page.*`  → `/p/**`
* `web.frag.*`  → `/f/**`
* `web.api.*`   → `/api/**`

> 컨트롤러가 섞이면 “에러 처리/보안/캐시/테스트”가 같이 무너집니다. 폴더부터 분리하세요.

---

## 4. Thymeleaf 템플릿 구조 (SSR/Fragment 계약)

### 4.1 templates 디렉토리(권장)

```
src/main/resources/templates/
├── layout/
│   ├── base.html               # 공통 레이아웃(헤더/푸터/메타/CSRF/JS)
│   └── auth_base.html          # 로그인/콜백 전용(선택)
├── pages/                      # /p/**
│   ├── home.html
│   ├── local/
│   │   ├── feed.html
│   │   ├── places.html
│   │   ├── walks.html
│   │   ├── market.html
│   │   ├── jobs.html
│   │   └── lost_found.html
│   ├── global/
│   │   ├── hub.html
│   │   ├── qna.html
│   │   ├── foods.html
│   │   └── guides.html
│   ├── me/
│   │   ├── profile.html
│   │   ├── settings.html
│   │   └── notifications.html
│   └── admin/
│       ├── reports.html
│       └── audit.html
└── fragments/                  # /f/**
    ├── ui/
    │   ├── toast.html
    │   ├── modal.html
    │   ├── empty.html
    │   └── cursor_pagination.html
    ├── place/
    │   ├── card.html
    │   ├── list.html
    │   └── form.html
    ├── walk/
    ├── market/
    ├── job/
    ├── missing/
    └── comment/
```

### 4.2 Fragment 반환 규약(HTML “계약”)

HTMX가 **어떤 target을 어떻게 교체**할지 예측 가능해야 합니다.

* 리스트 fragment는 반드시 “컨테이너 1개”를 반환

  * 예: `<div id="placeList"> ... </div>`
* 무한스크롤 fragment는 “추가 chunk + next cursor”를 같이 포함

  * 예: `<div data-next-cursor="...">...</div>`
* 성공/실패 시 UX는 **toast fragment**로 표준화

  * 예: `fragments/ui/toast.html :: toast(type, message)`

---

## 5. 환경 설정(application.yml)

### 5.1 공통(application.yml)

```yaml
spring:
  application:
    name: townpet
  profiles:
    active: local

  thymeleaf:
    cache: false

  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
        default_batch_fetch_size: 100

server:
  forward-headers-strategy: framework

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

### 5.2 로컬(application-local.yml)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/townpet
    username: townpet
    password: townpet

  flyway:
    enabled: true

logging:
  level:
    org.hibernate.SQL: debug
```

### 5.3 운영(application-prod.yml)

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

  thymeleaf:
    cache: true

  flyway:
    enabled: true

logging:
  level:
    root: warn
```

---

## 6. 공통 컴포넌트 (먼저 만들 것)

### 6.1 BaseEntity + Auditing

* createdAt/updatedAt
* createdBy/modifiedBy(선택: principal 기반)

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
public abstract class BaseEntity {
  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  private LocalDateTime updatedAt;

  @CreatedBy
  @Column(updatable = false)
  private String createdBy;

  @LastModifiedBy
  private String modifiedBy;
}
```

### 6.2 예외/에러 표준

* `ErrorCode`(HTTP status, code, message)
* `BusinessException`
* `GlobalExceptionHandler`는 **경로별로 응답을 분기**

  * `/api/**` → JSON 에러(`ApiResponse`)
  * `/p/**` → error page
  * `/f/**` → “에러 fragment(toast/inline)” + 필요 시 `HX-Redirect`

### 6.3 HTMX 응답 유틸(권장)

* 성공 시: `HX-Redirect`, `HX-Trigger`
* 실패 시: `HX-Trigger`로 toast 표시(표준 이벤트명 고정)

---

## 7. 보안(SSR 기준) — “세션 + CSRF”로 단순화

### 7.1 기본 전략

* 로그인: OAuth2 Client(카카오/구글) + 세션
* CSRF: ON
* 권한:

  * “동네 미인증/신규”는 마켓/구인/실종 글쓰기 제한(서버에서 강제)

### 7.2 HTMX + CSRF 표준 처리

* layout에 CSRF meta 주입
* `htmx:configRequest`에서 헤더로 실어 보냄

(예시)

```html
<meta name="_csrf" th:content="${_csrf.token}">
<meta name="_csrf_header" th:content="${_csrf.headerName}">
<script>
  document.body.addEventListener('htmx:configRequest', function (evt) {
    const token = document.querySelector('meta[name="_csrf"]').content;
    const header = document.querySelector('meta[name="_csrf_header"]').content;
    evt.detail.headers[header] = token;
  });
</script>
```

---

## 8. TownPet 도메인 구현 순서 (완주 최적화)

> “유저가 가치 느끼는 흐름” + “운영 가능성” 기준

### Phase 0: 계정/동네

1. OAuth2 로그인 + 세션
2. 유저 프로필/반려동물 기본 정보
3. 동네 설정(초기: 선택, 후속: 인증 레벨)

### Phase 1: 로컬 핵심

4. 장소(병원/동반식당/시설) 등록/검색
5. 템플릿 리뷰(방문일/항목/비용/대기/서비스)
6. 산책로/코스(간단 텍스트+태그 → 나중에 지도 고도화)

### Phase 2: 참여/거래

7. 피드(커서 페이지네이션 + 무한스크롤)
8. 마켓(중고/대여/나눔)
9. 구인/구직(지원 기능은 단순 폼부터)

### Phase 3: 안전/운영

10. 신고/블라인드/관리 큐(Moderation)
11. 실종/유기 신고(“게시+노출” 먼저, 푸시는 후순위)

---

## 9. 데이터 레이어(성능/학생티 방지 포인트)

### 9.1 피드/검색은 cursor pagination으로 시작

* offset 페이지네이션은 피드에서 곧 부딪힙니다.
* cursor는 “createdAt + id” 조합이 일반적(정렬 안정성)

### 9.2 인덱스 기본 세트(예시)

* `place_review (neighborhood_id, created_at desc, id desc)`
* `market_item (neighborhood_id, status, created_at desc, id desc)`
* `job_post (neighborhood_id, created_at desc, id desc)`
* `report (target_type, target_id, created_at desc)`

---

## 10. 테스트 전략 (최소로 ‘운영 가능성’ 증명)

### 10.1 Testcontainers 통합 테스트(권장)

* Postgres + Redis
* 핵심 시나리오 3개만 “진짜로” 돌아가게 만들기

  1. 로그인(테스트에서는 세션 사용자 stub) → 글 작성 → 목록 조회
  2. 댓글/좋아요(HTMX fragment) 정상 교체
  3. 신고 → 자동 블라인드 → 목록에서 제외

### 10.2 HTMX fragment 테스트 팁

* 요청 헤더에 `HX-Request: true`
* 반환 HTML에 “계약된 DOM id/class”가 포함되는지 검사

---

## 11. 로깅/관측성(작게 시작)

### 11.1 traceId 전략

* 모든 응답 헤더에 traceId
* `/f/**` 에러도 traceId로 추적 가능해야 함

### 11.2 Actuator 최소 노출

* `health`, `info`, `metrics` 정도만
* 운영에서만 세부 지표 확장

---

## 12. 배포/운영(문서로 고정할 룰)

### 12.1 환경변수 표준

* `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
* OAuth2 client secrets
* Redis URL(선택)

### 12.2 운영 기본 원칙

* Flyway on
* `ddl-auto=validate`
* thymeleaf cache on(prod)
* 로그 레벨 낮추기(prod)

---

## 13. 실전 체크리스트

### 13.1 첫 주(부트스트랩)

* [ ] `/p/**`, `/f/**`, `/api/**` 라우팅 분리 완료
* [ ] base layout에 HTMX/CSRF/tailwind 연결
* [ ] 공통 예외 처리(경로별) 완료
* [ ] Flyway + Postgres 로컬 구동

### 13.2 MVP 완주(Phase 1)

* [ ] place 템플릿 리뷰 CRUD
* [ ] 로컬 피드 cursor 무한스크롤(HTMX)
* [ ] 신고/블라인드 최소 구현(운영 가능성)

### 13.3 확장(Phase 2~3)

* [ ] 마켓/구인/실종
* [ ] rate limit(스팸 방지)
* [ ] presigned upload(이미지/첨부 최적화)

---

## 14. “이 문서대로 구현하면 남는 것”(이력서 관점)

* SSR + HTMX로 “프론트 과부하” 없이 완제품에 가까운 UX
* cursor pagination, moderation, rate limit, migration(Flyway) 같은 **실무형 포인트**
* `/p`/`/f`/`/api` 분리로 “설계 규율”을 증명


# TownPet 구현 가이드 (추가) — 템플릿/프래그먼트 계약 + 스켈레톤 클래스 설계

> 이 문서는 직전 가이드의 “/p(페이지) /f(프래그먼트) /api(JSON)” 규약을 **실제 파일명·DOM 계약·클래스 스켈레톤** 수준으로 고정합니다.  
> 목표: AI 생성 코드를 붙여도 구조가 무너지지 않게 “계약(Contract)”을 먼저 박아둡니다.

---

## 1) Thymeleaf 템플릿 파일 목록 (실제 파일명 단위)

### 1.1 Layout
- `templates/layout/base.html`
- `templates/layout/_head.html`
- `templates/layout/_nav.html`
- `templates/layout/_footer.html`
- `templates/layout/_scripts.html`
- `templates/layout/auth_base.html` *(선택: 로그인/가입 관련 페이지 분리 시)*

### 1.2 Error Pages (SSR)
- `templates/errors/403.html`
- `templates/errors/404.html`
- `templates/errors/500.html`

### 1.3 Pages — `/p/**` (Full Page)
#### Public
- `templates/pages/home.html`
- `templates/pages/auth/login.html` *(선택: OAuth2 버튼만 있는 페이지)*

#### Local (동네 기반)
- `templates/pages/local/feed.html`
- `templates/pages/local/places.html`
- `templates/pages/local/place_detail.html` *(선택: 상세 페이지 제공 시)*
- `templates/pages/local/walks.html`
- `templates/pages/local/market.html`
- `templates/pages/local/jobs.html`
- `templates/pages/local/care.html` *(심부름/긴급돌봄; MVP에선 리스트만)*
- `templates/pages/local/lost_found.html`

#### Global (지역 무관)
- `templates/pages/global/hub.html`
- `templates/pages/global/qna.html`
- `templates/pages/global/qna_detail.html` *(선택)*
- `templates/pages/global/foods.html` *(사료/용품 DB; Phase 2~3)*
- `templates/pages/global/guides.html` *(전문가 콘텐츠; Phase 3~)*

#### Me (마이페이지)
- `templates/pages/me/profile.html`
- `templates/pages/me/settings.html`
- `templates/pages/me/notifications.html`

#### Admin (운영)
- `templates/pages/admin/reports.html`
- `templates/pages/admin/audit.html`

### 1.4 Fragments — `/f/**` (HTMX Swap 전용)
#### UI 공통
- `templates/fragments/ui/toast.html`
- `templates/fragments/ui/modal_shell.html`
- `templates/fragments/ui/confirm_modal.html`
- `templates/fragments/ui/empty_state.html`
- `templates/fragments/ui/pagination_chunk.html` *(cursor 무한스크롤용)*
- `templates/fragments/ui/form_errors.html` *(필드 에러 표준)*

#### Feed
- `templates/fragments/feed/feed_list.html`
- `templates/fragments/feed/feed_item.html`

#### Places
- `templates/fragments/place/place_list.html`
- `templates/fragments/place/place_card.html`
- `templates/fragments/place/place_form.html`
- `templates/fragments/place/review_list.html`
- `templates/fragments/place/review_item.html`
- `templates/fragments/place/review_form.html`

#### Walks
- `templates/fragments/walk/walk_list.html`
- `templates/fragments/walk/walk_card.html`
- `templates/fragments/walk/walk_form.html`

#### Market
- `templates/fragments/market/listing_list.html`
- `templates/fragments/market/listing_card.html`
- `templates/fragments/market/listing_form.html`

#### Jobs
- `templates/fragments/job/job_list.html`
- `templates/fragments/job/job_card.html`
- `templates/fragments/job/job_form.html`
- `templates/fragments/job/application_form.html`

#### Care
- `templates/fragments/care/request_list.html`
- `templates/fragments/care/request_card.html`
- `templates/fragments/care/request_form.html`

#### Missing / Lost&Found
- `templates/fragments/missing/report_list.html`
- `templates/fragments/missing/report_card.html`
- `templates/fragments/missing/report_form.html`

#### Comments (공통)
- `templates/fragments/comment/comment_list.html`
- `templates/fragments/comment/comment_item.html`
- `templates/fragments/comment/comment_form.html`

---

## 2) Fragment “입력 파라미터 / 반환 HTML 구조 계약(Contract)”

> 규칙: **프래그먼트는 반드시 “최상위 루트 요소 1개”를 반환**하고, 그 루트에는 교체 대상이 되는 `id`가 고정되어야 합니다.

### 2.1 공통 Contract

#### (A) Toast — `fragments/ui/toast.html :: toast(type, message)`
- **입력 파라미터**
  - `type`: `success | info | warn | error`
  - `message`: 사용자 메시지(짧게)
- **반환 HTML(최상위 루트)**
  - `<div id="toastArea" data-toast-type="..." class="..."> ... </div>`
- **교체 규칙**
  - `hx-target="#toastArea" hx-swap="outerHTML"`

#### (B) Form Errors — `fragments/ui/form_errors.html :: formErrors(errors)`
- **입력 파라미터**
  - `errors`: 필드별 에러 리스트
- **반환 HTML**
  - `<div id="formErrors" class="..."> <ul>...</ul> </div>`
- **교체 규칙**
  - `hx-target="#formErrors" hx-swap="outerHTML"`

#### (C) Cursor Pagination Chunk — `fragments/ui/pagination_chunk.html :: chunk(items, nextCursor)`
- **입력 파라미터**
  - `items`: 카드/아이템 리스트
  - `nextCursor`: 다음 커서(없으면 null)
- **반환 HTML**
  - `<div id="{listId}__chunk" data-next-cursor="..."> ...items... </div>`
  - 마지막에 “센티널” 포함:
    - `<div id="{listId}__sentinel" hx-get="..." hx-trigger="revealed" hx-swap="outerHTML">`
- **교체 규칙**
  - 무한스크롤: `hx-swap="outerHTML"`로 센티널을 “다음 chunk”로 교체

---

### 2.2 Places Contract

#### (D) Place List — `fragments/place/place_list.html :: placeList(places, nextCursor, filters)`
- **입력**
  - `places`: PlaceCard용 데이터
  - `nextCursor`: cursor
  - `filters`: 정렬/필터 상태(옵션)
- **반환 HTML**
  - `<div id="placeList">`
    - `<div id="placeCards"> ... place_card 반복 ... </div>`
    - `<div id="placeList__sentinel" ...>` *(revealed)*  
  - `</div>`
- **필수 DOM**
  - `#placeList`, `#placeCards`, `#placeList__sentinel`

#### (E) Review List — `fragments/place/review_list.html :: reviewList(reviews, nextCursor)`
- **반환 HTML**
  - `<div id="reviewList">`
    - `<div id="reviewItems"> ... review_item 반복 ... </div>`
    - `<div id="reviewList__sentinel" ...>`
  - `</div>`

#### (F) Review Form — `fragments/place/review_form.html :: reviewForm(form)`
- **반환 HTML**
  - `<form id="reviewForm" hx-post="/f/places/{placeId}/reviews" hx-target="#reviewList" hx-swap="outerHTML">`
- **실패(검증 에러)**
  - 서버는 같은 fragment를 반환하되 `#formErrors`를 포함해 교체 가능하게 구성

---

### 2.3 Feed Contract

#### (G) Feed List — `fragments/feed/feed_list.html :: feedList(items, nextCursor)`
- **반환 HTML**
  - `<div id="feedList">`
    - `<div id="feedItems"> ... feed_item 반복 ... </div>`
    - `<div id="feedList__sentinel" ...>`
  - `</div>`

---

### 2.4 Market Contract

#### (H) Listing List — `fragments/market/listing_list.html :: listingList(items, nextCursor, filters)`
- **반환 HTML**
  - `<div id="marketList">`
    - `<div id="marketCards"> ... listing_card ... </div>`
    - `<div id="marketList__sentinel" ...>`
  - `</div>`

---

### 2.5 Missing Contract

#### (I) Missing Report List — `fragments/missing/report_list.html :: reportList(items, nextCursor)`
- **반환 HTML**
  - `<div id="missingList">`
    - `<div id="missingCards"> ... report_card ... </div>`
    - `<div id="missingList__sentinel" ...>`
  - `</div>`

---

## 3) 각 페이지별 HTMX target/swap 규칙(표준)

> 원칙: 페이지는 “골격”만 렌더링하고, 리스트/폼/상태변경은 `/f/**`로 분리합니다.

### 3.1 `/p/local/places` — places.html
- **초기 로드**
  - 페이지에서 `#placeList` 영역을 비워두고, onload HTMX로 주입
  - 예: `<div id="placeList" hx-get="/f/places/list" hx-trigger="load" hx-swap="outerHTML"></div>`
- **검색/필터 변경**
  - 검색폼: `hx-get="/f/places/list?query=..." hx-target="#placeList" hx-swap="outerHTML"`
- **리뷰 작성**
  - 리뷰 폼 제출: `hx-post="/f/places/{id}/reviews" hx-target="#reviewList" hx-swap="outerHTML"`
  - 성공 시 toast: `HX-Trigger: {"toast":{"type":"success","message":"등록되었습니다"}}`

### 3.2 `/p/local/feed` — feed.html
- `#feedList`는 load로 fragment 주입
- 무한스크롤은 `#feedList__sentinel` revealed로 chunk 교체

### 3.3 `/p/local/market` — market.html
- `#marketList` load 주입
- 상태 변경(예약/완료)은 버튼에:
  - `hx-post="/f/market/{id}/reserve" hx-target="#marketCard__{id}" hx-swap="outerHTML"`

### 3.4 `/p/local/lost-found` — lost_found.html
- `#missingList` load 주입
- 신고 등록:
  - `hx-post="/f/missing" hx-target="#missingList" hx-swap="outerHTML"`

---

## 4) 컨트롤러/서비스/리포지토리 스켈레톤 (클래스 목록)

> “섞지 말 것”이 핵심입니다. Page/Frag/API 컨트롤러를 **물리적으로 분리**합니다.

### 4.1 Global 공통

#### config
- `global.config.WebMvcConfig`
- `global.config.SecurityConfig`
- `global.config.JpaConfig` *(Auditing 포함)*
- `global.config.RedisConfig`
- `global.config.FlywayConfig` *(옵션)*

#### exception/response
- `global.exception.ErrorCode`
- `global.exception.BusinessException`
- `global.exception.GlobalExceptionHandler`
- `global.response.ApiResponse<T>`
- `global.response.Hx` *(HTMX 헤더/trigger/redirect 유틸)*

#### security
- `global.security.CurrentUser`
- `global.security.LoginUserArgumentResolver`
- `global.security.OAuth2SuccessHandler`
- `global.security.OAuth2FailureHandler`

#### util
- `global.util.Cursor`
- `global.util.CursorPage<T>`
- `global.util.SlugUtil`
- `global.util.GeoUtil` *(지도 단계에서)*

---

### 4.2 Auth/User/Neighborhood

#### web.page
- `domain.auth.web.page.AuthPageController` *(선택: 로그인 안내 페이지)*  
- `domain.user.web.page.MePageController` *(profile/settings)*

#### web.api *(필요 시)*
- `domain.user.web.api.UserApiController` *(프로필 JSON이 필요할 때만)*

#### service
- `domain.auth.service.AuthService`
- `domain.user.service.UserService`
- `domain.neighborhood.service.NeighborhoodService`

#### entity/repository
- `domain.user.entity.User`
- `domain.user.entity.PetProfile`
- `domain.user.repository.UserRepository`
- `domain.user.repository.PetProfileRepository`

- `domain.neighborhood.entity.Neighborhood`
- `domain.neighborhood.entity.UserNeighborhood` *(유저-동네 매핑/레벨)*
- `domain.neighborhood.repository.NeighborhoodRepository`
- `domain.neighborhood.repository.UserNeighborhoodRepository`

---

### 4.3 Places + Reviews (MVP 핵심)

#### web.page
- `domain.place.web.page.PlacePageController`
  - GET `/p/local/places`
  - GET `/p/local/places/{placeId}` *(선택: 상세)*

#### web.frag
- `domain.place.web.frag.PlaceFragController`
  - GET `/f/places/list`
  - GET `/f/places/{placeId}/reviews`
  - POST `/f/places/{placeId}/reviews`
  - POST `/f/places` *(장소 등록; MVP에서 선택)*

#### service
- `domain.place.service.PlaceService`
- `domain.place.service.PlaceReviewService`

#### entity
- `domain.place.entity.Place`
- `domain.place.entity.PlaceTag` *(동반가능/주차 등)*
- `domain.place.entity.PlaceReview`
- `domain.place.entity.PlaceReviewItem` *(템플릿 항목: 비용/대기/진료항목 등)*

#### repository
- `domain.place.repository.PlaceRepository`
- `domain.place.repository.PlaceReviewRepository`
- `domain.place.repository.PlaceQueryRepository` *(QueryDSL/커서/필터용; 선택)*

---

### 4.4 Feed/Posts/Comments (Local+Global 공통 기반)

#### web.page
- `domain.post.web.page.FeedPageController`
  - GET `/p/local/feed`
  - GET `/p/global/hub` *(선택: 글로벌 허브)*

#### web.frag
- `domain.post.web.frag.FeedFragController`
  - GET `/f/feed/list`
  - POST `/f/posts` *(글 작성; 선택)*

- `domain.comment.web.frag.CommentFragController`
  - GET `/f/posts/{postId}/comments`
  - POST `/f/posts/{postId}/comments`

#### service
- `domain.post.service.PostService`
- `domain.comment.service.CommentService`

#### entity/repository
- `domain.post.entity.Post`
- `domain.post.entity.PostScope` *(LOCAL/GLOBAL)*
- `domain.comment.entity.Comment`
- `domain.post.repository.PostRepository`
- `domain.comment.repository.CommentRepository`

---

### 4.5 Market (중고/대여/나눔)

#### web.page
- `domain.market.web.page.MarketPageController` → GET `/p/local/market`

#### web.frag
- `domain.market.web.frag.MarketFragController`
  - GET `/f/market/list`
  - POST `/f/market` *(등록)*
  - POST `/f/market/{id}/reserve`
  - POST `/f/market/{id}/complete`

#### service
- `domain.market.service.MarketListingService`

#### entity/repository
- `domain.market.entity.MarketListing`
- `domain.market.entity.ListingType` *(USED/RENTAL/SHARE)*
- `domain.market.entity.ListingStatus` *(OPEN/RESERVED/COMPLETED/DISPUTED)*
- `domain.market.repository.MarketListingRepository`
- `domain.market.repository.MarketQueryRepository` *(선택)*

---

### 4.6 Jobs + Care

#### web.page
- `domain.job.web.page.JobPageController` → GET `/p/local/jobs`
- `domain.care.web.page.CarePageController` → GET `/p/local/care`

#### web.frag
- `domain.job.web.frag.JobFragController`
  - GET `/f/jobs/list`
  - POST `/f/jobs`
  - POST `/f/jobs/{jobId}/apply`

- `domain.care.web.frag.CareFragController`
  - GET `/f/care/list`
  - POST `/f/care`

#### service/entity/repository
- `domain.job.service.JobService`
- `domain.job.entity.JobPost`
- `domain.job.entity.JobApplication`
- `domain.job.repository.JobPostRepository`
- `domain.job.repository.JobApplicationRepository`

- `domain.care.service.CareService`
- `domain.care.entity.CareRequest`
- `domain.care.repository.CareRequestRepository`

---

### 4.7 Missing + Moderation (운영 가능성 핵심)

#### web.page
- `domain.missing.web.page.MissingPageController` → GET `/p/local/lost-found`
- `domain.moderation.web.page.AdminReportPageController` → GET `/p/admin/reports`

#### web.frag
- `domain.missing.web.frag.MissingFragController`
  - GET `/f/missing/list`
  - POST `/f/missing`

- `domain.moderation.web.frag.ModerationFragController`
  - POST `/f/reports` *(신고 접수)*
  - POST `/f/admin/reports/{id}/resolve` *(관리자 처리)*

#### service
- `domain.missing.service.MissingService`
- `domain.moderation.service.ReportService`
- `domain.moderation.service.ModerationPolicyService` *(자동 블라인드 룰)*

#### entity/repository
- `domain.missing.entity.MissingReport`
- `domain.missing.repository.MissingRepository`

- `domain.moderation.entity.Report`
- `domain.moderation.entity.ModerationAction`
- `domain.moderation.entity.AuditLog`
- `domain.moderation.repository.ReportRepository`
- `domain.moderation.repository.AuditLogRepository`

---

## 5) “스켈레톤을 먼저 뚫는” 구현 순서 (추천)

1) `/p/**` 페이지 2개만 먼저 만든다  
   - `places.html`, `feed.html` (레이아웃 포함)
2) 각 페이지에서 `hx-get`으로 `/f/**`를 load 주입
3) `/f/**`는 **list fragment 1개**부터 완성 (DB 조회 + cursor)
4) 댓글/리뷰처럼 “폼 POST → list 교체” 패턴을 1회 구현
5) 신고/블라인드까지 붙여 “운영 가능성”을 확보한 뒤 기능을 확장

---

## 6) 최소 기준(통과 조건)

- [ ] `/p`, `/f`, `/api` 경로로 컨트롤러가 분리되어 있다
- [ ] 리스트 fragment는 `id` 계약이 고정되어 있다(`placeList`, `feedList` 등)
- [ ] 무한스크롤은 sentinel revealed + cursor 방식이다
- [ ] 검증 실패 시, 폼 fragment가 “같은 자리”에서 교체된다
- [ ] 신고 → 자동 블라인드(또는 최소 hidden 처리)가 동작한다