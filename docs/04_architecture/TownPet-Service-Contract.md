# TownPet-Service-Contract.md
> 위치: `docs/04_architecture/TownPet-Service-Contract.md`  
> 목적: TownPet의 도메인 서비스 계층을 **“메서드 시그니처/입출력/정책/트랜잭션/예외”** 수준으로 고정한다.  
> 전제: SSR(Thymeleaf) + HTMX, 라우팅은 `/p`(Page) `/f`(Fragment) `/api`(JSON)로 분리되어 있고, 컨트롤러는 서비스 계약을 준수한다.

---

## 0) 공통 서비스 규약 (필수)

### 0.1 계층 책임
- Controller: 요청 파싱, Form/Query 바인딩, View/Fragment 반환
- Service: **비즈니스 규칙(정책), 권한, 트랜잭션, 정합성**
- Repository: 영속성/조회(단순 CRUD + QueryDSL)

### 0.2 트랜잭션 규약
- 조회: `@Transactional(readOnly = true)`
- 생성/수정/상태변경: `@Transactional`
- “상태 전이”는 단일 트랜잭션에서 끝내고, 외부 호출(푸시/메일)은 Outbox 또는 after-commit로 분리

### 0.3 식별자/권한 규약
- 모든 서비스 메서드는 `actorUserId` 또는 `LoginUser`를 입력으로 받는다.
- “동네 기반(Local)” 기능은 기본적으로 `neighborhoodId`를 입력으로 받거나, actor의 현재 동네에서 유도한다.

### 0.4 페이징 규약 (Cursor)
- 피드/리스트는 기본 cursor pagination
- Cursor는 최소 `createdAt + id` 조합을 전제
- 반환은 공통 `CursorPage<T>`를 사용

```java
public record CursorPage<T>(
  List<T> items,
  String nextCursor
) {}

### 0.5 예외/에러 코드 규약

* 서비스는 `BusinessException(ErrorCode)`만 던진다(컨트롤러에서 변환 금지).
* 대표 ErrorCode:

  * `AUTH_REQUIRED`
  * `FORBIDDEN`
  * `NOT_FOUND`
  * `VALIDATION_FAILED`
  * `RATE_LIMITED`
  * `DUPLICATE_RESOURCE`
  * `POLICY_RESTRICTED` (동네 미인증 등)
  * `STATE_CONFLICT` (예약/완료 충돌)
  * `CONTENT_BLOCKED` (블라인드/삭제된 콘텐츠)

---

## 1) 공통 정책 컴포넌트

### 1.1 NeighborhoodPolicyService

* 목적: “동네 인증 레벨/권한”을 단일 컴포넌트로 묶는다.

```java
public interface NeighborhoodPolicyService {
  void requireMembership(long actorUserId, long neighborhoodId);
  void requireVerifiedForPosting(long actorUserId, long neighborhoodId);   // 마켓/실종/구인 등
  NeighborhoodContext resolveContext(long actorUserId);                    // 현재 동네/레벨
}
```

```java
public record NeighborhoodContext(
  long neighborhoodId,
  NeighborhoodLevel level   // NONE/JOINED/VERIFIED
) {}
```

### 1.2 RateLimitService

* 목적: 스팸/도배 차단(특히 POST 계열)

```java
public interface RateLimitService {
  void checkOrThrow(String key, int limit, Duration window);  // 초과 시 RATE_LIMITED
}
```

권장 키 전략:

* `post:create:{userId}`
* `comment:create:{userId}`
* `report:create:{userId}`
* `missing:create:{userId}`

### 1.3 ModerationPolicyService

* 목적: 신고 누적/정책 위반 시 자동 블라인드 룰 적용

```java
public interface ModerationPolicyService {
  ModerationDecision evaluate(ReportTargetType type, long targetId);
}
```

```java
public record ModerationDecision(
  boolean shouldHide,
  String reasonCode
) {}
```

---

## 2) Auth/User/Neighborhood Services

### 2.1 AuthService (OAuth2 + Session)

```java
public interface AuthService {
  LoginUser ensureUserForOAuth2(OAuth2UserInfo userInfo);  // 최초가입/재로그인
}
```

정책:

* OAuth2 식별자(provider+providerId) 중복 금지
* 신규 유저는 기본 동네 미설정 상태

### 2.2 UserService

```java
public interface UserService {
  UserDto getMe(long actorUserId);

