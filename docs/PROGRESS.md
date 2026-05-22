# PROGRESS.md

## 현재 상태

- 현재 active 계획: [PLAN.md](./PLAN.md)의 `마케팅 피드백 기반 제품 획득 루프 재정렬`.
- 성능 측정과 속도 개선 루프는 `blog/29-성능개선-측정과-최적화-기록.md`까지 작성해 완료했다.
- `P0-2. 전역 카피와 메타데이터 통일`을 완료했다.
- `P0-3. 초기 지역 선택 UX 명확화`를 완료했다.
- `P0-4. 지역 허브 route 추가`를 완료했다.
- `/` production 진입이 피드 redirect가 아니라 정적 홈을 직접 보여주도록 회귀 수정했다.
- `/` 시작페이지에서 특정 지역명 노출과 지역 허브 CTA를 제거했고, active 계획의 지역 기본값도 `초기 지역 미확정` 기준으로 수정했다.
- 지역 허브 config를 비활성화해 확정되지 않은 `/towns/*` 정적 route와 sitemap entry가 생성되지 않도록 정리했다.
- 앱 코드/테스트/seed/demo 예시에서 이전 특정 지역명 예시를 제거했다. 전국 행정구역 원본 데이터와 완료 archive는 기록/원본 성격으로 유지한다.
- `/towns/{city--district}`를 사용자 선택 동네 기반 동적 허브로 전환했다.
- 프로필의 대표 동네에서 `내 동네 허브 보기`로 동적 허브에 진입할 수 있다.
- `P0-4a. 사용자 선택 동네 허브 진입 흐름 연결`을 완료했다. 홈은 정적 유지, 온보딩 동네 저장 성공 후 대표 동네 허브로 이동한다.
- `/` 시작페이지에서 중복 CTA를 정리하고, 최근/인기 글 미리보기를 카드 그리드가 아니라 피드형 세로 목록으로 바꿨다.
- 홈 피드 미리보기 row를 더 compact하게 줄였고, 모바일 상단 셸에서 별도 `피드` 줄을 제거했다.
- 홈 preview API에서 E2E/테스트 성격 글을 제외해 production 시작페이지에 테스트 제목이 노출되지 않도록 했다.
- `/` 시작페이지에는 landing 전용 간소 헤더를 적용했다. 홈에서는 `로고 + 게시판 + 로그인/내 프로필`만 보이고, 관심 동물/게시판 드롭다운은 피드 화면에서만 사용한다.
- `/` 시작페이지 CTA 아래의 `관심 주제` 영역과 Live board 목록/헤더 밀도를 줄였다. `전체 피드 보기` CTA는 hero에 1회만 유지하고, Live board에는 중복 CTA를 추가하지 않았다.
- `P0-5. SEO guide route 추가`를 완료했다. `/guides/*` 5개 정적 route와 canonical metadata, sitemap 포함, 홈 empty state guide 연결을 추가했다.
- `P0-6. robots/sitemap/canonical/Naver Search Advisor 체크리스트`를 완료했다. 운영 체크리스트 문서를 추가하고 robots/sitemap 회귀 테스트를 보강했다.
- `P0-7. 분실동물 전용 작성 플로우`를 완료했다. `/lost/new` 전용 진입, `LOST_FOUND` 사전 선택, 비회원 제보 허용, 분실/목격 구조화 필드, `LostFoundAlert` 저장, 검색 구조화 토큰, 정책/검증 테스트를 추가했다.
- `P0-8. 분실동물 공유 이미지/카카오톡 공유 MVP`를 완료했다. 상세 화면에 분실/목격 공유 패널, 카카오톡 복사용 문구, 링크 복사, SVG 공유 이미지 route, 공유 액션 로그 API, lost-found 전용 OG metadata를 추가했다.
- `P0-9. “목격했어요” 제보 흐름`을 완료했다. 댓글에 `LOST_FOUND_SIGHTING` subtype과 구조화 목격 위치/시간/사진 URL/보호자 공개 필드를 추가하고, 실종글 작성자/운영자가 상태를 `제보 접수 중/해결됨/종료`로 변경할 수 있게 했다.
- `P0-10. 병원 후기 템플릿 안전화`를 완료했다. 병원 후기 작성 폼을 비교 가능한 구조화 경험 데이터 중심으로 바꾸고, 위험 표현 검토 신호와 병원·장소 정보 정정 요청 경로를 연결했다.
- `P0-11. 산책코스 카드 필드 보강`을 완료했다. 산책코스 작성/상세/검색 구조를 대형견 적합, 혼잡 시간, 목줄 구간, 배변봉투함, 물 마실 곳, 주의 구간 중심으로 확장했다.
- `P0-12. 운영자 콘텐츠와 사용자 글 분리`를 완료했다. 운영자/모더레이터가 작성한 조사 콘텐츠는 출처, 원문 URL, 최종 확인일, 정보 정정 요청 CTA와 함께 사용자 글과 분리해 표시된다.
- `P1-1. 우리 동네 반려생활 지도 만들기 캠페인 페이지`를 완료했다. `/campaigns/neighborhood-map` public 캠페인 페이지, 홈 진입 링크, sitemap entry, 콘텐츠 현황 조회를 추가했다.
- `P1-2. Founding Member 배지`를 완료했다. 운영자 수동 부여 스크립트, User badge field, 캠페인/피드/프로필 노출, 캠페인 창립 멤버 현황 집계를 추가했다.
- `P1-3. 제보/추천 버튼과 첫 글 템플릿`을 완료했다. 캠페인/지역 허브/가이드 CTA가 글쓰기 템플릿으로 연결되고, `/posts/new`에서 제목/본문 초안과 템플릿 버튼을 제공한다.
- `P1-4. 획득 이벤트 정의`를 완료했다. public 랜딩/캠페인/가이드/지역 허브의 조회·CTA·템플릿 진입 이벤트를 `AcquisitionEventStat` 일별 집계로 연결하고, 첫 90일 이벤트 사전을 analytics 문서에 반영했다.
- `P1-5. 초기 지역 운영 지표`를 완료했다. `/admin/ops`에서 동네별 콘텐츠 밀도, 빈 카테고리, 분실동물 상태, 운영자 콘텐츠 확인일, 획득 이벤트, 첫 글/24h 댓글/D7 재방문 지표를 볼 수 있다.
- `P1-6. 오프라인 QR/파트너 운영 준비`를 완료했다. 병원/펫카페/미용실/보호소 QR source와 문제 해결형 landing/action URL, 파트너 제안서, 운영 체크리스트를 추가했다.

