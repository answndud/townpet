# TownPet 기술 스택(백엔드 Spring Boot 전제) 총정리
> 목표: 제품 성과와 무관하게 **면접/이력서에서 강하게 보이는** “실전형 백엔드 프로젝트”를 만든다.  
> 방향: MVP는 **모듈러 모놀리스**로 빠르게 출시하고, “확장 포인트”를 설계로 보여준다.

---

## 0) 핵심 전략(이력서 관점)
- “기능이 많다”보다 **아키텍처/품질/운영요소**가 있어야 한다.
- 면접에서 먹히는 키워드:
  - **도메인 분리(모듈러 모놀리스)**, **권한/정책(ABUSE 방지)**, **검색/피드 성능 최적화**, **비동기 처리**, **관측성(로그/트레이싱)**, **CI/CD**, **테스트 전략**
- 기술 선택은 “유행”이 아니라 **왜 이 선택이 합리적인지** 말할 수 있어야 한다.

---

## 1) 전체 아키텍처(권장)
### 1.1 MVP: 모듈러 모놀리스(단일 Spring Boot)
- 하나의 Spring Boot 애플리케이션 안에 모듈로 도메인 분리:
  - `auth`, `users`, `neighborhood`, `posts`, `comments`, `search`, `market`, `jobs`, `moderation`, `notifications`, `files`
- 장점: 개발 속도/배포 단순, 이력서에서 “확장 가능한 설계”를 설명하기 쉬움

### 1.2 확장(선택): 서비스 분리 가능 포인트만 설계로 제시
- 이벤트/알림/검색 인덱싱은 분리 후보
- 거래/구인도 트래픽 커지면 독립 가능
- 단, 실제로 분리까지는 “선택” (성과 목적이 아니라 학습/이력 목적)

---

## 2) 백엔드: Spring Boot 스택

### 2.1 런타임/프레임워크
- Java 21 (LTS, Spring Boot 3.x 최적 호환)
- Spring Boot 3.x
- Spring Web (REST)
- Spring Validation (Bean Validation)

### 2.2 인증/인가(중요)
- Spring Security
- **MVP(SSR/HTMX)**: 세션 기반 인증 + CSRF 활성화 (권장)
  - OAuth2 로그인(카카오/구글) → 세션 쿠키(HttpOnly, Secure)
  - 세션 방식이 SSR/Thymeleaf와 가장 적합
- **확장(API 분리 시)**: JWT 도입
  - JWT: Access(짧게) + Refresh(길게) 패턴
  - 모바일 앱/외부 API 제공 시 도입
- 권한 설계:
  - Role(ROLE_USER/ROLE_ADMIN)
  - Capability(예: `POST_MARKET`, `POST_JOB`)를 "정책"으로 제어(동네 인증/활동점수 조건)

### 2.3 데이터 접근
- DB: PostgreSQL 16+ (필수, JSONB 성능 향상/논리 복제 개선)
- ORM: Spring Data JPA + Hibernate
- Query: QueryDSL(권장)
  - 이유: 피드/검색/필터 조건이 많아짐
- 마이그레이션: Flyway(권장) 또는 Liquibase

### 2.4 캐시/레이트리밋/큐(이력서 임팩트)
- Redis
  - 용도: rate limit 토큰 버킷, 인기글 카운트(임시), 세션/블랙리스트(선택)
- 메시지 큐(선택, 강력 추천)
  - RabbitMQ 또는 Kafka(둘 중 하나)
  - 용도: 알림 발송, 검색 인덱싱, 이미지 처리, 이벤트 로그 비동기화
- 배치/스케줄링
  - Spring Scheduler(간단)
  - 또는 Spring Batch(규모 있을 때)

---

## 3) API 설계 원칙(REST)
### 3.1 대표 엔드포인트(범주)
- Auth: `/api/v1/auth/*`
- Users/Neighborhood: `/api/v1/users/*`, `/api/v1/neighborhoods/*`
- Posts: `/api/v1/posts/*` (type으로 다형성)
- Comments: `/api/v1/posts/{id}/comments`
- Search: `/api/v1/search`
- Market: `/api/v1/market/*`
- Jobs: `/api/v1/jobs/*`
- Moderation: `/api/v1/reports/*`, `/api/v1/admin/*`
- Notifications: `/api/v1/notifications/*`
- Files: `/api/v1/files/presign`

### 3.2 핵심 패턴
- 피드/검색은 **Cursor Pagination**(offset 금지)
- 필터는 QueryDSL로 조립
- 응답 표준:
  - 공통 에러 포맷 + 에러코드(enum) + traceId

---

## 4) 데이터 모델(요약)
> 핵심은 `posts` 공통 테이블 + 타입별 서브 테이블.

- `users`, `user_neighborhoods`
- `posts(type, neighborhood_id, title, body, status, created_at)`
- `hospital_posts`, `walk_route_posts`, `food_posts`, `market_listings`, `job_posts`
- `comments`, `reactions(like/save)`, `views`
- `reports`, `blocks`, `admin_actions`
- `transactions`, `reviews`(마켓)
- `applications`(구인)

