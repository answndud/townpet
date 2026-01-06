# TownPet-Form-DTO-Contract.md
> 위치: `docs/04_architecture/TownPet-Form-DTO-Contract.md`  
> 목적: TownPet의 SSR(Thymeleaf) + HTMX 구조에서 **폼 입력/검증/에러 렌더링**을 일관되게 만들기 위해, “Form DTO(입력 계약)”를 고정한다.  
> 범위: `/f/**`에서 사용하는 **@ModelAttribute Form** 중심. `/api/**`는 별도 Request DTO로 분리한다.

---

## 0) 공통 규약 (필수)

### 0.1 Form 네이밍
- `~Form` : 서버가 Thymeleaf 폼 바인딩에 사용하는 입력 DTO
- `~Request` : JSON API 입력 DTO (`@RequestBody`)
- `~Dto` : 조회용/출력용 데이터 DTO

### 0.2 검증 기본 원칙
- **서버 검증이 정답**. 프론트(Alpine/HTML5)는 UX 보조.
- `@Valid @ModelAttribute XxxForm form, BindingResult binding` 서명을 고정한다.
- 검증 실패 시:
  - **같은 폼 fragment**를 반환한다.
  - `#formErrors`(글로벌 에러) + 필드별 에러 표시를 렌더링한다.

### 0.3 문자열 정규화(권장)
- 모든 `String`은 서비스 계층 진입 전에 `trim()` + 빈문자열→null 정규화를 권장
- 링크/연락처는 “초기 MVP에서는 제한”하거나 엄격한 검증을 둔다(스팸 방지)

### 0.4 공통 제한(강제)
- 모든 텍스트 입력은 최대 길이를 둔다(스팸/DB 부하/UX)
- 숫자 입력은 최소/최대 범위를 둔다(비정상 값 방지)

---

## 1) 공통 Form 컴포넌트

### 1.1 공통: Pagination/Search
> 컨트롤러 쿼리 파라미터 바인딩용(폼이 아니라 조회 파라미터 계약)

```java
public record CursorRequest(
  String cursor,          // "2026-01-01T00:00:00Z_12345"
  Integer size            // default 20, max 50
) {}

```java
public record ListFilter(
  String q,               // 검색어
  String sort,            // e.g. "RECENT"
  String[] tags           // optional
) {}
```

### 1.2 공통: 주소/위치(초기 단계)

> 지도 SDK 연동 전에는 “동네 선택 + 상세 위치 텍스트”로 시작한다.

```java
public record SimpleLocationForm(
  @NotNull Long neighborhoodId,
  @Size(max = 80) String locationText   // "OO동 OO공원 입구" 같은 텍스트
) {}
```

### 1.3 공통: 이미지 첨부(초기: URL만)

* 초기에는 DB에 “업로드된 이미지 URL 리스트”만 저장
* presigned 업로드는 `/api/v1/media/presign`으로 수행하고, 결과 URL을 form에 넣는다

```java
public record ImageRefForm(
  @Size(max = 512) String url
) {}
```

---

## 2) User/Neighborhood

### 2.1 UserProfileForm

* 용도: 프로필 수정(닉네임/소개/기본 설정)
* 사용: `/f/me/profile` (선택 구현)

```java
public class UserProfileForm {
  @NotBlank
  @Size(min = 2, max = 20)
  private String nickname;

  @Size(max = 160)
  private String bio;

  // getters/setters
}
```

### 2.2 PetProfileForm

* 용도: 반려동물 기본 정보(종/나이/중성화 등)
* MVP에서는 필수 필드 최소화

```java
public class PetProfileForm {
  @NotBlank
  @Size(max = 20)
  private String name;

  @NotNull
  private PetType type;            // DOG/CAT/OTHER

  @Size(max = 30)
  private String breed;            // 자유입력(초기), 후속 DB화

  @Min(0) @Max(30)
  private Integer ageYears;

  private Boolean neutered;