  UserDto updateProfile(long actorUserId, UserProfileForm form);

  PetProfileDto upsertPetProfile(long actorUserId, PetProfileForm form);
}
```

예외:

* `NOT_FOUND` (유저 없음)

### 2.3 NeighborhoodService

```java
public interface NeighborhoodService {
  NeighborhoodDto selectNeighborhood(long actorUserId, NeighborhoodSelectForm form);

  NeighborhoodContext getContext(long actorUserId);

  // 후속: 인증 요청/승인
  void requestVerification(long actorUserId, long neighborhoodId);
}
```

정책:

* user-neighborhood 매핑이 없으면 생성
* 인증 레벨은 운영 정책에 따라 변경

---

## 3) Place / Review Services (Local 핵심)

### 3.1 PlaceService

```java
public interface PlaceService {

  @Transactional(readOnly = true)
  CursorPage<PlaceCardDto> listPlaces(long actorUserId,
                                      long neighborhoodId,
                                      ListFilter filter,
                                      CursorRequest cursor);

  @Transactional(readOnly = true)
  PlaceDetailDto getPlaceDetail(long actorUserId, long placeId);

  @Transactional
  PlaceDto createPlace(long actorUserId, PlaceCreateForm form);

  // 후속(관리/수정)
  @Transactional
  PlaceDto updatePlace(long actorUserId, long placeId, PlaceCreateForm form);
}
```

정책/검증:

* `requireMembership(actorUserId, neighborhoodId)`
* 장소 등록은 스팸 경로 → MVP에서:

  * (A) VERIFIED만 허용, 또는
  * (B) 등록은 가능하되 “PENDING” 상태로 숨김 후 관리자 승인
* `DUPLICATE_RESOURCE`: 같은 동네에서 동일 name+type 중복 등록(유사도는 후속)

예외:

* `NOT_FOUND` (placeId)
* `POLICY_RESTRICTED` (동네 권한 부족)
* `RATE_LIMITED` (등록 도배)

### 3.2 PlaceReviewService

```java
public interface PlaceReviewService {

  @Transactional(readOnly = true)
  CursorPage<PlaceReviewDto> listReviews(long actorUserId,
                                         long placeId,
                                         CursorRequest cursor);

  @Transactional
  PlaceReviewDto createReview(long actorUserId,
                              long placeId,
                              PlaceReviewForm form);

  @Transactional
  void deleteReview(long actorUserId, long reviewId);
}
```

정책/검증:

* 리뷰 작성은 “동네 기반 콘텐츠” → place의 neighborhoodId에 대해 membership 요구
* `visitedDate` 미래 금지
* `rating` 1~5 강제
* `costWon`, `waitMinutes`는 0이면 null로 정규화 권장

예외:

* `NOT_FOUND` (place/review)
* `FORBIDDEN` (타인 리뷰 삭제)
* `POLICY_RESTRICTED`

---

## 4) Walk Services

### 4.1 WalkService

```java
public interface WalkService {

  @Transactional(readOnly = true)
  CursorPage<WalkCardDto> listWalks(long actorUserId,
                                   long neighborhoodId,
                                   ListFilter filter,
                                   CursorRequest cursor);

  @Transactional
  WalkDto createWalk(long actorUserId, WalkRouteForm form);

  @Transactional
  void deleteWalk(long actorUserId, long walkId);
}
```

정책:

* membership required
* routeGeoJson은 MVP에서는 optional(없어도 등록 가능)

예외:

* `NOT_FOUND`, `FORBIDDEN`, `POLICY_RESTRICTED`

---

## 5) Post/Feed/Comment (Local/Global 공통 기반)

### 5.1 PostService

```java
public interface PostService {

