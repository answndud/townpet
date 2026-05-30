# PLAN.md

목표: TownPet를 기능/운영/품질/속도 기준에서 실제 유저 획득이 가능한 동네 반려생활 정보 서비스 상태로 유지한다.

완료 이력 archive: [COMPLETED.md](./COMPLETED.md)

## 범위/원칙

- active 문서에는 현재 진행 중이거나 다음에 바로 착수할 항목만 남긴다.
- 완료 상세와 긴 검증 로그는 [COMPLETED.md](./COMPLETED.md)에 append한다.
- 새 작업을 시작할 때는 코드보다 먼저 이 문서에 새 phase를 추가한다.
- 지역을 하나로 제한하지 않는다. `/`과 public acquisition UI에는 사용자가 선택하지 않은 특정 지역명을 기본값처럼 노출하지 않는다.
- 보류 범위: 결제/보험/정산, 자동 제재 강행, 카카오맵/마켓/공동구매 deep feature 확장.

## Active

### 성능 90점 이상 하드닝

- 상태: `in_progress`
- 목표: Next.js/PostgreSQL/Vercel 구조와 상세 페이지 기능을 유지하면서 실제 배포 성능 점수를 90점 이상 수준으로 올린다.
- 기준 경로:
  - `/`
  - `/login`
  - `/feed/guest`
  - 대표 public detail `/posts/cmpnejuwa000411t0dazcem8h/guest`
- 현재 병목:
  - public detail mobile total transfer `306KB`
  - public detail mobile script transfer `257KB`
  - public detail mobile LCP p50 `664ms`, p95 `872ms`
- 목표:
  - public detail mobile total transfer `<= 280KB`
  - public detail mobile script transfer `<= 220KB`
  - public detail mobile LCP p50 `<= 650ms`
  - `/`, `/login`, `/feed/guest` 기존 budget 유지
- 작업:
  1. 상세 페이지 client boundary와 chunk 구성을 분석한다.
  2. 댓글/신고/수정/삭제/action menu 등 클릭 후 필요한 UI를 기능 유지 상태에서 초기 bundle 밖으로 분리한다.
  3. 좋아요/싫어요, 북마크, 공유, 신고, 비회원 댓글, 비회원 수정/삭제, 댓글 답글 기능 회귀를 검증한다.
  4. production 성능을 재측정하고 before/after를 `blog/31`과 `docs/COMPLETED.md`에 남긴다.

## 다음 작업 후보

- authenticated admin queue smoke production credential 확보 후 재실행