  // getters/setters
}
```

### 2.3 NeighborhoodSelectForm

* 용도: 동네 선택/변경
* 인증 레벨(VERIFIED 등)은 후속(정책/운영)에서 확장

```java
public class NeighborhoodSelectForm {
  @NotNull
  private Long neighborhoodId;
}
```

---

## 3) Places / Reviews (Local 핵심)

### 3.1 PlaceCreateForm

* 용도: 장소 등록(병원/동반식당/카페/미용 등)
* MVP에서는 “장소 등록”을 운영자/승인제로 둘 수도 있음(스팸 방지)

```java
public class PlaceCreateForm {
  @NotNull
  private Long neighborhoodId;

  @NotNull
  private PlaceType type;            // HOSPITAL / GROOMING / CAFE / RESTAURANT / ETC

  @NotBlank
  @Size(min = 2, max = 60)
  private String name;

  @Size(max = 120)
  private String addressText;        // MVP: 텍스트

  @Size(max = 40)
  private String phone;              // MVP: optional, 엄격 검증 권장

  @Size(max = 200)
  private String tagsCsv;            // "동반가능,테라스,주차" (후속 정규화)

  @Size(max = 500)
  private String description;

  // getters/setters
}
```

#### 검증/정책 메모

* `name + neighborhoodId` 중복 등록 방지(서비스에서 처리)
* `phone/url` 같은 외부 링크는 스팸 경로이므로 보수적으로

---

### 3.2 PlaceReviewForm (템플릿 리뷰)

* 용도: 장소 리뷰 등록(비용/대기/진료항목 등)
* 핵심: “정형 입력”을 유지해야 비교/정렬이 가능

```java
public class PlaceReviewForm {
  @NotNull
  private Long placeId;

  @NotNull
  private LocalDate visitedDate;

  @NotNull
  private ReviewCategory category;       // HOSPITAL/FOOD/CAFE etc

  @Size(max = 60)
  private String serviceItem;            // e.g. "종합검진", "예방접종", "스케일링"

  @Min(0) @Max(10_000_000)
  private Integer costWon;               // 비용(원)

  @Min(0) @Max(600)
  private Integer waitMinutes;           // 대기시간(분)

  @Min(1) @Max(5)
  private Integer rating;                // 1~5

  @Size(max = 800)
  private String pros;                   // 좋았던 점

  @Size(max = 800)
  private String cons;                   // 아쉬운 점

  // 선택: 영수증 이미지(후속 강화)
  @Size(max = 5)
  private List<@Valid ImageRefForm> images;

  // getters/setters
}
```

#### 검증/정책 메모

* `visitedDate`는 미래 날짜 금지(서비스에서 검증)
* `costWon`, `waitMinutes`는 0 허용(미기재 의미로 null 권장)

  * 구현 시 “0을 null로 정규화” 추천

---

## 4) Walks (산책로 공유)

### 4.1 WalkRouteForm

* MVP: 지도/GeoJSON 전 단계에서는 “구간 설명 + 태그 + 위험요소”로 시작
* 후속: polyline(GeoJSON) 지원 시 `routeGeoJson` 추가

```java
public class WalkRouteForm {
  @NotNull
  private Long neighborhoodId;

  @NotBlank
  @Size(min = 2, max = 60)
  private String title;

  @Size(max = 300)
  private String summary;

  @Min(1) @Max(300)
  private Integer durationMinutes;     // 예상 소요

  @Min(1) @Max(30)
  private Integer distanceKmX10;       // 10배수 저장(예: 1.2km -> 12). 정밀도 단순화

  @NotNull
  private WalkDifficulty difficulty;   // EASY/MEDIUM/HARD

  @Size(max = 120)
  private String tagsCsv;              // "가로등,화장실,오르막,혼잡"

  @Size(max = 800)
  private String notes;                // 위험/주의

  // 후속(선택)
  @Size(max = 6000)
  private String routeGeoJson;

  // getters/setters
}
```

---

## 5) Meetups (번개/메이트)

### 5.1 MeetupCreateForm

* 실시간 번개는 “TTL 성격”이 강함 → 시간 범위는 엄격

```java
public class MeetupCreateForm {
  @NotNull
  private Long neighborhoodId;

  @NotBlank
  @Size(max = 60)
  private String title;

  @NotNull
  private LocalDateTime meetAt;        // 만날 시간

  @Min(10) @Max(240)
  private Integer durationMinutes;

  @Size(max = 80)
  private String meetPointText;        // "OO공원 정문"

