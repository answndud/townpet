# 카카오 공유 SDK 1차 구현 리포트

- 날짜: 2026-06-09
- 범위: 분실/목격 게시글 공유 패널의 카카오톡 직접 공유 1차 적용
- 목표: 카카오 JavaScript SDK 조건이 갖춰진 환경에서는 `Kakao.Share.sendDefault()`로 공유 화면을 열고, 실패하거나 키가 없으면 기존 텍스트 복사 흐름을 유지한다.

## 결론

분실/목격 공유 패널에 카카오톡 직접 공유 경로를 추가했다.

1차 구현은 운영 부담이 낮은 기본 템플릿만 사용한다. SDK는 앱 초기 진입 시 로드하지 않고, 사용자가 `카카오톡 공유`를 누를 때만 lazy load한다. 공개 JavaScript 키가 없으면 버튼을 노출하지 않아 기존 `카카오톡 문구 복사` 경험이 그대로 유지된다.

## 구현 내용

### 환경 변수

- 추가 env: `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
- 성격: 클라이언트에 노출 가능한 공개 JavaScript 키
- 미설정 시 동작: 카카오 직접 공유 버튼 미노출, 기존 복사 버튼 유지
- 금지: REST API 키, Admin 키, Client Secret을 클라이언트 env로 노출하지 않는다.

### SDK 로더

- SDK URL: `https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js`
- 사용 시점: 버튼 클릭 시점
- 초기화: `Kakao.init(NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY)`
- 재사용: 이미 로드된 script와 `window.Kakao`가 있으면 재초기화 없이 재사용한다.
- 실패 처리: SDK 로드/초기화 실패 시 promise를 초기화해 다음 클릭에서 재시도 가능하게 한다.

### 공유 템플릿

- 방식: `Kakao.Share.sendDefault()`
- 템플릿: default `feed`
- 제목: 기존 분실/목격 공유 제목 helper 사용
- 설명: 실종/목격 상태, 반려동물 종류, 위치 등 핵심 요약
- 이미지: 기존 PNG 전단 URL
- 링크: 게시글 guest 상세 URL
- 버튼: `제보 보기`

### fallback

아래 상황에서는 기존 텍스트 복사 흐름으로 내려간다.

- JavaScript 키 미설정
- SDK script 로드 실패
- SDK 초기화 실패
- 미등록 JavaScript SDK 도메인
- 카카오톡 공유 화면 열기 실패
- 브라우저/기기 정책에 따른 앱 전환 실패

fallback 성공 시 사용자에게 `카카오톡 공유를 열지 못해 붙여넣을 문구를 복사했습니다.` 메시지를 보여준다. 복사도 실패하면 링크 복사/전단 저장을 안내한다.

## 정책 확인

- 공유 문구에는 공개 전화번호, 오픈채팅, 집 주소 전체를 넣지 않는다.
- Kakao SDK는 공개 JavaScript 키만 사용한다.
- 실전 공유 성공 여부는 best-effort로만 표시한다.
- 웹훅, 메시지 API, 커스텀 템플릿은 실제 사용량과 운영 필요가 생긴 뒤 별도 phase로 둔다.

## 이벤트/기록

- acquisition event:
  - `KAKAO_SHARE_CLICKED`
  - `LOST_SHARE_ACTION_CLICKED` with `source=KAKAO_SHARE`
- 서버 share action log:
  - `KAKAO_SHARE`
- 기존 액션 유지:
  - `LINK_COPY`
  - `KAKAO_TEXT_COPY`
  - `POSTER_OPEN`
  - `POSTER_DOWNLOAD`

## 검증

실행한 검증:

```bash
corepack pnpm@9.12.3 -C app test -- src/lib/kakao-share.test.ts src/lib/lost-found-acquisition-events.test.ts 'src/app/api/posts/[id]/share/route.test.ts' src/components/posts/post-detail-action-accessibility.test.tsx
corepack pnpm@9.12.3 -C app typecheck
corepack pnpm@9.12.3 -C app lint -- src/lib/kakao-share.ts src/lib/kakao-share.test.ts src/lib/env.ts src/lib/lost-found-acquisition-events.ts src/lib/lost-found-acquisition-events.test.ts 'src/app/api/posts/[id]/share/route.ts' 'src/app/api/posts/[id]/share/route.test.ts' src/components/posts/lost-found-share-panel.tsx src/components/posts/post-detail-action-accessibility.test.tsx
```

검증 결과:

- SDK 미설정 상태에서 helper가 비활성으로 판정되는지 확인
- 공개 JavaScript 키 trimming 확인
- default feed template payload 확인
- private contact prompt가 template에 포함되지 않는지 확인
- 이미 존재하는 Kakao SDK 초기화 경로 확인
- `sendDefault()` 호출 계약 확인
- share action API가 `KAKAO_SHARE`를 기록하는지 확인
- 분실/목격 acquisition event schema가 `KAKAO_SHARE`를 허용하는지 확인

## 배포 전 수동 확인

Kakao Developers 콘솔에서 아래 값을 확인해야 실전 전송이 안정적으로 동작한다.

1. JavaScript SDK 도메인
   - `https://townpet.vercel.app`
   - 추후 custom domain
2. Product Link 웹 도메인
   - `https://townpet.vercel.app`
   - 추후 custom domain
3. Vercel env
   - `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
4. 실기기 smoke
   - Android Chrome -> 카카오톡 공유
   - iOS Safari -> 카카오톡 공유
   - 실패/미지원 환경 -> 텍스트 복사 fallback

## 남은 작업

- Kakao Developers 콘솔 설정 증적 확보
- Vercel production env 반영 확인
- 모바일 실기기 카카오톡 공유 smoke
- 공유 메시지 preview의 제목/설명/이미지 품질 확인
- 실제 공유 사용량이 생긴 뒤 custom template 또는 webhook 필요성 재판단

