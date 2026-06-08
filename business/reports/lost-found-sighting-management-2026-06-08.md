# 분실/목격 보호자 제보 관리 화면 리포트

- 날짜: 2026-06-08
- 범위: 분실/목격 게시글 작성자/운영자 전용 목격 제보 관리 화면
- 목적: 공개 댓글과 보호자 공개 제보를 작성자가 한 화면에서 확인하게 한다.

## 결정

새로운 제보 수집 모델을 만들지 않고, 기존 `LOST_FOUND_SIGHTING` 댓글을 보호자 전용 read-only 화면으로 모았다.

- 관리 URL: `/posts/[id]/sightings`
- 접근 대상: 게시글 작성자, ADMIN, MODERATOR
- 표시 대상: 활성 상태의 목격 제보 댓글
- 비공개 제보: 작성자/운영자 화면에서는 원문 위치, 시간, 내용을 표시한다.
- 비대상 사용자: 게시글 존재 여부를 숨기기 위해 404 흐름으로 처리한다.

## 정책 판단

- 새 전화번호, 이메일, 오픈채팅, 집 주소 입력 필드를 만들지 않았다.
- 기존 댓글 생성 경로의 Zod 검증과 개인정보 공개 제한을 그대로 사용한다.
- 이번 화면은 read-only라 별도 write rate limit은 추가하지 않았다.
- 운영자 접근은 실제 제보 분쟁, 허위 제보, 신고 처리 보조 목적으로 허용한다.
- 검색엔진 색인을 막기 위해 page metadata에 `noindex, nofollow`를 설정했다.

## 변경 내용

- 보호자 제보 관리용 read-only query를 추가했다.
- 작성자/운영자 접근 정책을 service 레이어에서 집행했다.
- 서버 렌더링 page를 추가해 제보 수, 보호자 공개 수, 공개 제보 수, 최근 제보 시각을 보여준다.
- 상세 페이지 분실/목격 정보 패널의 작성자/운영자 영역에 `제보 관리` 링크를 추가했다.
- 정책 테스트와 서버 page 렌더링 테스트를 추가했다.

## 검증

- `corepack pnpm@9.12.3 -C app test -- src/server/services/lost-found-sighting-management.service.test.ts 'src/app/posts/[id]/sightings/page.test.tsx' src/components/posts/post-detail-info-panels-accessibility.test.ts`
- `corepack pnpm@9.12.3 -C app typecheck`
- `corepack pnpm@9.12.3 -C app lint -- src/server/queries/lost-found-sighting-management.queries.ts src/server/services/lost-found-sighting-management.service.ts src/server/services/lost-found-sighting-management.service.test.ts 'src/app/posts/[id]/sightings/page.tsx' 'src/app/posts/[id]/sightings/page.test.tsx' src/components/posts/post-detail-info-panels.tsx src/components/posts/post-detail-info-panels-accessibility.test.ts`

## 남은 판단

- 제보 상태 변경, 제보자-보호자 비공개 대화, 지도 기반 표시, 카카오 공유 SDK는 별도 작업으로 분리한다.
- 실제 제보가 쌓이면 보호자 화면에서 어떤 제보가 해결에 도움이 됐는지 운영 기준을 추가한다.
