# TownPet HTMX Error Handling Playbook (SSR + Thymeleaf)
- File: docs/06_frontend/05_htmx_error_handling_playbook.md
- Version: v0.1 (2026-01-06)
- Goal:
  - HTMX 기반 SSR 앱에서 “에러 처리/권한/검증/리다이렉트”를 표준화하여
    화면 깨짐·중복 로딩·침묵 실패를 방지한다.
- Scope:
  - `/p/**` (Full Page) vs `/f/**` (Fragment) 에러 처리 규약
  - 401/403/404/409/422/429/500 표준 응답
  - 토스트/모달/인라인 오류 계약
  - 서버 측 구현 체크리스트(Spring Boot)

---

## 0) 용어/전제
- Page 요청: `/p/**` (layout 포함)
- Fragment 요청: `/f/**` (layout 없는 HTML 조각)
- JSON 요청: `/api/**`
- HTMX 요청 판별:
  - Request header: `HX-Request: true`
- CSRF:
  - 세션 기반 + CSRF ON 전제(권장)
  - 모든 non-GET은 CSRF 헤더 필요

---

## 1) “절대 규칙” 6개
1) **Fragment 요청이 실패했는데도 화면이 아무 변화가 없으면 실패다.**
   - 최소한 toast 또는 inline error가 반드시 떠야 한다.
2) **권한 에러(401/403)는 redirect/모달/toast 중 하나로 반드시 처리한다.**
3) **검증 에러(422)는 toast가 아니라 “필드/폼 근처”에 인라인으로 표시한다.**
4) **서버 에러(500)는 traceId를 노출하고, 사용자에게 재시도 경로를 준다.**
5) **Idempotency가 없는 요청(POST/DELETE)은 중복 클릭 방지를 한다.**
6) **에러 처리 방식은 “엔드포인트의 종류”가 아니라 “사용자 UX 목표”로 통일한다.**
   - 예: 댓글 작성 실패는 댓글 폼 근처에서 해결해야 한다(토스트만 띄우면 UX 실패).

---

## 2) 에러 표준 응답 매트릭스(핵심)

### 2.1 Page(`/p/**`) 응답
| 상황 | HTTP | 사용자 경험 | 서버 응답 |
|---|---:|---|---|
| 로그인 필요 | 302 or 401 | 로그인 페이지로 이동 | `/p/auth/login` redirect (가능하면 302) |
| 권한 없음 | 403 | 403 에러 페이지 | `pages/error/403.html` |
| 없음 | 404 | 404 에러 페이지 | `pages/error/404.html` |
| 충돌 | 409 | 안내 페이지/토스트 포함 | `pages/error/409.html` 또는 redirect+flash |
| 서버 에러 | 500 | 500 에러 페이지 + traceId | `pages/error/500.html` |

> Page 에러는 “그 페이지 자체가 정상 렌더 불가”이므로, HTML 전체를 반환하는 방식이 낫다.

### 2.2 Fragment(`/f/**`) 응답
| 상황 | HTTP | 기본 UX | 기본 Target/Swap | 서버가 반환해야 하는 것 |
|---|---:|---|---|---|
| 로그인 필요 | 401 | (A) 로그인 모달 OR (B) 로그인 페이지로 이동 | A: `#modal-slot` / innerHTML, B: `HX-Redirect` | A: `fragments/ui/modal.html` 또는 B: 헤더 |
| 권한 없음 | 403 | toast(“권한 없음”) | `#toast-slot` / innerHTML | `fragments/ui/toast.html` |
| 리소스 없음 | 404 | toast + (가능하면) 해당 카드/행 제거 | 기본 toast | `toast` (+ 선택적으로 특정 target용 fragment) |
| 검증 실패 | 422 | 인라인 필드 오류 표시 | 폼 내부 `#form-errors-*` / innerHTML | `fragments/ui/inline_errors.html` |
| 비즈니스 충돌 | 409 | toast(“이미 처리됨/상태 변경됨”) + UI refresh 권장 | toast + (선택) 부분 갱신 | `toast` (+ 선택: 상태 패널 fragment) |
| 레이트리밋 | 429 | toast(“잠시 후 다시”) | toast | `toast` |
| 서버 에러 | 500 | toast(“오류”) + traceId | toast | `toast` (traceId 필수) |

---

## 3) UI 컴포넌트 계약(에러 표시 수단)