## 다음 액션

- 다음 작업은 `P1-7. 병원/업체 정정 요청 프로세스`다.
- P1-7 시작 전 확인할 파일:
  - `business/policies/*`
  - `business/security/보안_위험_등록부.md`
  - `app/src/app/admin/hospital-review-flags`
  - `app/src/lib/validations/moderation/*`
  - `app/src/server/services/moderation/*`
  - `app/src/server/queries/moderation/*`
- 시작페이지 추가 개선 후보:
  - 홈에는 간소 헤더를 적용했지만, 다른 public route의 모바일 앱 셸 밀도는 아직 기존 제품 헤더 기준이다. 필요 시 `/guides/*` 같은 SEO landing에도 같은 header 정책을 확장한다.
  - 홈 preview API는 테스트 성격 글을 숨기지만, seed/demo 데이터가 production DB에 섞이는 운영 원인은 별도 정리가 필요하다.
  - desktop에서 `지금 많이 보는 글`과 `최근 올라온 글`이 모두 비면 landing 하단이 약하다. 이번 작업에서 guide 링크를 empty 영역에 연결했지만, production seed/demo 데이터 운영 원인은 별도 정리가 필요하다.
- 확정 전에는 `/`과 public acquisition UI에 특정 지역명을 노출하지 않는다.
- 성능 후속은 최신 `main` 배포 후 같은 스크립트로 production 재측정할 때 별도 작업으로 연다.

## 최근 검증

- `P0-12. 운영자 콘텐츠와 사용자 글 분리`
  - `corepack pnpm@9.12.3 -C app exec prisma format`
  - `corepack pnpm@9.12.3 -C app exec prisma generate`
  - `corepack pnpm@9.12.3 -C app exec prisma migrate deploy`
  - `corepack pnpm@9.12.3 -C app test -- src/components/posts/post-create-submit.test.ts src/lib/validations/post.test.ts src/server/services/post-create-policy.test.ts`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `PUPPETEER_SKIP_DOWNLOAD=1 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
  - `git diff --check`
  - `corepack pnpm@9.12.3 -C app quality:check`
  - local browser smoke: `/posts/new` desktop/mobile, `/posts/{id}/guest`, `/feed/guest`
  - `node scripts/refresh-docs-index.mjs --check`
- 참고:
  - `pnpm -C app design:detect` 스크립트는 Corepack keyid 오류로 실패했다. 같은 detector는 루트 기준 명시 버전 `corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`로 통과했다.

- `P1-1. 우리 동네 반려생활 지도 만들기 캠페인 페이지`
  - `corepack pnpm@9.12.3 -C app test -- src/app/campaigns/neighborhood-map/page.test.tsx src/server/queries/campaign.queries.test.ts src/app/page.test.tsx src/app/sitemap.test.ts`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `PUPPETEER_SKIP_DOWNLOAD=1 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
  - `git diff --check`
  - `corepack pnpm@9.12.3 -C app quality:check`
  - `corepack pnpm@9.12.3 -C app build`
  - local browser smoke: `/campaigns/neighborhood-map` desktop/mobile screenshot