  @Transactional(readOnly = true)
  CursorPage<FeedItemDto> listLocalFeed(long actorUserId,
                                       long neighborhoodId,
                                       ListFilter filter,
                                       CursorRequest cursor);

  @Transactional(readOnly = true)
  CursorPage<FeedItemDto> listGlobalFeed(long actorUserId,
                                        ListFilter filter,
                                        CursorRequest cursor);

  @Transactional
  PostDto createPost(long actorUserId, PostForm form);   // 후속: GLOBAL/LOCAL scope

  @Transactional
  void deletePost(long actorUserId, long postId);
}
```

정책:

* Local 작성은 membership required
* Global 작성은 계정 레벨/신뢰도 정책 가능(후속)
* 블라인드된 콘텐츠는 조회에서 제외(`CONTENT_BLOCKED` 또는 필터링)

### 5.2 CommentService

```java
public interface CommentService {

  @Transactional(readOnly = true)
  CursorPage<CommentDto> listComments(long actorUserId,
                                      ReportTargetType parentType,   // POST 등
                                      long parentId,
                                      CursorRequest cursor);

  @Transactional
  CommentDto createComment(long actorUserId, CommentForm form);

  @Transactional
  void deleteComment(long actorUserId, long commentId);
}
```

정책:

* 댓글 도배는 rate limit 필수
* 금칙어/링크 제한(선택: content sanitizer)

예외:

* `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`

---

## 6) Market Services (중고/대여/나눔)

### 6.1 MarketListingService

```java
public interface MarketListingService {

  @Transactional(readOnly = true)
  CursorPage<MarketListingCardDto> listListings(long actorUserId,
                                                long neighborhoodId,
                                                ListFilter filter,
                                                CursorRequest cursor);

  @Transactional
  MarketListingDto createListing(long actorUserId, MarketListingForm form);

  @Transactional
  MarketListingDto reserve(long actorUserId, long listingId);

  @Transactional
  MarketListingDto complete(long actorUserId, long listingId);

  @Transactional
  void deleteListing(long actorUserId, long listingId);
}
```

정책/상태 전이(강제):

* membership + (권장) verified required for posting
* 상태:

  * `OPEN` → `RESERVED` (reserve)
  * `RESERVED` → `COMPLETED` (complete)
* 전이 불가 시 `STATE_CONFLICT`

권한:

* reserve는 로그인 유저 누구나 가능(동네 제한은 listing의 neighborhood 기준)
* complete/delete는 기본적으로 “작성자”만 가능(또는 예약자/작성자 모두 가능한 정책을 선택)

예외:

* `NOT_FOUND`, `POLICY_RESTRICTED`, `STATE_CONFLICT`, `FORBIDDEN`, `RATE_LIMITED`

---

## 7) Jobs / Care Services

### 7.1 JobService

```java
public interface JobService {

  @Transactional(readOnly = true)
  CursorPage<JobCardDto> listJobs(long actorUserId,
                                  long neighborhoodId,
                                  ListFilter filter,
                                  CursorRequest cursor);

  @Transactional
  JobPostDto createJob(long actorUserId, JobPostForm form);

  @Transactional
  JobApplicationDto apply(long actorUserId, long jobId, JobApplyForm form);

  @Transactional
  void closeJob(long actorUserId, long jobId);  // 모집 종료

  @Transactional
  void deleteJob(long actorUserId, long jobId);
}
```

정책:

* create/apply는 rate limit
* apply 중복 방지(유저-채용글 unique)
* 글 작성은 verified 권장

예외:

* `DUPLICATE_RESOURCE` (중복 지원)
* `STATE_CONFLICT` (닫힌 공고에 지원)
* `POLICY_RESTRICTED`, `RATE_LIMITED`, `FORBIDDEN`, `NOT_FOUND`

### 7.2 CareService

```java
public interface CareService {

  @Transactional(readOnly = true)
  CursorPage<CareCardDto> listCareRequests(long actorUserId,
                                           long neighborhoodId,
                                           ListFilter filter,
                                           CursorRequest cursor);

  @Transactional
  CareRequestDto createCareRequest(long actorUserId, CareRequestForm form);