---

## 5) 검색(2단계)
### 5.1 MVP
- Postgres FTS + trigram
- 검색 대상: posts title/body + 태그

### 5.2 확장(선택)
- OpenSearch/Elasticsearch 또는 Meilisearch
- “이벤트 기반 인덱싱”(게시물 생성/수정 이벤트 → 비동기 반영)

---

## 6) 파일/미디어 업로드
- S3 호환 스토리지(AWS S3 or Cloudflare R2)
- Presigned URL 발급 API
- 이미지 리사이즈(선택)
  - 업로드 후 비동기 처리(큐 + 워커)
- 영수증 업로드는 민감정보 가이드 + 사용자 삭제 지원

---

## 7) 알림(웹/PWA 중심 + 앱 확장 대비)
### 7.1 MVP
- 이메일(백업 채널)
- 웹푸시는 프론트(PWA)에서 처리, 백엔드는 “알림 이벤트/구독”만 관리

### 7.2 확장
- FCM/APNs(앱) 토큰 관리 테이블
- 이벤트 → 큐 → 알림 발송 워커

---

## 8) 운영/모더레이션(면접에서 강한 파트)
- 신고/블라인드 자동화 룰
  - 신고 N회 이상 자동 숨김
  - 신규계정/반복 신고 사용자 제한
- 스팸 방지
  - rate limit(글/댓글/검색/로그인)
  - 연락처/링크 노출 제한(구인/마켓)
- 관리자 콘솔 API
  - 신고 큐, 조치 이력, 계정 제재

---

## 9) 관측성/운영(이력서 필수)
- 로깅: Logback + JSON 로그
- 트레이싱: Micrometer + OpenTelemetry(선택)
- 메트릭: Micrometer + Prometheus/Grafana(선택)
- 에러 트래킹: Sentry(선택)
- 감사 로그(Audit):
  - 관리자 조치, 신고 처리, 계정 제한 기록

---

## 10) 테스트 전략(이력서에서 묻는 포인트)
- 단위 테스트: JUnit5 + Mockito
- 통합 테스트: Testcontainers(Postgres/Redis)
- API 테스트: RestAssured(선택)
- 계약/문서화: Spring REST Docs 또는 OpenAPI(Swagger)
- 핵심 시나리오 E2E:
  - 로그인 → 글 작성(병원/산책) → 검색 → 신고 → 블라인드 → 복구

---

## 11) CI/CD & 배포
### 11.1 CI
- GitHub Actions
  - build/test
  - 정적 분석(SpotBugs/Checkstyle 선택)
  - Docker 이미지 빌드

### 11.2 배포(간단하면서 이력서에 좋은 선택)
- Docker 컨테이너 기반
- 선택지 A: AWS ECS/Fargate(이력서 임팩트 큼)
- 선택지 B: Fly.io / Render / Railway(간편)
- DB: Managed Postgres(예: RDS/Supabase/Neon)
- Redis: Managed Redis(Elasticache 또는 Upstash)

---

## 12) 프론트엔드(권장 조합 — SSR 최소 복잡도)
- Spring Boot MVC + Thymeleaf(SSR)
- HTMX(부분 갱신) + Tailwind(스타일)
- Alpine.js(선택): 모달/드롭다운 등 최소 UI 상태
- 지도: 카카오맵/네이버맵 SDK(필요 화면에서만 최소 JS)
- 인증 연동: OAuth2 로그인 후 백엔드 JWT 교환

---

## 13) “이력서에 강하게 쓰는 구현 포인트” 체크리스트
- [ ] Cursor pagination 기반 피드 성능 최적화(인덱스 설계 포함)
- [ ] QueryDSL로 동적 필터/정렬 구현
- [ ] 신고 기반 자동 블라인드(운영 정책 엔진)
- [ ] Redis 기반 rate limit + 스팸 방지
- [ ] 이벤트 기반 비동기 처리(알림/검색 인덱싱/이미지 처리)
- [ ] Testcontainers로 통합 테스트 구성
- [ ] CI/CD + Docker 배포
- [ ] 관측성(로그/메트릭/트레이싱 중 최소 1개)

---

## 14) 최종 권장 스택(“그냥 이대로 가면 됨”)
- Backend: Spring Boot 3.x, Spring Security(OAuth2+JWT), JPA+QueryDSL, Flyway
- DB: PostgreSQL
- Cache/RateLimit: Redis
- Async: RabbitMQ(또는 Kafka) + Spring
- Storage: S3/R2 + presigned URL
- Observability: Micrometer + (Prometheus/Grafana 선택), Sentry(선택)
- Deploy: Docker + (ECS/Fargate 또는 Fly.io/Render)
- Front: Thymeleaf(SSR) + HTMX + Tailwind (+ Alpine 선택) + 카카오/네이버 지도 SDK