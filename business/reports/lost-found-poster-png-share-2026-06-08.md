# 분실/목격 전단 PNG 공유 개선 리포트

- 날짜: 2026-06-08
- 범위: 분실/목격 게시글 공유 패널과 전단 이미지 API
- 목적: 분실/목격 글을 모바일 메신저와 SNS에서 바로 공유하기 쉬운 이미지 자산으로 만든다.

## 결정

분실/목격 다음 확장 후보 중 `전단 이미지 품질`을 먼저 적용했다.

- 기존 SVG 전단은 유지한다.
- 같은 API에 `format=png` 옵션을 추가한다.
- 상세 화면 공유 패널의 기본 저장/미리보기는 PNG를 사용한다.
- 카카오 SDK 직접 연동, 보호자 전용 제보 관리 화면, PDF/QR 생성은 이번 범위에서 제외한다.

## 이유

- PNG는 카카오톡, 인스타그램, 모바일 브라우저 저장 흐름에서 SVG보다 예측 가능하다.
- 기존 SVG 생성 로직을 재사용할 수 있어 변경 범위가 작다.
- 외부 플랫폼 설정 없이 로컬/배포 환경에서 바로 검증할 수 있다.
- 카카오 SDK는 앱 키, 도메인 등록, 정책 검토가 필요하므로 PNG 전단이 안정된 뒤 붙이는 편이 낫다.
- 보호자 전용 제보 관리 화면은 인증, 개인정보, 제보 노출 정책이 함께 필요한 별도 큰 작업이다.

## 변경 내용

- `/api/posts/[id]/lost-found-share.svg`는 기존 SVG 응답을 계속 제공한다.
- `/api/posts/[id]/lost-found-share.svg?format=png`는 PNG 이미지를 반환한다.
- `/api/posts/[id]/lost-found-share.svg?format=png&download=1`는 PNG attachment 파일명으로 내려준다.
- 공유 패널의 `전단 저장`, `인스타/전단 이미지`, 전단 미리보기는 PNG URL을 사용한다.
- 공유 패널의 접근성 라벨과 저장 상태 문구를 `PNG` 기준으로 갱신했다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- src/lib/lost-found-share.test.ts 'src/app/api/posts/[id]/lost-found-share.svg/route.test.ts' src/components/posts/post-detail-action-accessibility.test.tsx`

## 남은 판단

- 카카오 공유 SDK는 앱 키/도메인 등록/검수 조건을 확인한 뒤 별도 작업으로 진행한다.
- 보호자 전용 제보 관리 화면은 제보자 개인정보 노출 정책과 rate limit을 먼저 설계해야 한다.
- 실제 분실/목격 콘텐츠가 쌓이면 PNG 전단 클릭/다운로드 이벤트로 공유 전환을 추적한다.