  @Transactional
  void cancelCareRequest(long actorUserId, long requestId);
}
```

정책:

* time window 검증(requiredTo > requiredFrom)
* 긴급 요청은 verified 요구 가능(후속)
* 도배 방지 rate limit 필수

---

## 8) Missing Services (실종/유기 신고)

### 8.1 MissingService

```java
public interface MissingService {

  @Transactional(readOnly = true)
  CursorPage<MissingCardDto> listReports(long actorUserId,
                                         long neighborhoodId,
                                         CursorRequest cursor);

  @Transactional
  MissingReportDto createReport(long actorUserId, MissingReportForm form);

  @Transactional
  void markResolved(long actorUserId, long reportId);   // 해결 처리

  @Transactional
  void deleteReport(long actorUserId, long reportId);
}
```

정책:

* verified required for posting(권장) — 허위 신고 리스크
* occurredAt 미래 금지
* 신고 글은 “노출 우선”이지만 스팸/사기 방지를 위해 링크/연락처 제한 권장
* 후속: 인근 푸시/알림은 Outbox로 분리

---

## 9) Moderation Services (신고/블라인드/감사로그)

### 9.1 ReportService

```java
public interface ReportService {

  @Transactional
  ReportDto createReport(long actorUserId, ReportForm form);

  @Transactional(readOnly = true)
  CursorPage<ReportDto> listReportsForAdmin(long adminUserId,
                                            CursorRequest cursor,
                                            ListFilter filter);

  @Transactional
  ReportDto resolveReport(long adminUserId, long reportId, String action); // HIDE/RESTORE/BAN
}
```

정책:

* createReport는 rate limit
* 유저가 같은 타겟에 중복 신고 불가(unique)
* 신고 누적 시 `ModerationPolicyService`로 자동 hide 결정
* resolveReport는 ADMIN role 필수

예외:

* `DUPLICATE_RESOURCE`, `RATE_LIMITED`, `FORBIDDEN`, `NOT_FOUND`

### 9.2 ModerationActionService (선택: 분리)

```java
public interface ModerationActionService {
  void hideTarget(ReportTargetType type, long targetId, String reasonCode);
  void restoreTarget(ReportTargetType type, long targetId);
  void banUser(long userId, String reasonCode);
}
```

### 9.3 AuditLogService (선택)

```java
public interface AuditLogService {
  void write(long actorUserId, String action, String targetType, long targetId, String detail);
}
```

---

## 10) Notification / Media (선택 최소)

### 10.1 NotificationService (초기: 웹 알림 저장)

```java
public interface NotificationService {
  void notifyNeighborhood(long neighborhoodId, String type, String payloadJson); // 후속 확장
}
```

### 10.2 MediaService (presign/attachments)

```java
public interface MediaService {
  PresignResponse presign(long actorUserId, PresignRequest req);
}
```

---

## 11) Service 구현 시 “반드시 지킬 체크리스트”

* [ ] Local 서비스는 `requireMembership` 또는 `requireVerifiedForPosting`을 호출한다
* [ ] POST/지원/신고/실종/댓글 등은 `RateLimitService`를 호출한다
* [ ] Market/Job은 상태 전이를 단일 트랜잭션에서 처리하고, 불가하면 `STATE_CONFLICT`
* [ ] 중복 지원/중복 신고/중복 등록은 DB unique + 서비스에서 `DUPLICATE_RESOURCE`
* [ ] 블라인드된 콘텐츠는 조회에서 제외하거나 `CONTENT_BLOCKED`
* [ ] 모든 조회는 cursor pagination(피드/리스트)

---

## 12) 다음 단계(권장)

이 서비스 계약을 코드로 옮기려면 아래 2개가 바로 필요합니다.

1. `TownPet-DDL-Blueprint.md` (테이블/인덱스/unique/상태 컬럼)
2. `TownPet-Repository-Contract.md` (QueryDSL/커서 조회 메서드 목록)

원하면 바로 이어서 DDL 초안(핵심 테이블만)부터 작성할 수 있습니다.

```
::contentReference[oaicite:0]{index=0}
```