### 3.1 Toast(전역)
- Target: `#toast-slot`
- Swap: `innerHTML`
- Template: `templates/fragments/ui/toast.html`
- 필수 데이터:
  - `level` (info|success|warning|error)
  - `message` (string)
  - `traceId` (optional, 500에서는 mandatory)

#### 권장 문구 예시
- 401: “로그인이 필요합니다.”
- 403: “권한이 없습니다.”
- 409: “이미 처리된 요청입니다. 새로고침 후 다시 시도하세요.”
- 429: “요청이 너무 많습니다. 잠시 후 다시 시도하세요.”
- 500: “서버 오류가 발생했습니다. traceId: {traceId}”

### 3.2 Inline errors(폼 검증)
- Target: 폼 내부 `#form-errors-{formName}` 또는 `#field-error-{fieldName}`
- Swap: `innerHTML`
- Template:
  - `templates/fragments/ui/inline_errors.html`
- 입력 데이터(서버 모델):
  - `errors`: `[{ field, message }]` 또는 `[{ message }]`

#### HTML 규격(권장)
- 폼 최상단 에러 컨테이너:
  - `<div id="form-errors-{formName}"></div>`
- 필드별 에러 컨테이너:
  - `<div id="field-error-title"></div>`

### 3.3 Modal(로그인 필요/확인)
- Target: `#modal-slot`
- Swap: `innerHTML`
- Template: `templates/fragments/ui/modal.html`
- 사용 케이스:
  - 로그인 요구(401) 시 “로그인 모달 + /p/auth/login 링크”
  - destructive action(삭제) 시 confirm

---

## 4) 엔드포인트 유형별 표준 처리(실전)

### 4.1 “폼 제출”(댓글 작성/게시글 작성/지원)
- 실패 유형:
  - 401/403 → 모달 또는 toast
  - 422 → 인라인 에러(토스트 금지)
  - 500 → toast(traceId)
- 성공:
  - 댓글 작성: `#comments`를 `innerHTML`로 재렌더(가장 단순)
  - 게시글 작성:
    - 초기 MVP: Page POST → redirect(`/p/local/.../{id}`)
    - Fragment POST는 나중에

#### 댓글 작성(권장 표준)
- Request: `POST /f/posts/{id}/comments`
- Target: `#comments`
- Swap: `innerHTML`
- Failure 422:
  - Target은 `#form-errors-comment`로 바꾸는 것이 더 UX 좋음
  - 구현 옵션:
    - A) 서버가 422 시 `inline_errors.html`을 반환하고, 클라에서 `hx-target`을 errors로 지정
    - B) 서버가 `HX-Retarget` 헤더를 사용해 errors 영역으로 강제(고급)

**MVP 권장: A 방식(명시적 target)**

### 4.2 “토글/반응”(좋아요/저장/참여)
- 성공: 반응 영역만 교체 (`outerHTML`)
- 실패:
  - 401 → 로그인 모달(반응은 로그인 요구가 자연스러움)
  - 403 → toast
  - 409 → toast(상태가 바뀌었을 수 있음) + 반응 영역 재조회(선택)

#### 좋아요 표준
- Request: `POST /f/posts/{id}/reactions/LIKE`
- Target: `#reactions-{id}`
- Swap: `outerHTML`
- Failure 401:
  - 모달 표시로 유도(redirect도 가능하지만 UX가 끊김)

### 4.3 “리스트 추가 로딩”(무한 스크롤)
- 실패:
  - 401/403: 일반적으로 피드 자체는 public 허용을 권장.
    - 제한 기능이면 toast 후 로더 제거.
  - 500: toast + 로더 유지(재시도 가능)
- 성공:
  - append-block + nextCursor 제공
  - 끝이면 end_of_list fragment 반환(로더 제거/교체)

#### 무한 스크롤 에러 UX
- `#loader` 영역에 “재시도 버튼”을 렌더하는 방식이 가장 실용적
- 별도 fragment:
  - `templates/fragments/ui/retry_loader.html` (선택)
  - `<div id="loader"><button hx-get="...">다시 시도</button></div>`

### 4.4 “신고/모더레이션”
- 실패:
  - 401: 로그인 요구(모달)
  - 422: reason 누락 등 → 모달/인라인
  - 409: 이미 신고함 → toast(정보성)