- `P1-2. Founding Member 배지`
  - `corepack pnpm@9.12.3 -C app exec prisma format`
  - `corepack pnpm@9.12.3 -C app exec prisma generate`
  - `corepack pnpm@9.12.3 -C app exec prisma migrate deploy`
  - `corepack pnpm@9.12.3 -C app test -- src/server/queries/campaign.queries.test.ts src/app/campaigns/neighborhood-map/page.test.tsx src/components/posts/feed-infinite-list.test.tsx`
  - `corepack pnpm@9.12.3 -C app test -- scripts/grant-founding-member.test.ts`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `PUPPETEER_SKIP_DOWNLOAD=1 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
  - `git diff --check`
  - `corepack pnpm@9.12.3 -C app quality:check`
  - local browser smoke: `/campaigns/neighborhood-map` desktop, `/feed/guest` mobile screenshot

- `P1-3. 제보/추천 버튼과 첫 글 템플릿`
  - `corepack pnpm@9.12.3 -C app test -- src/lib/post-create-templates.test.ts src/components/posts/post-create-basic-fields.test.tsx src/app/posts/new/page.test.tsx src/app/campaigns/neighborhood-map/page.test.tsx src/app/guides/page.test.tsx src/app/towns/page.test.tsx`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `PUPPETEER_SKIP_DOWNLOAD=1 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
  - `git diff --check`
  - `corepack pnpm@9.12.3 -C app quality:check`
  - local browser smoke: `/posts/new?type=WALK_ROUTE&template=walk_route_large_dog&town=서울%20강남구` desktop, `/campaigns/neighborhood-map` mobile screenshot

- `P1-4. 획득 이벤트 정의`
  - `corepack pnpm@9.12.3 -C app exec prisma format`
  - `corepack pnpm@9.12.3 -C app exec prisma generate`
  - `corepack pnpm@9.12.3 -C app exec prisma migrate deploy`
  - `corepack pnpm@9.12.3 -C app test -- src/server/services/acquisition-events.service.test.ts src/app/api/acquisition/events/route.test.ts src/app/page.test.tsx src/app/campaigns/neighborhood-map/page.test.tsx src/app/guides/page.test.tsx src/app/towns/page.test.tsx src/app/posts/new/page.test.tsx`
  - `corepack pnpm@9.12.3 -C app test -- src/app/api/acquisition/events/route.test.ts src/server/services/acquisition-events.service.test.ts`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `PUPPETEER_SKIP_DOWNLOAD=1 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
  - `git diff --check`
  - `corepack pnpm@9.12.3 -C app quality:check`
  - local browser smoke: `NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY=1` dev server에서 `/` mobile, `/campaigns/neighborhood-map` mobile, `/posts/new?type=WALK_ROUTE&template=walk_route_large_dog`; acquisition API 200 확인
  - production deploy: `015e62b Add acquisition event tracking` -> `https://townpet-jcxrex0r7-jmoon0227-9736s-projects.vercel.app` Ready, alias `https://townpet.vercel.app`
  - production smoke: `GET /api/health` 200, `POST /api/acquisition/events` 200 `{ recorded: true }`

- `P1-5. 초기 지역 운영 지표`
  - `corepack pnpm@9.12.3 -C app test -- src/server/queries/initial-region-ops.queries.test.ts src/server/queries/ops-overview.queries.test.ts`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `PUPPETEER_SKIP_DOWNLOAD=1 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
  - `git diff --check`
  - `corepack pnpm@9.12.3 -C app quality:check`
  - local browser smoke: admin login 후 `/admin/ops` desktop/mobile screenshot 확인 (`/tmp/townpet-admin-ops-desktop.png`, `/tmp/townpet-admin-ops-mobile.png`)
  - production deploy: `34d5afc Add initial region ops metrics` -> `https://townpet-9td9moz1a-jmoon0227-9736s-projects.vercel.app` Ready, alias `https://townpet.vercel.app`
  - production smoke: `GET /api/health` 200, unauthenticated `HEAD /admin/ops` 404 noindex 확인

- `P1-6. 오프라인 QR/파트너 운영 준비`
  - `corepack pnpm@9.12.3 -C app test -- src/lib/offline-partner-campaign.test.ts src/app/campaigns/neighborhood-map/page.test.tsx`
  - `corepack pnpm@9.12.3 -C app typecheck`
  - `corepack pnpm@9.12.3 -C app lint`
  - `PUPPETEER_SKIP_DOWNLOAD=1 corepack pnpm@9.12.3 dlx impeccable detect app/src/app app/src/components --fast`
  - `git diff --check`
  - `node scripts/refresh-docs-index.mjs --check`
  - `corepack pnpm@9.12.3 -C app quality:check`
  - local browser smoke:
    - `/campaigns/neighborhood-map?utm_source=petcafe_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` desktop screenshot: `/tmp/townpet-offline-qr-campaign-desktop.png`
    - `/campaigns/neighborhood-map?utm_source=shelter_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` mobile screenshot: `/tmp/townpet-offline-qr-campaign-mobile.png`
  - 참고: `pnpm -C app design:detect` 스크립트는 기존 Corepack keyid 오류로 실패했고, 같은 detector는 루트 기준 명시 버전 `corepack pnpm@9.12.3 dlx impeccable detect ...`로 통과했다.
