# TownPet-DDL-Blueprint.md
> 위치(권장): `docs/04_architecture/TownPet-DDL-Blueprint.md`  
> DB: PostgreSQL / 마이그레이션: Flyway  
> 목적: TownPet MVP(SSR+HTMX) 구현을 위한 **핵심 테이블/인덱스/제약(Unique/Check)** 초안을 고정한다.  
> 원칙: “정규화는 과하지 않게”, 그러나 **운영/스팸/분쟁**을 막을 최소 제약은 초기에 넣는다.

---

## 0) 공통 컬럼 규약

### 0.1 모든 엔티티 공통(권장)
- `id BIGINT` (PK)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `created_by BIGINT NULL` (user id)
- `updated_by BIGINT NULL`
- `is_deleted BOOLEAN NOT NULL DEFAULT false` (soft delete)
- `hidden_at TIMESTAMPTZ NULL` (moderation hide)
- `hidden_reason_code VARCHAR(50) NULL`

> 참고: “is_deleted”와 “hidden_at”은 목적이 다르다.  
> - 삭제(is_deleted): 작성자/관리자에 의해 콘텐츠 자체를 내린 상태  
> - 숨김(hidden_at): 신고/정책 위반으로 노출만 차단 (운영 복구 가능)

### 0.2 Enum 저장 방식(MVP)
- DB enum 타입 대신 `VARCHAR` + `CHECK` 권장(마이그레이션 유연성)

---

## 1) 사용자/인증

### 1.1 users
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','BANNED')),
  nickname VARCHAR(20) NOT NULL,
  bio VARCHAR(160),
  default_neighborhood_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX ux_users_nickname ON users (nickname) WHERE is_deleted = false;

### 1.2 oauth_accounts

```sql
CREATE TABLE oauth_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('GOOGLE','KAKAO','NAVER','APPLE','GITHUB')),
  provider_user_id VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_oauth_provider_user ON oauth_accounts(provider, provider_user_id);
CREATE INDEX ix_oauth_user ON oauth_accounts(user_id);
```

### 1.3 pet_profiles

```sql
CREATE TABLE pet_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('DOG','CAT','OTHER')),
  name VARCHAR(20) NOT NULL,
  breed VARCHAR(30),
  age_years INT CHECK (age_years BETWEEN 0 AND 30),
  neutered BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_pet_user ON pet_profiles(user_id);
```

---

## 2) 동네(Neighborhood)

### 2.1 neighborhoods

```sql
CREATE TABLE neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  city VARCHAR(40) NOT NULL,
  district VARCHAR(40) NOT NULL,
  name VARCHAR(60) NOT NULL,           -- 표시명 (예: "망원동", "서교동")
  slug VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_neighborhood_slug ON neighborhoods(slug);
CREATE INDEX ix_neighborhood_city_dist ON neighborhoods(city, district);
```

### 2.2 user_neighborhoods

```sql
CREATE TABLE user_neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  level VARCHAR(20) NOT NULL DEFAULT 'JOINED' CHECK (level IN ('NONE','JOINED','VERIFIED')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX ux_user_neighborhood ON user_neighborhoods(user_id, neighborhood_id) WHERE is_deleted = false;
CREATE INDEX ix_user_neighborhood_neighborhood ON user_neighborhoods(neighborhood_id, level);
```

---

## 3) Places + Reviews (Local 핵심)

### 3.1 places

```sql
CREATE TABLE places (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('HOSPITAL','GROOMING','CAFE','RESTAURANT','ETC')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PENDING','REJECTED','CLOSED')),
  name VARCHAR(60) NOT NULL,
  address_text VARCHAR(120),
  phone VARCHAR(40),
  tags TEXT[],                          -- MVP: 배열로 저장, 후속 정규화 가능
  description VARCHAR(500),

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_by BIGINT REFERENCES users(id),
  updated_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_places_neighborhood_created ON places(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_places_type ON places(type);
CREATE INDEX ix_places_status ON places(status);
CREATE INDEX ix_places_tags_gin ON places USING GIN(tags);
-- 중복 방지(동네+타입+이름)
CREATE UNIQUE INDEX ux_places_unique_name ON places(neighborhood_id, type, name) WHERE is_deleted = false;
```