- 성공:
  - 기본: toast(success)
  - AUTO_HIDDEN 발생:
    - 해당 카드 `#post-{id}`를 “숨김 처리된 카드”로 `outerHTML` 교체
    - 또는 카드 제거 + toast

---

## 5) HTMX 헤더/기능 활용 규칙(필수는 아님, 있으면 강력)

### 5.1 HX-Redirect
- 사용: Fragment 요청에서 “성공 후 페이지 이동이 자연스러울 때”
  - 예: 게시글 생성 성공 → 상세 페이지로 이동
- 금지: 단순 실패에서 redirect 남발(UX 파괴)

### 5.2 HX-Trigger
- 사용: 서버가 클라에 이벤트를 보내서 toast/analytics 등을 호출
- 예:
  - `HX-Trigger: {"toast":{"level":"success","message":"저장되었습니다"}}`
- 단, MVP에서는 단순화:
  - 서버가 바로 `toast.html` fragment 반환하는 방식이 디버깅이 쉽다.

### 5.3 HX-Retarget / HX-Reswap (고급)
- 서버가 “실패 시에만” 타겟을 errors로 강제 가능
- MVP에서는 프론트에 명시적 `hx-target`을 두는 편이 안정적

---

## 6) 상태코드 설계 권장안(Spring Boot)
- 401: 인증 필요(로그인)
- 403: 인증은 되었으나 권한 없음
- 404: 리소스 없음
- 409: 비즈니스 충돌(중복 처리/상태 변화)
- 422: 입력 검증 실패(Bean Validation/도메인 검증)
- 429: rate limit
- 500: 예기치 못한 서버 오류

> 400을 남발하지 말고, 프론트 UX 처리에 필요한 의미를 분리한다.

---

## 7) Spring Boot 구현 체크리스트(서버 측)

### 7.1 Global Exception Handler (@ControllerAdvice)
- HTMX 요청 판별:
  - `HX-Request` 헤더 확인
- HTMX 요청이면:
  - 해당 상태코드에 맞는 fragment view name 반환
- Page 요청이면:
  - 에러 페이지 view name 반환 또는 redirect

#### 권장 매핑
- `MethodArgumentNotValidException` / `ConstraintViolationException` → 422 + `inline_errors`
- `AccessDeniedException` → 403 + `toast`
- `AuthenticationException` → 401 + `modal` 또는 `HX-Redirect`
- `EntityNotFoundException` → 404 + `toast`(fragment) / 404 page
- `OptimisticLockingFailureException` → 409 + `toast`
- `RateLimitException`(커스텀) → 429 + `toast`
- `Exception` → 500 + `toast`(traceId)

### 7.2 traceId(관측성)
- 모든 응답에 traceId를 넣는다(헤더 + 500 toast에 표시)
- 권장: `X-Trace-Id` 헤더
- 로깅(MDC)와 연동

### 7.3 CSRF(세션 기반)
- base layout에서 meta로 CSRF 제공
- HTMX 요청에 자동 주입 스크립트 포함

### 7.4 중복 클릭 방지
- 프론트:
  - submit 버튼에 `disabled` 토글(HTMX 요청 중)
- 서버:
  - 중요한 POST는 idempotency 고려(예: 신고는 UNIQUE 제약/409 반환)

---

## 8) 페이지별 “표준 타겟” 요약(빠른 참고)
- 반응 버튼: `#reactions-{postId}` / `outerHTML`
- 댓글 스레드: `#comments` / `innerHTML`
- 리스트 추가: `#list` / `beforeend`
- 리스트 리셋(필터/검색): `#list` / `innerHTML`
- 토스트: `#toast-slot` / `innerHTML`
- 모달: `#modal-slot` / `innerHTML`
- 인라인 에러:
  - 폼: `#form-errors-{formName}` / `innerHTML`
  - 필드: `#field-error-{fieldName}` / `innerHTML`

---

## 9) MVP에서 “반드시 구현”할 최소 에러 UX 시나리오
- [ ] 로그인 없이 좋아요 클릭 → 로그인 모달 또는 toast + /p/auth/login 링크
- [ ] 댓글 빈 값 제출 → 422 인라인 에러
- [ ] 신고 중복 → 409 toast(“이미 신고함”)
- [ ] 무한스크롤 로딩 실패(500) → toast + loader에 재시도 버튼
- [ ] 관리자 액션 권한 없음(403) → toast
- [ ] presign 업로드 실패 → toast(클라 JS 에러 처리)

---