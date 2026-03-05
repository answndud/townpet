# OAuth Manual Check Report - 2026-03-05

- Base URL: https://townpet2.vercel.app
- oauth-real-e2e run: https://github.com/answndud/townpet2/actions/runs/22705265766

## Base URL Sanity
| Level | Check |
|---|---|
| OK | Base URL 위험 신호 없음 |

## Expected Callback URLs
- Kakao: `https://townpet2.vercel.app/api/auth/callback/kakao`
- Naver: `https://townpet2.vercel.app/api/auth/callback/naver`

## Provider Checks
| Provider | Status | Account | Start URL | Evidence | Notes |
|---|---|---|---|---|---|
| Kakao | pending |  | https://townpet2.vercel.app/login?next=%2Fonboarding | screenshot/video link |  |
| Naver | pending |  | https://townpet2.vercel.app/login?next=%2Fonboarding | screenshot/video link |  |

## Follow-up
- [ ] Base URL sanity `ERROR`가 있으면 Provider 콘솔 Redirect URI부터 수정.
- [ ] If both providers are pass, update PLAN Cycle 23 blocked items to done.
- [ ] If any provider fails, log incident + retry owner/date.

## PROGRESS.md Snippet
```md
### 2026-03-05: OAuth 실계정 수동 점검 (Kakao/Naver)
- 점검 범위
- 카카오/네이버 로그인 -> 온보딩 -> 피드 진입
- 자동 검증 run
- https://github.com/answndud/townpet2/actions/runs/22705265766
- Provider별 결과
- Kakao: `pending` (증적: <screenshot-or-video-link>)
- Naver: `pending` (증적: <screenshot-or-video-link>)
- Base URL sanity: `pass`
- 후속 조치
- [ ] Base URL sanity가 fail이면 콜백 도메인(운영 고정 URL)부터 수정 후 재점검
- [ ] 두 provider 모두 `pass`면 PLAN Cycle 23 `blocked -> done` 갱신
- [ ] 하나라도 `fail`이면 장애 원인/재시도 계획 기록
```