### 3.2 place_reviews

```sql
CREATE TABLE place_reviews (
  id BIGSERIAL PRIMARY KEY,
  place_id BIGINT NOT NULL REFERENCES places(id),
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  reviewer_user_id BIGINT NOT NULL REFERENCES users(id),

  visited_date DATE NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('HOSPITAL','FOOD','CAFE','ETC')),
  service_item VARCHAR(60),

  cost_won INT CHECK (cost_won BETWEEN 0 AND 10000000),
  wait_minutes INT CHECK (wait_minutes BETWEEN 0 AND 600),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),

  pros VARCHAR(800),
  cons VARCHAR(800),

  images JSONB,                         -- [{url:"..."}, ...] MVP
  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_place_reviews_place_created ON place_reviews(place_id, created_at DESC, id DESC);
CREATE INDEX ix_place_reviews_neighborhood_created ON place_reviews(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_place_reviews_user ON place_reviews(reviewer_user_id);
```

---

## 4) Walks

### 4.1 walk_routes

```sql
CREATE TABLE walk_routes (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  author_user_id BIGINT NOT NULL REFERENCES users(id),

  title VARCHAR(60) NOT NULL,
  summary VARCHAR(300),
  duration_minutes INT CHECK (duration_minutes BETWEEN 1 AND 300),
  distance_km_x10 INT CHECK (distance_km_x10 BETWEEN 1 AND 300), -- 0.1km 단위
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
  tags TEXT[],
  notes VARCHAR(800),
  route_geojson TEXT,                   -- 후속 지도 단계에서 사용

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_walk_neighborhood_created ON walk_routes(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_walk_tags_gin ON walk_routes USING GIN(tags);
CREATE INDEX ix_walk_author ON walk_routes(author_user_id);
```

---

## 5) Feed/Posts/Comments (공통 기반)

### 5.1 posts

```sql
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  scope VARCHAR(10) NOT NULL CHECK (scope IN ('LOCAL','GLOBAL')),
  neighborhood_id BIGINT REFERENCES neighborhoods(id), -- LOCAL이면 NOT NULL을 서비스에서 강제
  author_user_id BIGINT NOT NULL REFERENCES users(id),

  title VARCHAR(80),
  content TEXT NOT NULL,                -- MVP: 길이 제한은 서비스/검증으로
  tags TEXT[],
  images JSONB,

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_posts_scope_created ON posts(scope, created_at DESC, id DESC);
CREATE INDEX ix_posts_neighborhood_created ON posts(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_posts_tags_gin ON posts USING GIN(tags);
```

### 5.2 comments

```sql
CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('POST','PLACE_REVIEW','MARKET_LISTING','MISSING_REPORT','JOB_POST')),
  target_id BIGINT NOT NULL,
  author_user_id BIGINT NOT NULL REFERENCES users(id),
  content VARCHAR(800) NOT NULL,

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_comments_target_created ON comments(target_type, target_id, created_at DESC, id DESC);
CREATE INDEX ix_comments_author ON comments(author_user_id);
```

---

## 6) Market (중고/대여/나눔)

### 6.1 market_listings

