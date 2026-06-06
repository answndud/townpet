# `/onboarding` 로그인 redirect next 유실

- 날짜: 2026-06-06
- 재현: 비로그인 상태에서 홈의 `내 동네 설정` CTA 또는 `/onboarding` 직접 접근 시 `/login`으로만 이동했다.
- 원인: `app/src/app/onboarding/page.tsx`가 보호 경로 redirect를 하드코딩된 `/login`으로 호출해 로그인 폼의 `next` 처리 경로까지 목적지가 전달되지 않았다.
- 수정: `buildLoginRedirectPath("/onboarding")` helper를 추가하고, 세션 없음/이메일 없음/사용자 없음 redirect에서 `/login?next=%2Fonboarding`을 사용하게 변경했다.
- 회귀 테스트: `src/app/onboarding/page.test.tsx`, `src/lib/redirect-path.test.ts`.
