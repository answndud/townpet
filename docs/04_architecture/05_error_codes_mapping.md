# 05. Error Codes Mapping (Service → Controller/HTMX Rendering)
> 경로(권장): `docs/04_architecture/05_error_codes_mapping.md`  
> 목적: TownPet에서 Service 계층의 `ErrorCode`를 **HTTP 응답 + SSR/HTMX 렌더링 전략**으로 일관되게 매핑한다.  
> 전제: 라우팅 규약
- `/p/**` = Page(전체 HTML)
- `/f/**` = Fragment(HTMX swap 대상 HTML)
- `/api/**` = JSON API

---

## 1) 핵심 원칙 (필수)

### 1.1 Service는 ErrorCode만 던진다
- Service는 `BusinessException(ErrorCode, message?, detail?)` 형태로 던진다.
- Controller는 try/catch로 분기하지 않고, **Global Exception Handler**로 일괄 처리한다.

### 1.2 `/p` vs `/f` vs `/api` 응답 규칙
- `/p/**`
  - 실패 시: 에러 페이지 또는 원래 페이지 + `flash` 메시지
- `/f/**`
  - 실패 시: “swap 가능한 fragment”로 돌려주거나, 필요 시 `HX-Redirect` 사용
- `/api/**`
  - 실패 시: `application/json` 표준 에러 바디 반환

### 1.3 HTMX에서의 실패 처리 우선순위
1) **폼 검증 실패(400)**: 폼 fragment 자체를 교체(swap)해 에러를 화면에 표시
2) **권한/인증 문제(401/403)**: `HX-Redirect`로 로그인/권한 안내 페이지로 이동
3) **리소스 없음(404)**: 토스트 + 해당 컴포넌트 영역 “없음” 상태로 swap
4) **상태 충돌(409)**: 토스트 + 해당 액션 버튼 비활성화/리로드
5) **레이트리밋(429)**: 토스트 + 일정 시간 재시도 안내
6) **서버 오류(5xx)**: 토스트 + “잠시 후 재시도” + 내부 로그

---

## 2) ErrorCode 목록(권장)과 의미

> 본 목록은 `TownPet-Service-Contract.md`와 정합되어야 한다.

- `AUTH_REQUIRED` : 로그인 필요
- `FORBIDDEN` : 권한 부족(타인 리소스 수정/삭제 등)
- `NOT_FOUND` : 대상 리소스 없음(또는 삭제/숨김 포함)
- `VALIDATION_FAILED` : 비즈니스 검증 실패(시간 범위, pay 규칙 등)
- `DUPLICATE_RESOURCE` : 중복 등록/중복 지원/중복 신고
- `RATE_LIMITED` : 도배/스팸 차단
- `POLICY_RESTRICTED` : 동네 인증 등 정책 제한
- `STATE_CONFLICT` : 상태 전이 불가(OPEN→RESERVED 등)
- `CONTENT_BLOCKED` : 숨김/블라인드/정책 차단 콘텐츠
- `INTERNAL_ERROR` : 예기치 못한 서버 오류(보통 직접 throw 하지 않고 fallback)

---

## 3) HTTP Status 매핑 표 (고정)

| ErrorCode | HTTP Status | 기본 메시지(예시) | 재시도 가능 |
|---|---:|---|---:|
| AUTH_REQUIRED | 401 | 로그인이 필요합니다. | N |
| FORBIDDEN | 403 | 권한이 없습니다. | N |
| NOT_FOUND | 404 | 대상을 찾을 수 없습니다. | N |
| VALIDATION_FAILED | 400 | 입력값을 확인해 주세요. | N |
| DUPLICATE_RESOURCE | 409 | 이미 처리된 요청입니다. | N |
| POLICY_RESTRICTED | 403 | 현재 정책상 사용할 수 없습니다. | N |
| STATE_CONFLICT | 409 | 상태가 변경되어 처리할 수 없습니다. | Y(새로고침 후) |
| RATE_LIMITED | 429 | 요청이 너무 많습니다. | Y(잠시 후) |
| CONTENT_BLOCKED | 410 | 정책에 의해 노출되지 않습니다. | N |
| INTERNAL_ERROR | 500 | 서버 오류가 발생했습니다. | Y |

> `CONTENT_BLOCKED`는 `410 Gone`을 권장(숨김/삭제로 더 이상 제공되지 않음을 표현).  
> 단, 운영상 “숨김과 삭제를 404로 위장”하고 싶다면 404로 통일할 수도 있다. MVP에서는 위 표대로 간다.

---

## 4) 응답 포맷 표준

## 4.1 `/api/**` JSON 에러 바디(표준)
```json
{
  "timestamp": "2026-01-06T12:34:56Z",
  "status": 403,
  "errorCode": "FORBIDDEN",
  "message": "권한이 없습니다.",
  "path": "/api/v1/market/listings/123/reserve",
  "requestId": "req_abc123"
}
```

필드 규칙:

* `errorCode`: 반드시 포함
* `message`: 사용자 노출용(민감정보 금지)
* `requestId`: 로그 추적용(가능하면 필수)

## 4.2 `/f/**` 실패 응답 (HTMX)

`/f/**`는 2가지 패턴 중 하나를 선택한다.

### 패턴 A(권장): “에러 전용 fragment”로 swap

* 서버는 `fragments/common/toast :: toast(message, level)` 같은 HTML fragment를 반환
* 클라이언트는 `hx-target="#toast-root"`로 swap

