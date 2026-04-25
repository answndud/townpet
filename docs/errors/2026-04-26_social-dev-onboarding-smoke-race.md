# 2026-04-26 | social-dev onboarding smoke race

## 증상
- `corepack pnpm -C app test:e2e:smoke`에서 `social-onboarding-flow (kakao)`가 간헐적으로 실패했다.
- 실패 양상은 `/login?next=/onboarding&devShowKakao=1`에 머물거나, 온보딩 프로필 저장 후 `프로필이 저장되었습니다.` 메시지를 받지 못하는 형태였다.

## 원인
- `social-onboarding-flow.spec.ts` 단독 실행은 통과했다.
- 전체 smoke에서는 `kakao-login-entry.spec.ts`와 `naver-login-entry.spec.ts`가 social-dev callback 요청을 실제로 보내면서 정적 e2e 소셜 계정을 변경했다.
- 이 entry 테스트들은 “소셜 로그인 요청이 시작되는지”만 확인하면 되지만, callback까지 실제 처리되면서 온보딩 테스트의 계정 reset/세션 흐름과 병렬로 충돌할 수 있었다.

## 수정
- 소셜 entry 테스트에서 `**/api/auth/callback/social-dev**` 요청을 Playwright route로 intercept해 `204`로 종료한다.
- 버튼이 callback 요청을 시작하는지는 기존 waitForRequest 검증으로 유지하고, DB/session 부작용은 막는다.
- 온보딩 플로우는 dev server 병렬 부하에서 social-dev callback redirect가 5초를 넘길 수 있어 `/onboarding` URL 대기 시간을 15초로 늘린다.
- 닉네임은 20자 제한 안에서 provider, timestamp, random suffix를 조합해 충돌 가능성을 줄이고 입력값 반영을 확인한 뒤 submit한다.

## 검증
- `ENABLE_SOCIAL_DEV_LOGIN=1 corepack pnpm -C app exec playwright test e2e/social-onboarding-flow.spec.ts --project=chromium --workers=1`
- `corepack pnpm -C app test:e2e:smoke`
