# PLAN.md

## Goal

운영 공개 화면의 콘텐츠 품질과 회귀 안전성을 유지한다. 공개 목록에서 테스트성 콘텐츠를 차단하고, 게시글 상세·홈·모바일·정책 페이지의 상태와 문구를 일관되게 제공한다. 남은 완료 조건은 변경사항을 배포한 뒤 production health와 동일한 공개 smoke를 통과하는 것이다.

## Active

1. production에 공개 화면 개선사항 배포 및 확인
   - 파일: `app/e2e/public-surface-smoke.spec.ts`, `.github/workflows/*`, `business/reports/api-route-contracts.generated.md`, `business/archive/operations/문서 동기화 리포트.md`
   - 변경: 현재 변경사항을 의도한 범위로 커밋·푸시하고 Preview 배포를 확인한다. PR quality/docs/Vercel checks와 production `/api/health`를 확인한 뒤, `/`, `/feed/guest`, `/lost-found`, `/login`, `/corrections/new`, `/terms`, `/privacy`, `/commercial` 및 공개 게시글 상세를 smoke한다.
   - 검증: `pnpm -C app quality:check`; `pnpm -C app test:e2e -- e2e/public-surface-smoke.spec.ts --project=chromium`; `pnpm -C app ops:check:health`; `curl -sS -i https://townpet.vercel.app/api/health`; `node scripts/refresh-docs-index.mjs --check`
   - 완료: PR checks와 Preview가 통과하고 production health·공개 경로 smoke가 통과하며, 배포 화면에서 테스트성 게시물과 빈 상세 로딩 화면이 재현되지 않는다.

## Backlog

- 키워드 기반 demo 차단을 `Post`의 명시적 공개 상태/fixture 분류 필드로 교체해 정상 사용자의 “테스트”라는 제목까지 차단하지 않도록 마이그레이션한다.
- Vercel production env에 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 추가하고 카카오 공유 SDK 실기기 smoke를 실행한다.
- 분실·목격 제보 상태 변경, 보호자-제보자 비공개 대화, 지도 기반 표시 중 다음 확장 범위를 선택해 설계한다.