### 패턴 B: HX-Trigger 기반(선택)

* 서버는 4xx/5xx로 응답하면서 헤더에 이벤트를 싣고,
* 클라이언트가 이벤트를 받아 toast 렌더링

> MVP 단순성을 위해 패턴 A를 우선한다.

---

## 5) Controller/Handler 규약(권장 구현)

### 5.1 Global Exception Handler 기본 규칙

* `BusinessException` 잡아서:

  * `/api/**`: JSON 에러 바디
  * `/f/**`: 에러 fragment 또는 `HX-Redirect`
  * `/p/**`: 에러 페이지 or flash message redirect

### 5.2 요청 타입 판별

* Path prefix(`/api`, `/f`, `/p`)로 판별(간단하고 안정적)
* 추가로 HTMX 요청 여부는 헤더 `HX-Request: true`로 확인 가능(보조)

---

## 6) HTMX 렌더링 매핑(상세)

## 6.1 폼 제출(POST) 실패 처리

### 6.1.1 VALIDATION_FAILED(400)

* **반환**: 동일 폼 fragment (입력값 유지 + 에러 표시)
* **swap**: `hx-target="#<form-container>" hx-swap="outerHTML"`
* **UI 계약**:

  * 글로벌 에러: `#formErrors`
  * 필드별 에러: `th:errors="*{field}"`

### 6.1.2 DUPLICATE_RESOURCE(409)

* 사용 예: 중복 지원/중복 신고
* **반환**: toast fragment + 가능하면 액션 버튼 disable fragment
* **권장 UX**:

  * “이미 처리되었습니다.” 토스트
  * 버튼 텍스트 “완료됨”으로 변경(선택)

### 6.1.3 RATE_LIMITED(429)

* **반환**: toast fragment(“잠시 후 다시 시도”)
* **권장 UX**:

  * 서버가 `Retry-After` 헤더를 주면 메시지에 반영(선택)
  * 클라이언트에서 버튼 3~10초 disable(Alpine로 가능)

### 6.1.4 AUTH_REQUIRED(401)

* **반환**: `HX-Redirect: /p/login?next=<current>`
* 로그인 후 돌아오도록 `next` 파라미터 권장

### 6.1.5 FORBIDDEN/POLICY_RESTRICTED(403)

* **반환**: `HX-Redirect: /p/policy/blocked?reason=...` 또는 toast+안내 fragment
* 권장:

  * 동네 인증이 필요한 기능이면 `/p/local/verify` 같은 페이지로 유도

### 6.1.6 STATE_CONFLICT(409)

* 사용 예: 마켓 reserve 경쟁, job close된 상태
* **반환**: toast + 해당 카드 fragment refresh
* 구현 방식:

  * 서버가 최신 카드 fragment를 반환해서 `hx-target="#listing-<id>" outerHTML` swap

### 6.1.7 NOT_FOUND / CONTENT_BLOCKED(404/410)

* **반환**: toast + 리스트 재조회 fragment
* 예: “삭제된 글입니다.”

---

## 7) 페이지(`/p/**`)에서의 에러 처리

### 7.1 AUTH_REQUIRED(401)

* `302 redirect` → `/p/login?next=...`

### 7.2 FORBIDDEN/POLICY_RESTRICTED(403)

* 권한 안내 페이지(정적) 또는 기본 에러 페이지
* 로깅: requestId와 actor, targetId 반드시 기록

### 7.3 NOT_FOUND/CONTENT_BLOCKED(404/410)

* 404 페이지로 통일하거나,
* 콘텐츠 특성상 “없음” 페이지(리스트로 돌아가기 CTA) 제공

---

## 8) 로그/감사(Audit) 규칙

ErrorCode가 발생하면 아래를 권장한다.

* `FORBIDDEN`, `POLICY_RESTRICTED`, `STATE_CONFLICT`, `RATE_LIMITED`는

  * requestId + actorUserId + targetType/Id + errorCode 로 구조화 로깅
* moderation 관련:

  * 신고/숨김/복구는 반드시 `audit_logs` 남김(서비스에서)

---

## 9) “페이지별” 권장 HX target/swap 예시

### 9.1 Market reserve 버튼

* 버튼:

  * `hx-post="/f/market/listings/123/reserve"`
  * `hx-target="#listing-123"`
  * `hx-swap="outerHTML"`
* 성공: 최신 listing 카드 fragment 반환(RESERVED 반영)
* 실패:

  * STATE_CONFLICT: toast + 최신 카드 반환(outerHTML)
  * AUTH_REQUIRED: HX-Redirect

### 9.2 Job apply 폼

* 폼:

  * `hx-post="/f/jobs/456/apply"`
  * `hx-target="#job-apply-form"`
  * `hx-swap="outerHTML"`
* VALIDATION_FAILED: 동일 폼 fragment 반환(에러 표시)

---

## 10) 구현 체크리스트

* [ ] `BusinessException` → `ErrorCode` → HTTP status 매핑이 고정되어 있는가?
* [ ] `/f/**` 실패 응답에서 “swap 가능한 fragment” 또는 “HX-Redirect”만 사용하고 있는가?
* [ ] 폼 검증 실패는 400 + 동일 폼 fragment로 처리되는가?
* [ ] 409/429 상황에서 사용자가 무엇을 해야 하는지 UI가 안내하는가?
* [ ] `requestId`가 모든 에러 응답(JSON)과 서버 로그에 남는가?

---

```
::contentReference[oaicite:0]{index=0}
```
