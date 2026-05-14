# 40px Touch Target Playwright Smoke 선별

작성일: 2026-05-14

## 목적

P2-4부터 P2-21까지 40px touch target 기준을 소스/단위 테스트/핵심 공개 feed smoke로 보강했다.
이번 문서는 남은 작성, 댓글, 관리자 화면 중 Playwright visual smoke를 추가할 가치가 있는 화면만 선별한다.

기준은 다음과 같다.

- 실제 사용자가 자주 누르는 화면인가
- 소스 기반 테스트만으로는 레이아웃 overflow나 toolbar wrapping을 잡기 어려운가
- 이미 기능 e2e가 있어 새 smoke가 중복 비용만 늘리는가
- 1인 운영 기준에서 CI/로컬 검증 시간을 과하게 늘리지 않는가

## 기존 커버리지 요약

| 영역 | 기존 e2e | 커버하는 것 | 부족한 것 |
| --- | --- | --- | --- |
| 공개 feed/search/detail | `feed-search-detail-visual-smoke.spec.ts` | desktop/mobile touch target, overflow | 현재 충분 |
| 글쓰기/에디터 | `guest-post-management.spec.ts`, `post-editor-toolbar.spec.ts`, `image-upload-flow.spec.ts` | 작성/수정/삭제, toolbar 기능, 이미지 삽입 | mobile viewport에서 toolbar/action wrapping과 submit 영역 touch target |
| 댓글 | `post-comment-auth-sync.spec.ts`, `report-flow.spec.ts` | 로그인 상태 동기화, 댓글 작성, 댓글 신고 | mobile viewport에서 댓글 입력/답글/신고 menu touch target과 overflow |
| 신고 관리자 | `report-flow.spec.ts` | 신고 생성, 관리자 상세 기각 처리 | mobile/tablet에서 admin detail/list action touch target |
| 돌봄 피드백 관리자 | `care-feedback-mobile.spec.ts`, `care-request-flow.spec.ts` | mobile card 표시, overflow, care flow 연결 | button/input 40px bounding box 직접 확인 |
| 정책 관리자 | `admin-guest-post-policy.spec.ts`, `admin-new-user-policy.spec.ts` | 정책 저장/재로드 | visual smoke 필요성 낮음 |
| 알림/프로필/소셜 | `notification-filter-controls.spec.ts`, `profile-social-account-linking.spec.ts` | 필터/읽음/소셜 연결 기능 | P2-18 소스 회귀 테스트로 충분 |

## 선별 결과

### 추가 필요: P2-23 post create/editor mobile visual smoke

우선순위: 높음

이유:
- 글쓰기는 핵심 생성 hot path다.
- rich editor toolbar는 실제 viewport에서 줄바꿈, sticky/scroll toolbar, submit 영역이 깨질 수 있다.
- 기존 e2e는 기능 성공 중심이고 mobile layout/touch target을 직접 보지 않는다.

권장 범위:
- viewport: `390x844`
- route: `/posts/new`
- 로그인 사용자 1명 seed 후 진입
- 확인:
  - title input, editor, toolbar 주요 button, submit button이 보인다.
  - 주요 form action이 40px 이상이다.
  - page-level horizontal overflow가 없다.
- 명령 후보:
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app exec playwright test e2e/post-create-editor-visual-smoke.spec.ts --project=chromium`

### 추가 필요: P2-24 comment/report mobile visual smoke

우선순위: 높음

이유:
- 댓글 입력, 답글, 수정/삭제 menu, 댓글 신고는 상세 화면 하단의 복잡한 mobile interaction이다.
- P2-17에서 소스 보강을 했지만 실제 viewport smoke는 아직 없다.
- `post-comment-auth-sync`와 `report-flow`는 기능 중심이라 touch target과 overflow를 직접 검증하지 않는다.

권장 범위:
- viewport: `390x844`
- route: seeded post detail
- 확인:
  - root comment input/submit 40px 이상
  - 작성된 댓글 item visible
  - comment menu summary/action 40px 이상
  - reply 또는 report open 후 select/textarea/submit 40px 이상
  - horizontal overflow 없음
- 명령 후보:
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 corepack pnpm@9.12.3 -C app exec playwright test e2e/comment-report-visual-smoke.spec.ts --project=chromium`

### 조건부 추가: P2-25 admin report/care mobile touch smoke

우선순위: 중간

이유:
- 관리자 신고 큐와 돌봄 피드백은 1인 운영에서 자주 쓰이지만, 일반 사용자 hot path보다 빈도가 낮다.
- `care-feedback-mobile.spec.ts`가 이미 mobile overflow를 확인한다.
- `report-flow.spec.ts`가 관리자 상세 기각을 확인한다.

권장 방식:
- 새 spec를 바로 만들기보다 기존 `care-feedback-mobile.spec.ts`에 40px bounding box assertion을 몇 개 추가한다.
- 신고 큐는 P2-24 이후 시간이 남을 때 별도 최소 spec로 추가한다.

### 추가 불필요: policy/admin form visual smoke

이유:
- 정책 form은 기능 e2e가 이미 저장/재로드를 확인한다.
- P2-8/P2-9에서 소스 회귀 테스트로 touch target을 잡고 있다.
- 1인 운영 기준에서 별도 visual smoke는 유지 비용 대비 효용이 낮다.

### 추가 불필요: notification/profile/social visual smoke

이유:
- 알림/프로필/소셜 연결은 이미 기능 e2e가 있고, P2-18에서 소스 회귀 테스트를 추가했다.
- 핵심 feed/detail/comment/create보다 출시 위험이 낮다.

## 실행 순서

1. P2-23: `post-create-editor-visual-smoke.spec.ts` 추가
2. P2-24: `comment-report-visual-smoke.spec.ts` 추가
3. P2-25: 기존 `care-feedback-mobile.spec.ts`에 touch target assertion 추가 여부 판단
4. 이후 반복:
   - 새 smoke는 `2~3 tests` 이내로 유지한다.
   - screenshot baseline은 만들지 않는다.
   - bounding box, visibility, horizontal overflow만 확인한다.
   - 기능 e2e와 중복되는 긴 작성/수정/삭제 전체 flow는 피한다.

## 보류

- 관리자 신고 큐 전체 table visual smoke:
  - admin 빈도가 낮고 table은 desktop overflow container가 의도된 구조라, 현재는 직접 추가하지 않는다.
- 전체 Playwright 전수 실행:
  - 핵심 smoke가 안정화된 뒤 별도 확장 단계에서만 수행한다.
