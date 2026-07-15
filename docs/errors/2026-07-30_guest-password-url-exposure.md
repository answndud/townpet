# 게스트 글 비밀번호 URL 노출

## 증상

게스트 글 상세 액션의 수정 링크가 `?guest=1&pw=<비밀번호>` 형태로 생성되어 실제 글 수정·삭제 credential이 URL에 포함됐다.

## 원인

`app/src/components/posts/guest-post-detail-actions.tsx`가 비밀번호 입력값을 query string으로 조합했다. URL은 브라우저 history, 접근 로그, 관측 도구, 복사·공유 흐름에 남을 수 있다. 또한 edit page는 해당 `pw` query를 읽지 않아 비밀번호를 실제로 전달하지도 않았다.

## 수정

수정 링크에서는 `pw` query를 제거하고 `/posts/[id]/edit?guest=1`만 사용하도록 변경했다. 게스트 수정 API의 기존 비밀번호 검증은 유지하며, 사용자는 수정 화면에서 비밀번호를 다시 입력한다.

## 회귀 방지

- E2E에서 edit URL에 raw 또는 URL-encoded 비밀번호가 없는지 확인한다.
- 컴포넌트 소스 계약 테스트에서 credential query 생성을 금지한다.

## 검증

변경 후 관련 Vitest, lint, typecheck, build를 실행한다. production 로그·브라우저 history에 과거에 이미 노출된 값이 있는지는 배포 환경 별도 점검이 필요하다.
