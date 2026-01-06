# TownPet Controller Contract (Page/Fragment/API) — 메서드 시그니처 + View/Fragment 이름 규약

> 목적: AI로 코드를 생성하더라도 구조가 흐트러지지 않도록 **컨트롤러의 “서명(signature) + 입력/출력 계약”**을 먼저 고정합니다.  
> 규칙: `/p`(Page) / `/f`(Fragment) / `/api`(JSON)를 **컨트롤러/패키지/에러 처리까지 분리**합니다.

---

## 0) 공통 규약

### 0.1 패키지 네이밍
- Page: `...web.page.*PageController`
- Fragment: `...web.frag.*FragController`
- API: `...web.api.*ApiController`

### 0.2 템플릿 경로 규약
- Page View: `pages/**`
- Fragment View: `fragments/**`

**예시**
- Page: `"pages/local/places"`
- Fragment: `"fragments/place/place_list :: placeList"`

### 0.3 HTMX 요청 판단
- HTMX fragment는 경로로 분리(`/f/**`)가 원칙이므로, 서버에서 `HX-Request`로 분기하지 않는다.
- 다만 에러/리다이렉트/토스트는 HTMX 헤더로 표준화할 수 있음.

### 0.4 Model 키 표준(중요)
- 리스트: `items` or 도메인명 복수형(`places`, `reviews`)
- 커서: `nextCursor`
- 필터: `filters`
- 폼: `form`
- 에러: `errors` (검증 오류), `errorCode` (비즈니스 오류)

---

## 1) 공통 DTO/폼/응답(서명에서 사용하는 타입)