```sql
CREATE TABLE market_listings (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  seller_user_id BIGINT NOT NULL REFERENCES users(id),

  type VARCHAR(10) NOT NULL CHECK (type IN ('USED','RENTAL','SHARE')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESERVED','COMPLETED','DISPUTED','CANCELLED')),

  title VARCHAR(60) NOT NULL,
  description VARCHAR(800),
  price_won INT CHECK (price_won BETWEEN 0 AND 10000000),
  deposit_won INT CHECK (deposit_won BETWEEN 0 AND 10000000),
  rental_days_max INT CHECK (rental_days_max BETWEEN 1 AND 30),
  images JSONB,

  reserved_by_user_id BIGINT REFERENCES users(id),
  reserved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_market_neighborhood_created ON market_listings(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_market_status ON market_listings(status);
CREATE INDEX ix_market_seller ON market_listings(seller_user_id);
```

---

## 7) Jobs / Care

### 7.1 job_posts

```sql
CREATE TABLE job_posts (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  author_user_id BIGINT NOT NULL REFERENCES users(id),

  type VARCHAR(30) NOT NULL CHECK (type IN ('PET_SITTING','DOG_WALKING','GROOMING_HELP','ERRAND','ETC')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','CANCELLED')),

  title VARCHAR(60) NOT NULL,
  description VARCHAR(800),

  start_date DATE NOT NULL,
  end_date DATE,
  pay_per_hour_won INT CHECK (pay_per_hour_won BETWEEN 0 AND 1000000),
  pay_total_won INT CHECK (pay_total_won BETWEEN 0 AND 10000000),
  location_text VARCHAR(120),
  requirements TEXT[],                 -- CSV 대신 배열
  openings INT CHECK (openings BETWEEN 1 AND 10),

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_job_neighborhood_created ON job_posts(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_job_status ON job_posts(status);
```

### 7.2 job_applications

```sql
CREATE TABLE job_applications (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES job_posts(id),
  applicant_user_id BIGINT NOT NULL REFERENCES users(id),
  message VARCHAR(800) NOT NULL,
  available_time_text VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','WITHDRAWN','REJECTED','ACCEPTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_job_apply_unique ON job_applications(job_id, applicant_user_id);
CREATE INDEX ix_job_apply_job ON job_applications(job_id, created_at DESC, id DESC);
```

### 7.3 care_requests

```sql
CREATE TABLE care_requests (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  requester_user_id BIGINT NOT NULL REFERENCES users(id),

  type VARCHAR(30) NOT NULL CHECK (type IN ('EMERGENCY_SITTING','ERRAND','SHORT_VISIT','ETC')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CANCELLED','MATCHED','COMPLETED')),

  title VARCHAR(60) NOT NULL,
  details VARCHAR(800),
  required_from TIMESTAMPTZ NOT NULL,
  required_to TIMESTAMPTZ NOT NULL,
  budget_won INT CHECK (budget_won BETWEEN 0 AND 10000000),
  location_text VARCHAR(80),

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_care_neighborhood_created ON care_requests(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_care_status ON care_requests(status);
```

---

## 8) Missing / Lost & Found

### 8.1 missing_reports

```sql
CREATE TABLE missing_reports (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  reporter_user_id BIGINT NOT NULL REFERENCES users(id),

  type VARCHAR(10) NOT NULL CHECK (type IN ('LOST','FOUND','STRAY')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','CANCELLED')),

  pet_name_or_label VARCHAR(40) NOT NULL,
  breed VARCHAR(30),
  occurred_at TIMESTAMPTZ NOT NULL,
  location_text VARCHAR(80),
  description VARCHAR(800),
  images JSONB,

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX ix_missing_neighborhood_created ON missing_reports(neighborhood_id, created_at DESC, id DESC);
CREATE INDEX ix_missing_status ON missing_reports(status);
```

---

## 9) Moderation / Reports / Audit

### 9.1 reports

