# 운영 DB demo/E2E 데이터 정리 절차

목적: production DB에 남은 샘플, E2E, visual smoke 성격 데이터를 실제 사용자 콘텐츠와 섞지 않고 안전하게 식별, 검토, 정리한다.

이 문서는 삭제를 바로 실행하는 문서가 아니다. 기본 원칙은 `read-only audit -> 사람이 후보 확인 -> 별도 cleanup 작업 승인 -> 배포/운영 smoke` 순서다.

## 기본 원칙

- production DB는 기본적으로 수정하지 않는다.
- 삭제, 숨김, 계정 정리는 반드시 후보 목록과 영향 범위를 먼저 확인한 뒤 별도 작업으로 연다.
- 실사용자 글이 하나라도 후보에 섞일 가능성이 있으면 즉시 중단한다.
- public 화면에서만 숨기면 되는 문제는 우선 query/filter/UI 방어로 처리하고, DB 삭제는 마지막 선택지로 둔다.
- 분실동물, 병원 후기, 신고, 제재, 정정 요청과 연결된 데이터는 더 보수적으로 다룬다.

## 후보 판정 신호

우선 후보로 보는 신호:

- 작성자 email 또는 nickname에 `E2E`, `playwright`, `test-user`, `townpet-demo`, `adoption-demo`, `demo`가 포함됨
- 작성자 nickname이 `샘플·`로 시작함
- 게시글 제목, 본문, 구조화 검색 텍스트에 `[샘플`, `[PW`, `PW SEARCH`, `[VISUAL SMOKE]`, `visual-smoke`, `비회원E2E`가 포함됨
- 댓글 본문 또는 비회원 표시명이 위 신호를 포함함
- 소유한 demo 도메인 email로 생성된 계정

후보가 곧 삭제 대상이라는 뜻은 아니다. 운영자가 실제 사용자 테스트 계정, 초기 수동 등록 콘텐츠, 운영자 정리 콘텐츠를 분리해서 확인해야 한다.

## read-only audit

로컬 DB 기준:

```bash
pnpm -C app db:audit:demo-content
```

production DB 기준:

```bash
DEMO_CONTENT_AUDIT_CONFIRM=DEMO_CONTENT_AUDIT \
DEMO_CONTENT_EMAIL_DOMAIN=demo.townpet.co.kr \
DEMO_CONTENT_AUDIT_LIMIT=30 \
pnpm -C app db:audit:demo-content
```

환경 변수:

- `DATABASE_URL`: 점검 대상 DB. production DB에서는 Vercel/GitHub Actions secret으로만 주입한다.
- `DEMO_CONTENT_AUDIT_CONFIRM=DEMO_CONTENT_AUDIT`: non-local DB read-only audit 확인값.
- `DEMO_CONTENT_EMAIL_DOMAIN`: 소유한 demo email 도메인. 설정하면 해당 도메인 계정을 후보에 포함한다.
- `DEMO_CONTENT_AUDIT_LIMIT`: 샘플 출력 수. 기본 20, 최대 100.

출력:

- 후보 user/post/comment 전체 count
- user sample: id, email, nickname, post/comment count
- post sample: id, 상태, 타입, scope, 제목, 작성자, comment/report count
- comment sample: id, postId, 상태, 작성자, 본문 일부

## No-Go 조건

아래 조건이면 정리 작업을 진행하지 않는다.

- 후보 제목/본문만 보고 demo인지 판단하기 어렵다.
- 후보에 신고가 걸린 글, 제재 기록, 정정 요청, 분실동물 제보가 포함되어 있다.
- 후보 작성자 email이 실제 사용자 도메인이거나 운영자가 소유한 demo 도메인인지 불명확하다.
- cleanup 후 복구 방법이 없다.
- 현재 배포가 불안정하거나 `OPS_BASE_URL=https://townpet.vercel.app pnpm -C app ops:check:health`가 실패한다.

## 정리 방식 선택

우선순위:

1. public query/filter 방어
   - 홈 preview처럼 획득 화면에만 노출되면 안 되는 경우.
   - 실제 사용자 데이터일 가능성이 있거나 삭제가 과한 경우.
2. 관리자 화면에서 수동 숨김 또는 상태 변경
   - 운영자가 글 단위로 확인할 수 있고, 감사/신고 흐름을 보존해야 하는 경우.
3. legacy demo cleanup workflow
   - `production-demo-content` workflow로 생성한 소유 demo 도메인 계정과 글임이 확실한 경우에만 사용.
4. 직접 DB cleanup
   - 현재 기본 운영 루틴에는 포함하지 않는다. 별도 runbook과 복구 계획이 없으면 금지한다.

## legacy workflow 사용 조건

`.github/workflows/production-demo-content.yml`는 manual-only legacy helper다.

사용 가능한 경우:

- 과거 `DEMO_CONTENT_EMAIL_DOMAIN`으로 생성한 demo 계정만 정리한다.
- audit 결과의 후보 user email이 모두 소유 demo 도메인에 속한다.
- 삭제 대상 post/comment/report 영향이 사람이 확인한 범위 안에 있다.
- 실행 전후 health check와 `/api/home/feed` 확인을 기록할 수 있다.

실행 금지:

- E2E/test 글이 guest author로 생성된 경우
- 실제 운영자가 수동 작성한 안내/운영자 정리 콘텐츠인 경우
- demo 도메인 외 email 계정이 포함된 경우
- 분실동물/병원/정정/신고 데이터가 섞인 경우

workflow cleanup mode:

- GitHub Actions에서 `production-demo-content`를 수동 실행한다.
- `mode=cleanup`
- `email_domain=<소유 demo 도메인>`
- `include_lost_found=false`
- 실행 후 artifact와 summary의 `deletedPosts`, `deletedUsers`를 기록한다.

## 실행 후 검증

정리 작업을 별도로 승인해 실행했다면 아래를 확인한다.

```bash
OPS_BASE_URL=https://townpet.vercel.app pnpm -C app ops:check:health
curl -sS https://townpet.vercel.app/api/home/feed
```

확인 항목:

- `/api/health` 200
- `/api/home/feed`에 demo/E2E 신호가 없음
- `/` desktop/mobile에서 테스트 제목이나 특정 실험 지역명이 노출되지 않음
- 삭제 count와 남은 후보 count를 `docs/PROGRESS.md` 또는 별도 report에 기록

## 기록 위치

- 실행 전 계획: `docs/PLAN.md`
- 실행 중 결과: `docs/PROGRESS.md`
- 완료 archive: `docs/COMPLETED.md`
- 긴 후보 목록이나 운영 증적: `docs/reports/`

후보 목록에는 개인정보가 섞일 수 있으므로, email 전체를 공개 문서에 남길지 여부는 운영자가 판단한다. 외부 공유 문서에는 email local-part를 마스킹한다.