  @Min(2) @Max(10)
  private Integer maxParticipants;

  @Size(max = 400)
  private String message;

  // getters/setters
}
```

#### 검증/정책 메모

* `meetAt`는 “현재~24시간 내” 같은 정책을 서비스에서 강제 가능
* 노쇼 정책은 별도(서비스/도메인)

---

## 6) Market (중고/대여/나눔)

### 6.1 MarketListingForm

* MVP에서 분쟁을 줄이려면 “상태/조건을 명확히 적게” 강제해야 함
* 연락처/외부 링크는 스팸이므로 MVP에서는 금지 권장(플랫폼 내 메시지/댓글로 유도)

```java
public class MarketListingForm {
  @NotNull
  private Long neighborhoodId;

  @NotNull
  private ListingType type;              // USED/RENTAL/SHARE

  @NotBlank
  @Size(min = 2, max = 60)
  private String title;

  @Size(max = 800)
  private String description;

  @Min(0) @Max(10_000_000)
  private Integer priceWon;              // 나눔이면 null/0 처리

  // 대여일 때만 사용
  @Min(0) @Max(10_000_000)
  private Integer depositWon;

  @Min(1) @Max(30)
  private Integer rentalDaysMax;

  @Size(max = 5)
  private List<@Valid ImageRefForm> images;

  // getters/setters
}
```

#### 정책 메모

* `type=SHARE`이면 `priceWon`는 null로 정규화
* `type=RENTAL`이면 `depositWon` 또는 `rentalDaysMax` 중 최소 1개 요구(서비스 검증)

---

## 7) Jobs (펫케어 구인/구직)

### 7.1 JobPostForm (구인글)

* “상세 로직”이 필요하다고 했으니, 상태/조건을 폼에서 정형화한다.

```java
public class JobPostForm {
  @NotNull
  private Long neighborhoodId;

  @NotNull
  private JobType type;                  // PET_SITTING/DOG_WALKING/GROOMING_HELP/ERRAND/ETC

  @NotBlank
  @Size(min = 2, max = 60)
  private String title;

  @Size(max = 800)
  private String description;

  @NotNull
  private LocalDate startDate;

  private LocalDate endDate;             // 단기/장기 구분용(선택)

  @Min(0) @Max(1_000_000)
  private Integer payPerHourWon;         // 시급
  @Min(0) @Max(10_000_000)
  private Integer payTotalWon;           // 건당/총액

  @Size(max = 120)
  private String locationText;           // 상세 주소 대신 텍스트

  @Size(max = 120)
  private String requirementsCsv;        // "경험자,대형견 가능,차량보유" 등

  @Min(1) @Max(10)
  private Integer openings;              // 모집 인원

  // getters/setters
}
```

#### pay 정책(서비스 검증)

* `payPerHourWon`와 `payTotalWon`은 **동시 입력 금지**(둘 중 하나만)
* 둘 다 null이면 “협의”로 처리하되, UI에 명시

---

### 7.2 JobApplyForm (지원)

* 지원은 스팸 유입이 쉽다 → 텍스트 길이/횟수 제한이 필수

```java
public class JobApplyForm {
  @NotNull
  private Long jobId;

  @NotBlank
  @Size(min = 10, max = 800)
  private String message;

  @Size(max = 40)
  private String availableTimeText;   // "평일 7~9시" 같은 텍스트

  // getters/setters
}
```

---

## 8) Care (심부름/긴급 돌봄)

### 8.1 CareRequestForm

* 긴급성/시간 제약이 핵심 → time window를 명확히 받는다.

```java
public class CareRequestForm {
  @NotNull
  private Long neighborhoodId;

  @NotNull
  private CareType type;                 // EMERGENCY_SITTING/ERRAND/SHORT_VISIT/ETC

  @NotBlank
  @Size(max = 60)
  private String title;

  @Size(max = 800)
  private String details;

  @NotNull
  private LocalDateTime requiredFrom;

  @NotNull
  private LocalDateTime requiredTo;

  @Min(0) @Max(10_000_000)
  private Integer budgetWon;             // 예산(없으면 null)

  @Size(max = 80)
  private String locationText;

