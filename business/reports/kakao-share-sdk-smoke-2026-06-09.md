# 카카오 공유 SDK 실전 smoke 리포트

- 날짜: 2026-06-09
- 대상: `https://townpet.vercel.app/posts/cmpnejuwa000111t0ggt99sfx/guest`
- 목적: 카카오 공유 SDK 1차 구현이 production에서 안전하게 노출되는지 확인한다.

## 결론

현재 production 카카오 직접 공유는 `NO-GO`다.

코드와 API는 준비됐고, 공유 도구 lazy-load와 fallback 문구 복사는 정상이다. 하지만 production build에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`가 반영되지 않아 `카카오톡 공유` 직접 버튼이 노출되지 않는다. 따라서 Android/iOS 카카오톡 실전 전송 smoke는 아직 수행할 수 없다.

## 확인 결과

### PASS

- production health check:
  - `https://townpet.vercel.app/api/health`
  - 결과: `200`, `{ "ok": true, "status": "ok" }`
- 공유 액션 API:
  - `POST /api/posts/cmpnejuwa000111t0ggt99sfx/share`
  - body: `{ "action": "KAKAO_SHARE" }`
  - 결과: `200`, `{ "ok": true, "data": { "recorded": true } }`
- 전단 PNG:
  - `GET /api/posts/cmpnejuwa000111t0ggt99sfx/lost-found-share.svg?format=png`
  - 결과: `200`, `image/png`, `1080 x 1920`
- production 브라우저 클릭 smoke:
  - 상세 페이지 진입
  - `분실/목격 공유 도구 열기` 클릭
  - lazy-loaded 공유 패널 표시
  - `카카오톡 문구 복사` 버튼 1개 노출
  - 클릭 전 Kakao SDK script 0개 확인
- GitHub Actions:
  - `quality-gate` 최신 run 성공
  - 직전 실패 원인인 UTC timezone 의존성을 `Asia/Seoul` 고정으로 수정

### FAIL

- local env:
  - `app/.env.local`은 존재하지만 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` 값은 없음
- GitHub repository secrets:
  - `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`만 확인됨
  - `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` 없음
- production direct Kakao button:
  - `카카오톡 공유` 직접 버튼 count: `0`
  - 원인 후보: Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`가 없거나, env 추가 후 재배포가 아직 반영되지 않음

### 보류

- Kakao Developers 콘솔 확인:
  - JavaScript SDK 도메인 `https://townpet.vercel.app`
  - Product Link 웹 도메인 `https://townpet.vercel.app`
  - 제가 콘솔에 접근할 수 없어 직접 확인 불가
- Android/iOS 카카오톡 실전 전송:
  - direct button이 production에 노출된 뒤 실기기에서 확인 가능

## 재현 명령

```bash
curl -sS -D - https://townpet.vercel.app/api/health

curl -sS -D - -X POST \
  https://townpet.vercel.app/api/posts/cmpnejuwa000111t0ggt99sfx/share \
  -H 'content-type: application/json' \
  --data '{"action":"KAKAO_SHARE"}'

curl -sS -D - \
  'https://townpet.vercel.app/api/posts/cmpnejuwa000111t0ggt99sfx/lost-found-share.svg?format=png' \
  -o /tmp/townpet-lost-poster.png
```

production 클릭 smoke 요약:

```json
{
  "deferredButtonVisibleBeforeClick": true,
  "directKakaoButtonCount": 0,
  "copyKakaoButtonCount": 1,
  "shareToolTitleVisible": "주변 공유 도구",
  "sdkScriptCountBeforeDirectClick": 0
}
```

## 다음 조치

1. Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가한다.
2. Kakao Developers에서 아래 도메인을 등록/확인한다.
   - JavaScript SDK 도메인: `https://townpet.vercel.app`
   - Product Link 웹 도메인: `https://townpet.vercel.app`
3. production 재배포를 실행한다.
4. 상세 페이지에서 공유 도구를 열어 `카카오톡 공유` 버튼이 노출되는지 확인한다.
5. Android Chrome, iOS Safari에서 카카오톡 공유 화면 진입을 확인한다.
6. 실패 환경에서는 텍스트 복사 fallback 메시지가 나오는지 확인한다.