```sql
CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_user_id BIGINT NOT NULL REFERENCES users(id),

  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('POST','COMMENT','PLACE_REVIEW','MARKET_LISTING','USER','MISSING_REPORT','JOB_POST')),
  target_id BIGINT NOT NULL,

  reason VARCHAR(20) NOT NULL CHECK (reason IN ('SPAM','SCAM','HARASSMENT','ILLEGAL','OTHER')),
  detail VARCHAR(400),

  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','REJECTED')),
  resolved_action VARCHAR(20) CHECK (resolved_action IN ('NONE','HIDE','RESTORE','BAN')),
  resolved_by BIGINT REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_reports_dedup ON reports(reporter_user_id, target_type, target_id);
CREATE INDEX ix_reports_target ON reports(target_type, target_id, created_at DESC, id DESC);
CREATE INDEX ix_reports_status ON reports(status, created_at DESC, id DESC);
```

### 9.2 audit_logs

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id),
  action VARCHAR(40) NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id BIGINT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_audit_created ON audit_logs(created_at DESC, id DESC);
CREATE INDEX ix_audit_target ON audit_logs(target_type, target_id, created_at DESC, id DESC);
```

---

## 10) Notifications (선택: 웹 알림)

### 10.1 notifications

```sql
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  payload JSONB NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_notifications_user_created ON notifications(user_id, created_at DESC, id DESC);
```

---

## 11) MVP에서 “반드시 넣어야 하는 Unique/Index 요약

### Unique

* oauth: `(provider, provider_user_id)`
* user_neighborhood: `(user_id, neighborhood_id)` (soft delete 제외)
* place: `(neighborhood_id, type, name)` (soft delete 제외)
* report: `(reporter_user_id, target_type, target_id)`
* job_application: `(job_id, applicant_user_id)`

### Cursor 인덱스(필수)

* (neighborhood_id, created_at desc, id desc) 계열: places/walk/market/job/care/missing
* (scope, created_at desc, id desc) 또는 (neighborhood_id, created_at desc, id desc): posts
* (target_type, target_id, created_at desc, id desc): comments

---

## 12) Flyway 파일 네이밍(권장)

* `V1__init_core_tables.sql`
* `V2__add_moderation_tables.sql`
* `V3__add_notifications.sql`

---

---

# TownPet-Repository-Contract.md

> 위치(권장): `docs/04_architecture/TownPet-Repository-Contract.md`
> 목적: 서비스 계약을 지키기 위한 **Repository 인터페이스/Query 메서드(커서 페이징/필터/정렬)** 목록을 고정한다.
> 원칙: 단순 CRUD는 Spring Data JPA, 커서/검색/필터는 `*QueryRepository`로 분리(QueryDSL 권장).

---

## 0) 공통 규약

### 0.1 Repository 분리

* `XxxRepository` (Spring Data JPA): CRUD, byId, exists, count
* `XxxQueryRepository` (QueryDSL): list/search/filter/cursor

### 0.2 Cursor 규약

* Cursor는 `(created_at, id)` 기준으로 한다(정렬 안정성).
* 정렬 기본은 `created_at DESC, id DESC`.
* Cursor 문자열은 다음 중 택1:

  * A) `"2026-01-01T00:00:00Z_12345"` (서비스에서 파싱)
  * B) Base64 인코딩(후속)

---

## 1) User/Auth

### 1.1 UserRepository

```java
public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByIdAndIsDeletedFalse(Long id);
  boolean existsByNicknameAndIsDeletedFalse(String nickname);
}
```

### 1.2 OAuthAccountRepository

```java
public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, Long> {
  Optional<OAuthAccount> findByProviderAndProviderUserId(String provider, String providerUserId);
  List<OAuthAccount> findAllByUserId(Long userId);
}
```

### 1.3 PetProfileRepository

```java
public interface PetProfileRepository extends JpaRepository<PetProfile, Long> {
  List<PetProfile> findAllByUserIdAndIsDeletedFalse(Long userId);
}
```

---

## 2) Neighborhood

### 2.1 NeighborhoodRepository

```java
public interface NeighborhoodRepository extends JpaRepository<Neighborhood, Long> {
  Optional<Neighborhood> findBySlug(String slug);
  List<Neighborhood> findByCityAndDistrict(String city, String district);
}
```

### 2.2 UserNeighborhoodRepository

```java
public interface UserNeighborhoodRepository extends JpaRepository<UserNeighborhood, Long> {
  Optional<UserNeighborhood> findByUserIdAndNeighborhoodIdAndIsDeletedFalse(Long userId, Long neighborhoodId);
  List<UserNeighborhood> findAllByUserIdAndIsDeletedFalse(Long userId);
}
```

---

## 3) Places/Reviews

### 3.1 PlaceRepository

```java
public interface PlaceRepository extends JpaRepository<Place, Long> {
  Optional<Place> findByIdAndIsDeletedFalse(Long id);
  boolean existsByNeighborhoodIdAndTypeAndNameAndIsDeletedFalse(Long neighborhoodId, PlaceType type, String name);
}
```

### 3.2 PlaceQueryRepository (QueryDSL)

```java
public interface PlaceQueryRepository {
  CursorPage<PlaceCardDto> listPlaces(long neighborhoodId,
                                      ListFilter filter,
                                      CursorRequest cursor,
                                      boolean includePendingForAdmin);
}
```

필터/정렬 권장 지원:

* `filter.q` (name LIKE)
* `filter.tags` (tags overlap)
* `filter.sort`:

  * `RECENT` (default)
  * `WAIT_SHORT` (리뷰 기반 정렬은 후속: materialized view 없으면 비용 큼)
  * `COST_LOW` (동일)

### 3.3 PlaceReviewRepository

```java
public interface PlaceReviewRepository extends JpaRepository<PlaceReview, Long> {
  Optional<PlaceReview> findByIdAndIsDeletedFalse(Long id);
  long countByPlaceIdAndIsDeletedFalse(Long placeId);
}
```

### 3.4 PlaceReviewQueryRepository

```java
public interface PlaceReviewQueryRepository {
  CursorPage<PlaceReviewDto> listReviews(long placeId, CursorRequest cursor);
}
```

---

## 4) Walks

### 4.1 WalkRouteRepository

```java
public interface WalkRouteRepository extends JpaRepository<WalkRoute, Long> {
  Optional<WalkRoute> findByIdAndIsDeletedFalse(Long id);
}
```

### 4.2 WalkQueryRepository

```java
public interface WalkQueryRepository {
  CursorPage<WalkCardDto> listWalks(long neighborhoodId, ListFilter filter, CursorRequest cursor);
}
```

---

## 5) Posts/Comments

### 5.1 PostRepository

```java
public interface PostRepository extends JpaRepository<Post, Long> {
  Optional<Post> findByIdAndIsDeletedFalse(Long id);
}
```

### 5.2 PostQueryRepository

```java
public interface PostQueryRepository {
  CursorPage<FeedItemDto> listLocalFeed(long neighborhoodId, ListFilter filter, CursorRequest cursor);
  CursorPage<FeedItemDto> listGlobalFeed(ListFilter filter, CursorRequest cursor);
}
```

### 5.3 CommentRepository

```java
public interface CommentRepository extends JpaRepository<Comment, Long> {
  Optional<Comment> findByIdAndIsDeletedFalse(Long id);
}
```

### 5.4 CommentQueryRepository

```java
public interface CommentQueryRepository {
  CursorPage<CommentDto> listComments(ReportTargetType targetType, long targetId, CursorRequest cursor);
}
```

---

## 6) Market

### 6.1 MarketListingRepository

```java
public interface MarketListingRepository extends JpaRepository<MarketListing, Long> {
  Optional<MarketListing> findByIdAndIsDeletedFalse(Long id);
}
```

### 6.2 MarketQueryRepository

```java
public interface MarketQueryRepository {
  CursorPage<MarketListingCardDto> listListings(long neighborhoodId, ListFilter filter, CursorRequest cursor);
}
```

**상태 전이 동시성(권장)**

* reserve/complete는 “낙관적 락(@Version)” 또는 “조건부 업데이트” 중 택1
* Repository 레벨 조건부 update 예시(선택):

  * `UPDATE market_listings SET status='RESERVED' ... WHERE id=? AND status='OPEN'`

---

## 7) Jobs

### 7.1 JobPostRepository

```java
public interface JobPostRepository extends JpaRepository<JobPost, Long> {
  Optional<JobPost> findByIdAndIsDeletedFalse(Long id);
}
```

### 7.2 JobQueryRepository

```java
public interface JobQueryRepository {
  CursorPage<JobCardDto> listJobs(long neighborhoodId, ListFilter filter, CursorRequest cursor);
}
```

### 7.3 JobApplicationRepository

```java
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {
  boolean existsByJobIdAndApplicantUserId(Long jobId, Long applicantUserId);
  List<JobApplication> findAllByJobIdOrderByCreatedAtDesc(Long jobId);
}
```

---

## 8) Care

### 8.1 CareRequestRepository

```java
public interface CareRequestRepository extends JpaRepository<CareRequest, Long> {
  Optional<CareRequest> findByIdAndIsDeletedFalse(Long id);
}
```

### 8.2 CareQueryRepository

```java
public interface CareQueryRepository {
  CursorPage<CareCardDto> listCareRequests(long neighborhoodId, ListFilter filter, CursorRequest cursor);
}
```

---

## 9) Missing

### 9.1 MissingReportRepository

```java
public interface MissingReportRepository extends JpaRepository<MissingReport, Long> {
  Optional<MissingReport> findByIdAndIsDeletedFalse(Long id);
}
```

### 9.2 MissingQueryRepository

```java
public interface MissingQueryRepository {
  CursorPage<MissingCardDto> listReports(long neighborhoodId, CursorRequest cursor);
}
```

---

## 10) Moderation/Reports/Audit

### 10.1 ReportRepository

```java
public interface ReportRepository extends JpaRepository<Report, Long> {
  boolean existsByReporterUserIdAndTargetTypeAndTargetId(Long reporterUserId, ReportTargetType type, Long targetId);
  long countByTargetTypeAndTargetId(ReportTargetType type, Long targetId);
}
```

### 10.2 ReportQueryRepository

```java
public interface ReportQueryRepository {
  CursorPage<ReportDto> listReportsForAdmin(CursorRequest cursor, ListFilter filter);
}
```

### 10.3 AuditLogRepository

```java
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {}
```

---

## 11) Notifications (선택)

### 11.1 NotificationRepository

```java
public interface NotificationRepository extends JpaRepository<Notification, Long> {
  CursorPage<NotificationDto> findByUserIdOrderByCreatedAtDesc(Long userId, CursorRequest cursor); // Query 분리 권장
}
```

---

## 12) 커서 Query 공통 구현 스케치(QueryDSL)

### 12.1 조건 생성

* 정렬: `createdAt.desc(), id.desc()`
* cursor가 있을 때:

  * `(createdAt < cursorCreatedAt) OR (createdAt = cursorCreatedAt AND id < cursorId)`

### 12.2 nextCursor 생성

* 반환 items의 마지막 원소 `(createdAt, id)`를 이용

---

## 13) “반드시” 지켜야 하는 노출 조건(Repository/Query 레벨)

모든 list 조회 기본 where 절:

* `is_deleted = false`
* `hidden_at is null` (관리자 조회 제외)

> 이 조건을 Repository/Query에서 일관되게 처리하면, 서비스/컨트롤러에서 실수할 확률이 크게 줄어든다.

```

원하면, 다음 단계로 위 DDL/Repo 계약에 맞춰 **“핵심 6개 테이블(places/reviews, market, jobs, missing, reports)”의 Flyway V1 SQL**을 실제 실행 가능한 형태로 바로 만들어 드릴 수 있습니다.
::contentReference[oaicite:0]{index=0}
```