### 1.1 Cursor 공통
```java
public record CursorRequest(
  String cursor,     // e.g. "2026-01-01T00:00:00Z_12345"
  Integer size       // default 20, max 50
) {}

### 1.2 Page Query 공통(Filter/Sort)

```java
public record ListFilter(
  String q,          // search query
  String sort,       // e.g. "RECENT" | "COST_LOW" | "WAIT_SHORT"
  String[] tags      // optional
) {}
```

### 1.3 표준 View Model

* Places list: `places`, `nextCursor`, `filters`
* Reviews list: `reviews`, `nextCursor`
* Feed list: `items`, `nextCursor`
* Market list: `items`, `nextCursor`, `filters`

---

## 2) Page Controllers — `/p/**` (Full Page)

> Page는 “레이아웃 포함 골격”만 제공하고, 리스트/폼/상태변경은 `/f/**`로 처리하는 것을 기본으로 합니다.

---

### 2.1 Home

#### `HomePageController`

* 패키지: `com.townpet.domain.home.web.page`

```java
@Controller
public class HomePageController {

  @GetMapping("/p/home")
  public String home(Model model, @CurrentUser LoginUser user) {
    // model: user summary, neighborhood summary (optional)
    return "pages/home";
  }
}
```

---

### 2.2 Local Feed

#### `FeedPageController`

* 패키지: `com.townpet.domain.post.web.page`

```java
@Controller
@RequestMapping("/p/local")
public class FeedPageController {

  @GetMapping("/feed")
  public String feedPage(Model model, @CurrentUser LoginUser user) {
    // model may include initial filters only; list is loaded via /f/feed/list
    return "pages/local/feed";
  }
}
```

**페이지 DOM 계약(필수)**

* `<div id="feedList" hx-get="/f/feed/list" hx-trigger="load" hx-swap="outerHTML"></div>`
* toast 영역: `<div id="toastArea"></div>`

---

### 2.3 Places

#### `PlacePageController`

* 패키지: `com.townpet.domain.place.web.page`

```java
@Controller
@RequestMapping("/p/local")
public class PlacePageController {

  @GetMapping("/places")
  public String placesPage(Model model, @CurrentUser LoginUser user) {
    // filters UI only. list via /f/places/list
    return "pages/local/places";
  }

  // 선택(상세 페이지를 분리할 경우)
  @GetMapping("/places/{placeId}")
  public String placeDetailPage(@PathVariable Long placeId,
                                Model model,
                                @CurrentUser LoginUser user) {
    // model: place summary; reviews via /f/places/{placeId}/reviews
    return "pages/local/place_detail";
  }
}
```

**페이지 DOM 계약**

* list mount: `#placeList`
* detail: `#reviewList` mount

---

### 2.4 Walks

#### `WalkPageController`

* 패키지: `com.townpet.domain.walk.web.page`

```java
@Controller
@RequestMapping("/p/local")
public class WalkPageController {

  @GetMapping("/walks")
  public String walksPage(Model model, @CurrentUser LoginUser user) {
    return "pages/local/walks";
  }
}
```

---

### 2.5 Market

#### `MarketPageController`

* 패키지: `com.townpet.domain.market.web.page`

```java
@Controller
@RequestMapping("/p/local")
public class MarketPageController {

  @GetMapping("/market")
  public String marketPage(Model model, @CurrentUser LoginUser user) {
    return "pages/local/market";
  }
}
```

---

### 2.6 Jobs / Care

#### `JobPageController`

* 패키지: `com.townpet.domain.job.web.page`

```java
@Controller
@RequestMapping("/p/local")
public class JobPageController {

  @GetMapping("/jobs")
  public String jobsPage(Model model, @CurrentUser LoginUser user) {
    return "pages/local/jobs";
  }
}
```

#### `CarePageController`

* 패키지: `com.townpet.domain.care.web.page`

```java
@Controller
@RequestMapping("/p/local")
public class CarePageController {

  @GetMapping("/care")
  public String carePage(Model model, @CurrentUser LoginUser user) {
    return "pages/local/care";
  }
}
```

---

### 2.7 Lost & Found (Missing)

#### `MissingPageController`

* 패키지: `com.townpet.domain.missing.web.page`

```java
@Controller
@RequestMapping("/p/local")
public class MissingPageController {

  @GetMapping("/lost-found")
  public String lostFoundPage(Model model, @CurrentUser LoginUser user) {
    return "pages/local/lost_found";
  }
}
```

---

### 2.8 Global: QnA

#### `QnaPageController`

* 패키지: `com.townpet.domain.qna.web.page`

```java
@Controller
@RequestMapping("/p/global")
public class QnaPageController {

  @GetMapping("/qna")
  public String qnaPage(Model model, @CurrentUser LoginUser user) {
    return "pages/global/qna";
  }

  // 선택(상세 페이지)
  @GetMapping("/qna/{questionId}")
  public String qnaDetailPage(@PathVariable Long questionId, Model model) {
    return "pages/global/qna_detail";
  }
}
```

---

### 2.9 Admin

#### `AdminReportPageController`

* 패키지: `com.townpet.domain.moderation.web.page`

```java
@Controller
@RequestMapping("/p/admin")
public class AdminReportPageController {

  @GetMapping("/reports")
  public String reportsPage(Model model, @CurrentUser LoginUser user) {
    // role check via security config
    return "pages/admin/reports";
  }

  @GetMapping("/audit")
  public String auditPage(Model model, @CurrentUser LoginUser user) {
    return "pages/admin/audit";
  }
}
```

---

## 3) Fragment Controllers — `/f/**` (HTMX Swap)

> Fragment는 “HTML 조각만 반환”합니다.
> **반환은 반드시 `fragments/** :: fragmentName` 형태**로 고정합니다.

---

## 3.1 Feed Fragments

#### `FeedFragController`

* 패키지: `com.townpet.domain.post.web.frag`

```java
@Controller
@RequestMapping("/f/feed")
public class FeedFragController {

  @GetMapping("/list")
  public String feedList(@ModelAttribute CursorRequest cursor,
                         @ModelAttribute ListFilter filter,
                         Model model,
                         @CurrentUser LoginUser user) {
    // model: items, nextCursor, filters
    return "fragments/feed/feed_list :: feedList";
  }
}
```

**반환 HTML 계약**

* 루트: `<div id="feedList"> ... </div>`
* 센티널: `<div id="feedList__sentinel" hx-get="/f/feed/list?cursor=..." hx-trigger="revealed" hx-swap="outerHTML"></div>`

---

## 3.2 Place/Review Fragments

#### `PlaceFragController`

* 패키지: `com.townpet.domain.place.web.frag`

```java
@Controller
@RequestMapping("/f/places")
public class PlaceFragController {

  @GetMapping("/list")
  public String placeList(@ModelAttribute CursorRequest cursor,
                          @ModelAttribute ListFilter filter,
                          Model model,
                          @CurrentUser LoginUser user) {
    // model: places, nextCursor, filters
    return "fragments/place/place_list :: placeList";
  }

  @GetMapping("/{placeId}/reviews")
  public String reviewList(@PathVariable Long placeId,
                           @ModelAttribute CursorRequest cursor,
                           Model model,
                           @CurrentUser LoginUser user) {
    // model: reviews, nextCursor, placeId
    return "fragments/place/review_list :: reviewList";
  }

  @PostMapping("/{placeId}/reviews")
  public String createReview(@PathVariable Long placeId,
                             @Valid @ModelAttribute PlaceReviewForm form,
                             BindingResult binding,
                             Model model,
                             @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      // model: form + errors
      return "fragments/place/review_form :: reviewForm";
    }
    // 성공 시: reviewList를 새로 그려서 반환(가장 단순)
    // model: reviews, nextCursor
    return "fragments/place/review_list :: reviewList";
  }
}
```

**Form 계약(필수)**

* `<form id="reviewForm" hx-post="/f/places/{placeId}/reviews" hx-target="#reviewList" hx-swap="outerHTML"> ... </form>`
* 에러 영역: `<div id="formErrors"></div>`

---

## 3.3 Walk Fragments

#### `WalkFragController`

* 패키지: `com.townpet.domain.walk.web.frag`

```java
@Controller
@RequestMapping("/f/walks")
public class WalkFragController {

  @GetMapping("/list")
  public String walkList(@ModelAttribute CursorRequest cursor,
                         @ModelAttribute ListFilter filter,
                         Model model,
                         @CurrentUser LoginUser user) {
    return "fragments/walk/walk_list :: walkList";
  }

  @PostMapping
  public String createWalk(@Valid @ModelAttribute WalkForm form,
                           BindingResult binding,
                           Model model,
                           @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      return "fragments/walk/walk_form :: walkForm";
    }
    return "fragments/walk/walk_list :: walkList";
  }
}
```

---

## 3.4 Market Fragments

#### `MarketFragController`

* 패키지: `com.townpet.domain.market.web.frag`

```java
@Controller
@RequestMapping("/f/market")
public class MarketFragController {

  @GetMapping("/list")
  public String listingList(@ModelAttribute CursorRequest cursor,
                            @ModelAttribute ListFilter filter,
                            Model model,
                            @CurrentUser LoginUser user) {
    // model: items, nextCursor, filters
    return "fragments/market/listing_list :: listingList";
  }

  @PostMapping
  public String createListing(@Valid @ModelAttribute MarketListingForm form,
                              BindingResult binding,
                              Model model,
                              @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      return "fragments/market/listing_form :: listingForm";
    }
    return "fragments/market/listing_list :: listingList";
  }

  @PostMapping("/{listingId}/reserve")
  public String reserve(@PathVariable Long listingId,
                        Model model,
                        @CurrentUser LoginUser user) {
    // model: listing (updated)
    return "fragments/market/listing_card :: listingCard";
  }

  @PostMapping("/{listingId}/complete")
  public String complete(@PathVariable Long listingId,
                         Model model,
                         @CurrentUser LoginUser user) {
    return "fragments/market/listing_card :: listingCard";
  }
}
```

**Card 교체 계약**

* 각 카드 루트 id: `marketCard__{listingId}`
* 버튼:

  * `hx-post="/f/market/{id}/reserve" hx-target="#marketCard__{id}" hx-swap="outerHTML"`

---

## 3.5 Jobs + Care Fragments

#### `JobFragController`

* 패키지: `com.townpet.domain.job.web.frag`

```java
@Controller
@RequestMapping("/f/jobs")
public class JobFragController {

  @GetMapping("/list")
  public String jobList(@ModelAttribute CursorRequest cursor,
                        @ModelAttribute ListFilter filter,
                        Model model,
                        @CurrentUser LoginUser user) {
    return "fragments/job/job_list :: jobList";
  }

  @PostMapping
  public String createJob(@Valid @ModelAttribute JobPostForm form,
                          BindingResult binding,
                          Model model,
                          @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      return "fragments/job/job_form :: jobForm";
    }
    return "fragments/job/job_list :: jobList";
  }

  @PostMapping("/{jobId}/apply")
  public String apply(@PathVariable Long jobId,
                      @Valid @ModelAttribute JobApplyForm form,
                      BindingResult binding,
                      Model model,
                      @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      return "fragments/job/application_form :: applicationForm";
    }
    // 성공 시 카드/토스트 선택
    return "fragments/job/job_card :: jobCard";
  }
}
```

#### `CareFragController`

* 패키지: `com.townpet.domain.care.web.frag`

```java
@Controller
@RequestMapping("/f/care")
public class CareFragController {

  @GetMapping("/list")
  public String careList(@ModelAttribute CursorRequest cursor,
                         @ModelAttribute ListFilter filter,
                         Model model,
                         @CurrentUser LoginUser user) {
    return "fragments/care/request_list :: requestList";
  }

  @PostMapping
  public String createCare(@Valid @ModelAttribute CareRequestForm form,
                           BindingResult binding,
                           Model model,
                           @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      return "fragments/care/request_form :: requestForm";
    }
    return "fragments/care/request_list :: requestList";
  }
}
```

---

## 3.6 Missing Fragments

#### `MissingFragController`

* 패키지: `com.townpet.domain.missing.web.frag`

```java
@Controller
@RequestMapping("/f/missing")
public class MissingFragController {

  @GetMapping("/list")
  public String missingList(@ModelAttribute CursorRequest cursor,
                            Model model,
                            @CurrentUser LoginUser user) {
    return "fragments/missing/report_list :: reportList";
  }

  @PostMapping
  public String createReport(@Valid @ModelAttribute MissingReportForm form,
                             BindingResult binding,
                             Model model,
                             @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      return "fragments/missing/report_form :: reportForm";
    }
    return "fragments/missing/report_list :: reportList";
  }
}
```

---

## 3.7 Moderation (Report / Admin actions)

#### `ModerationFragController`

* 패키지: `com.townpet.domain.moderation.web.frag`

```java
@Controller
@RequestMapping("/f/reports")
public class ModerationFragController {

  @PostMapping
  public String createReport(@Valid @ModelAttribute ReportForm form,
                             BindingResult binding,
                             Model model,
                             @CurrentUser LoginUser user) {
    if (binding.hasErrors()) {
      return "fragments/ui/toast :: toast";
    }
    // 성공: toast 반환 (또는 target 숨김 fragment 반환)
    return "fragments/ui/toast :: toast";
  }
}
```

#### `AdminModerationFragController`

* 패키지: `com.townpet.domain.moderation.web.frag`

```java
@Controller
@RequestMapping("/f/admin/reports")
public class AdminModerationFragController {

  @PostMapping("/{reportId}/resolve")
  public String resolve(@PathVariable Long reportId,
                        @RequestParam String action, // e.g. "HIDE" | "RESTORE" | "BAN"
                        Model model,
                        @CurrentUser LoginUser admin) {
    // model: updated report row/card
    return "fragments/admin/report_row :: reportRow";
  }
}
```

---

## 4) JSON API — `/api/**` (최소만)

> JSON API는 “지도/업로드/특수 기능”으로 제한하는 것이 TownPet의 단순성 목표에 맞습니다.

---

## 4.1 Media Presign API (선택)

#### `MediaApiController`

* 패키지: `com.townpet.domain.media.web.api`

```java
@RestController
@RequestMapping("/api/v1/media")
public class MediaApiController {

  @PostMapping("/presign")
  public ApiResponse<PresignResponse> presign(@Valid @RequestBody PresignRequest req,
                                              @CurrentUser LoginUser user) {
    return ApiResponse.ok(/*...*/);
  }
}
```

---

## 4.2 Map Data API (선택)

#### `MapApiController`

* 패키지: `com.townpet.domain.map.web.api`

```java
@RestController
@RequestMapping("/api/v1/map")
public class MapApiController {

