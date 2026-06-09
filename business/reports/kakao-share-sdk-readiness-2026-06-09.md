# 카카오 공유 SDK 적용 조건 확인 리포트

- 날짜: 2026-06-09
- 범위: 분실/목격 공유 패널의 카카오톡 직접 공유 SDK 적용 전 준비 조건
- 목적: SDK 구현 전에 앱 키, 도메인 등록, 템플릿, 웹훅, 개인정보 정책 조건을 확정한다.

## 결론

지금 바로 SDK 코드를 붙이기보다 `카카오 개발자 콘솔 준비 -> default template 최소 구현 -> 실기기 smoke -> 웹훅/커스텀 템플릿 보류` 순서가 맞다.

현재 TownPet에는 카카오 로그인용 `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`가 있지만, JavaScript SDK 공유에 필요한 공개 JavaScript 키 env는 별도로 없다. 또한 카카오 공유 메시지의 링크 도메인은 JavaScript SDK 실행 도메인과 별도로 제품 링크 웹 도메인 등록이 필요하다.

## 공식 문서 근거

- JavaScript SDK는 앱 관리 페이지의 `[앱] > [플랫폼 키] > [JavaScript 키]`에 서비스 정보를 등록하고, `Kakao.init("JAVASCRIPT_KEY")`로 초기화한다.
  - https://developers.kakao.com/docs/en/javascript/getting-started
- 2026-06-09 기준 JavaScript SDK 최신 버전은 `2.8.1`이고, 릴리스 날짜는 `2026-04-09`다.
  - https://developers.kakao.com/docs/en/javascript/download
- 기본 템플릿 공유는 `Kakao.Share.createDefaultButton()` 또는 `Kakao.Share.sendDefault()`를 사용하며, 필요 조건은 JavaScript key, JavaScript SDK domain, Product Link다.
  - https://developers.kakao.com/docs/en/kakaotalk-share/js-link
- JavaScript SDK 도메인은 `[앱] > [플랫폼 키] > [JavaScript 키] > [JavaScript SDK 도메인]`에 등록한다. 등록되지 않은 도메인 요청은 거절된다.
  - https://developers.kakao.com/docs/ko/app-setting/app
- 카카오톡 공유 메시지에 포함된 링크 URL 도메인은 `[앱] > [제품 링크 관리] > [웹 도메인]`에 등록해야 링크 이동이 허용된다.
  - https://developers.kakao.com/docs/en/getting-started/security-guideline

## TownPet 현재 상태 매핑

### 이미 준비된 것

- 분실/목격 공유 패널이 있다.
- 카카오톡에 붙여넣을 텍스트 복사 흐름이 있다.
- 공유 액션 기록 API가 있다.
- 분실/목격 PNG 전단 이미지 URL이 있다.
- 공개 연락처, 오픈채팅, 집 주소 전체를 공유 문구에서 제외하는 정책이 있다.
- acquisition event에 `KAKAO_SHARE_CLICKED`가 이미 정의되어 있다.

### 부족한 것

- 공개 JavaScript 키 env가 없다.
  - 제안: `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
- SDK 로더/초기화 helper가 없다.
- Kakao Developers 콘솔에서 아래 도메인 등록 여부가 확인되지 않았다.
  - JavaScript SDK 도메인: `https://townpet.vercel.app`
  - Product Link 웹 도메인: `https://townpet.vercel.app`
  - 추후 custom domain을 붙이면 custom domain도 별도 확인 필요
- 실기기 카카오톡 전송 smoke 증적이 없다.
- 카카오 공유 실패 시 현재의 텍스트 복사 fallback으로 내려가는 UI가 없다.

## 권장 1차 구현 범위

1차는 `default template + sendDefault`만 적용한다.

- 대상: 분실/목격 공유 패널의 `카카오톡 문구 복사` 버튼 옆 또는 대체 버튼
- 메시지 유형: 기본 템플릿 `feed` 또는 `text`
- 링크:
  - `mobileWebUrl`: `https://townpet.vercel.app/posts/[id]/guest`
  - `webUrl`: `https://townpet.vercel.app/posts/[id]/guest`