  // getters/setters
}
```

#### 정책 메모

* `requiredTo`는 `requiredFrom` 이후여야 함(검증)
* 긴급 요청은 “동네 인증 레벨” 요구 가능(서비스 정책)

---

## 9) Missing / Lost & Found (실종/유기 신고)

### 9.1 MissingReportForm

* 골든타임 기능이 핵심 → 시간/장소/특징을 구조화

```java
public class MissingReportForm {
  @NotNull
  private Long neighborhoodId;

  @NotNull
  private MissingType type;              // LOST / FOUND / STRAY

  @NotBlank
  @Size(max = 40)
  private String petNameOrLabel;         // "몽이" 또는 "회색 고양이"

  @Size(max = 30)
  private String breed;

  @NotNull
  private LocalDateTime occurredAt;      // 실종/발견 시각

  @Size(max = 80)
  private String locationText;           // "OO역 2번출구"

  @Size(max = 800)
  private String description;            // 특징/연락/주의사항(연락처는 정책에 따라 제한)

  @Size(max = 5)
  private List<@Valid ImageRefForm> images;

  // getters/setters
}
```

#### 정책 메모

* `occurredAt`는 미래 금지
* “연락처/외부 링크”는 스팸/사기 경로 → MVP에서는 제한 권장

  * 대안: 플랫폼 내 메시지/댓글, 또는 관리자 승인 후 노출

---

## 10) Moderation (신고)

### 10.1 ReportForm

* 신고는 단순하지만 반드시 “타겟 타입/ID/사유”가 구조화되어야 함

```java
public class ReportForm {
  @NotNull
  private ReportTargetType targetType;   // POST/COMMENT/PLACE_REVIEW/MARKET_LISTING/USER

  @NotNull
  private Long targetId;

  @NotNull
  private ReportReason reason;           // SPAM/SCAM/HARASSMENT/ILLEGAL/OTHER

  @Size(max = 400)
  private String detail;                 // OTHER일 때만 권장

  // getters/setters
}
```

#### 정책 메모

* 1타겟 1유저 중복 신고 제한(서비스/DB unique)
* 신고 누적 시 자동 블라인드(서비스 정책)

---

## 11) Enum 계약(필수 정의 목록)

> MVP에서 Enum을 먼저 고정하면, DB/정책/뷰가 안정화된다.

* `PetType`: `DOG`, `CAT`, `OTHER`
* `PlaceType`: `HOSPITAL`, `GROOMING`, `CAFE`, `RESTAURANT`, `ETC`
* `ReviewCategory`: `HOSPITAL`, `FOOD`, `CAFE`, `ETC`
* `WalkDifficulty`: `EASY`, `MEDIUM`, `HARD`
* `ListingType`: `USED`, `RENTAL`, `SHARE`
* `JobType`: `PET_SITTING`, `DOG_WALKING`, `GROOMING_HELP`, `ERRAND`, `ETC`
* `CareType`: `EMERGENCY_SITTING`, `ERRAND`, `SHORT_VISIT`, `ETC`
* `MissingType`: `LOST`, `FOUND`, `STRAY`
* `ReportTargetType`: `POST`, `COMMENT`, `PLACE_REVIEW`, `MARKET_LISTING`, `USER`
* `ReportReason`: `SPAM`, `SCAM`, `HARASSMENT`, `ILLEGAL`, `OTHER`

---

## 12) 렌더링 계약(폼 에러 표준)

### 12.1 Form Fragment가 반드시 포함해야 하는 영역

* 글로벌 에러: `<div id="formErrors">...</div>`
* 필드 에러는 `th:errors="*{field}"` 방식으로 표준화

### 12.2 검증 실패 시 컨트롤러 반환 규칙

* **반드시 같은 폼 fragment를 return**한다.
* Model에는 `form`과 `binding`(Spring이 자동)만 있어도 렌더 가능해야 한다.

---

## 13) 다음 문서(추천)

* `TownPet-Service-Contract.md`

  * 각 서비스 메서드 시그니처
  * 트랜잭션 경계
  * 정책 예외(동네 인증/레이트리밋/블라인드)
  * 조회 성능(커서/인덱스)

원하면 다음 턴에서 Service Contract를 “그대로 코드 생성 가능한 수준”으로 작성한다.

```
::contentReference[oaicite:0]{index=0}
```