  @GetMapping("/walks")
  public ApiResponse<List<WalkMapDto>> walks(@RequestParam Double lat,
                                             @RequestParam Double lng,
                                             @RequestParam Integer radiusM,
                                             @CurrentUser LoginUser user) {
    return ApiResponse.ok(/*...*/);
  }
}
```

---

## 5) 에러/리다이렉트/토스트 정책(서명 수준에서 고정)

### 5.1 Fragment 성공 시(권장)

* 반환 HTML: list/card fragment
* 추가로 `HX-Trigger`로 toast를 띄우는 방식을 표준화(권장)

### 5.2 Fragment 실패 시(검증)

* 동일 form fragment를 반환
* `#formErrors` 포함 → `hx-target`으로 교체

### 5.3 비즈니스 실패 시(권한/정책)

* `fragments/ui/toast :: toast("error", "...")`
* 필요 시 `HX-Redirect`로 `/p/...` 유도(로그인/권한 부족)

---

## 6) 페이지별 “Mount Point” 계약 요약

| Page                  | Mount Point    | Initial hx-get    | Swap        |
| --------------------- | -------------- | ----------------- | ----------- |
| `/p/local/feed`       | `#feedList`    | `/f/feed/list`    | `outerHTML` |
| `/p/local/places`     | `#placeList`   | `/f/places/list`  | `outerHTML` |
| `/p/local/walks`      | `#walkList`    | `/f/walks/list`   | `outerHTML` |
| `/p/local/market`     | `#marketList`  | `/f/market/list`  | `outerHTML` |
| `/p/local/jobs`       | `#jobList`     | `/f/jobs/list`    | `outerHTML` |
| `/p/local/care`       | `#careList`    | `/f/care/list`    | `outerHTML` |
| `/p/local/lost-found` | `#missingList` | `/f/missing/list` | `outerHTML` |
| 모든 페이지                | `#toastArea`   | (trigger)         | `outerHTML` |

---

## 7) 다음 문서(권장)

이 컨트랙트를 기반으로 바로 코드를 생성하려면 아래 2개가 필요합니다.

1. **Form DTO 계약서**: `PlaceReviewForm`, `MarketListingForm` 등 필드/검증 규칙 확정
2. **Service Contract**: 각 서비스 메서드(입력/출력/트랜잭션/정책 예외) 확정

원하면 다음 턴에서 1)과 2)를 “그대로 코드 생성에 쓰는 수준”으로 이어서 작성합니다.

```
::contentReference[oaicite:0]{index=0}
```