- 이미지:
  - 가능하면 기존 PNG 전단 URL 사용
  - 실패하거나 이미지 정책 제약이 있으면 게시글 대표 이미지 또는 사이트 기본 OG 이미지로 fallback
- 실패 fallback:
  - SDK 미초기화, 미등록 도메인, 카카오톡 미지원 환경, 팝업/앱 전환 실패 시 현재의 텍스트 복사 흐름으로 fallback
- 이벤트:
  - 버튼 클릭: `KAKAO_SHARE_CLICKED`
  - 실제 SDK 호출 성공 여부는 클라이언트에서 best-effort 상태 메시지로만 표시

## 보류할 것

### 커스텀 템플릿

커스텀 템플릿은 `[Tools] > [Message Template]`에서 템플릿 ID를 만들고 `sendCustom()`에 `templateId`, `templateArgs`를 넘겨야 한다. 아직은 운영자가 템플릿을 관리해야 하는 비용이 크므로 1차 범위에서 제외한다.

### 카카오톡 공유 웹훅

카카오톡 공유 웹훅은 실제 메시지 전송 상세 결과를 직접 보장하지 않는다. 문서상 webhook URL, request method, `serverCallbackArgs`, 서버 수신 처리가 필요하고, custom parameter가 없으면 웹훅이 전달되지 않는다. 현재 실제 유저가 없는 단계에서는 구현 비용 대비 이득이 낮다.

### 카카오 메시지 API

사용자 대신 메시지를 보내는 흐름은 동의/권한/정책 부담이 크다. TownPet 초기 획득 루프에는 사용자가 직접 공유하는 Kakao Talk Share가 맞다.

## 콘솔 설정 체크리스트

1. Kakao Developers 앱 확인
   - 기존 로그인 앱과 같은 앱을 쓸지, 공유 전용 앱 키를 분리할지 결정한다.
   - 1인 운영에서는 같은 앱을 쓰되 키별 설정을 엄격히 확인하는 방식이 단순하다.
2. JavaScript 키 확인
   - `[앱] > [플랫폼 키] > [JavaScript 키]`
   - 키 상태가 활성인지 확인한다.
3. JavaScript SDK 도메인 등록
   - `https://townpet.vercel.app`
   - 추후 custom domain
   - 로컬 실기기 테스트가 필요하면 개발용 도메인 또는 터널 도메인 별도 등록
4. Product Link 웹 도메인 등록
   - `https://townpet.vercel.app`
   - 추후 custom domain
5. 환경 변수 등록
   - local: `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
   - Vercel: `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
6. 모바일 실기기 smoke
   - Android Chrome -> 카카오톡 공유
   - iOS Safari -> 카카오톡 공유
   - 카카오톡 미설치/실패 환경 -> 텍스트 복사 fallback
7. 배포 후 확인
   - 분실/목격 게시글 상세에서 공유 버튼 클릭
   - 메시지 제목/설명/이미지/링크 확인
   - 개인정보 문구가 메시지에 포함되지 않는지 확인

## 구현 전 결정

- `Kakao.Share.sendDefault()`를 우선 사용한다.
- SDK script는 전체 앱에 상시 로드하지 않고, 공유 패널에서 사용자가 카카오 공유를 누를 때 지연 로드한다.
- 실패 시 현재 텍스트 복사 방식으로 fallback한다.
- 커스텀 템플릿과 웹훅은 실제 공유 사용량이 생긴 뒤 별도 phase로 둔다.
- SDK 키는 공개 JavaScript 키만 클라이언트에 노출하고, REST/API/Admin 키는 클라이언트에 절대 노출하지 않는다.

## 다음 구현 작업

- `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` env schema 추가
- Kakao SDK lazy loader 추가
- 분실/목격 공유 패널에 `카카오톡 공유` 버튼 추가
- SDK 실패 fallback과 상태 메시지 추가
- `KAKAO_SHARE_CLICKED` 이벤트 연결
- 단위 테스트로 SDK 미설정/성공/fallback 마크업과 이벤트 호출 경로 고정
