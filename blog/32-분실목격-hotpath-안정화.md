# 분실/목격 hot path를 실사용 흐름으로 안정화한 기록

분실/목격 기능은 단순 게시글 카테고리가 아닙니다.

사용자가 실제로 원하는 것은 “글을 썼다”가 아니라 다음 흐름입니다.

1. 분실/목격 제보 페이지에 들어온다.
2. 분실 글 작성 화면으로 바로 이동한다.
3. 공개 가능한 위치, 시간, 특징을 구조화해서 남긴다.
4. 상세 화면에서 주변 공유 도구를 바로 찾는다.
5. 목격자는 댓글이 아니라 `목격했어요` 형태로 위치와 시간을 남긴다.
6. 민감한 위치와 사진은 보호자에게만 공개한다.
7. 피드와 랜딩에서는 댓글 수가 최신 상태로 보인다.

이번 작업은 이 흐름을 모바일 기준으로 끝까지 고정한 사이클입니다.

## 1. 왜 분실/목격을 별도 hot path로 봤는가

TownPet의 초기 포지셔닝은 “반려동물 SNS”가 아니라 “우리 동네 반려생활 정보 커뮤니티”입니다.
그중 분실/목격은 가장 긴급하고 공유 명분이 강한 기능입니다.

일반 커뮤니티 글이라면 작성, 목록 노출, 댓글 정도면 충분합니다.
하지만 분실/목격은 다음 조건이 추가됩니다.

- 공개 가능한 위치만 보여줘야 한다.
- 전화번호, 오픈채팅, 상세 주소 같은 민감 정보는 막아야 한다.
- 목격 제보는 일반 댓글과 구분되어야 한다.
- 공유 문구와 전단 이미지가 바로 필요하다.
- 모바일에서 한 손으로 빠르게 작성하고 공유할 수 있어야 한다.

그래서 이 기능은 `feed/write/comment`에 섞기보다 `lost-found` 전용 hot path로 관리하는 편이 맞다고 판단했습니다.

## 2. 사용자 흐름을 제품 surface로 분리했다

이번 안정화에서 확인한 주요 surface는 아래입니다.

| surface | 역할 |
| --- | --- |
| `/lost-found` | 공개 랜딩, 최근 제보, 등록/전체 제보 CTA |
| `/lost/new` | 분실/목격 작성 진입 |
| `/posts/new?type=LOST_FOUND&template=lost_pet` | 구조화 작성 화면 |
| `/feed/guest?type=LOST_FOUND` | 비회원 제보 목록 |
| `/posts/:id/guest` | 비회원 상세, 공유 도구, 목격 댓글 |
| `/api/posts/:id/lost-found-share.svg` | 전단/스토리용 공유 이미지 |
| `/api/posts/:id/comments` | 일반 댓글과 목격 제보 저장 |

핵심은 하나의 페이지를 예쁘게 만드는 것이 아니라, 사용자가 이동하는 경로가 끊기지 않도록 만드는 것입니다.

## 3. 목격 댓글을 일반 댓글과 분리했다

목격 제보는 일반 댓글과 데이터 성격이 다릅니다.
그래서 댓글 모델에 별도 subtype을 두고, 위치/시간/사진 URL/공개 범위를 구조화했습니다.

관련 코드:

- `app/prisma/schema.prisma`
- `app/src/lib/validations/comment.ts`
- `app/src/server/services/comment.service.ts`
- `app/src/server/queries/comment.queries.ts`
- `app/src/components/posts/post-comment-root-form.tsx`
- `app/src/components/posts/post-comment-thread.tsx`

이 구조 덕분에 댓글 목록에서는 `목격 제보` 배지를 붙이고, 실제 위치와 시간은 별도 메타로 표시할 수 있습니다.
반대로 `보호자에게만 공개`인 경우에는 공개 guest 상세에서 위치와 사진을 placeholder로 숨길 수 있습니다.

## 4. private sighting은 저장과 공개 표시를 분리했다

민감 정보는 저장 자체를 막는 것과 공개 표시를 막는 것이 다릅니다.

목격자는 보호자에게 전달해야 할 위치와 사진을 남길 수 있어야 합니다.
하지만 guest 공개 상세에서는 그 정보가 노출되면 안 됩니다.

그래서 query 레이어에서 공개 viewer를 기준으로 private sighting을 마스킹합니다.

- DB에는 `sightingLocation`, `sightingImageUrl`, `isPrivateSighting=true`가 저장된다.
- public guest viewer에게는 `보호자에게만 공개된 목격 제보입니다.` placeholder를 보여준다.
- 위치, 시간, 사진 링크는 공개 상세에 렌더하지 않는다.
- 작성자나 제보자처럼 볼 권한이 있는 viewer만 원본을 볼 수 있게 설계한다.

이 기준은 UI가 아니라 query/service 경계에서 지키는 것이 중요합니다.
UI에서만 숨기면 API 응답으로 민감 정보가 새어 나갈 수 있기 때문입니다.

## 5. 모바일 e2e로 실제 흐름을 고정했다

이번에 추가한 Playwright spec은 `app/e2e/lost-found-mobile-flow.spec.ts`입니다.

검증 범위:

- `/lost-found` 랜딩 CTA
- `/lost/new` 직접 진입이 분실 템플릿 작성 화면으로 수렴하는지
- `/feed/guest?type=LOST_FOUND&q=...` 검색 노출
- 상세 공유 패널의 카카오톡 문구, 전단 SVG 저장 링크
- 비회원 목격 댓글 실제 제출
- DB의 `LOST_FOUND_SIGHTING` 저장 필드
- 댓글 제출 후 DB `commentCount`, 피드 카드, 랜딩 카드 댓글 수 반영
- `보호자에게만 공개` 제보의 public guest 노출 제한
- 모바일 viewport overflow 없음

즉 “컴포넌트가 렌더된다”가 아니라 “사용자가 모바일에서 클릭하고 제출했을 때 실제로 저장되고 다시 보이는가”를 확인합니다.

## 6. 기본 quality gate에 넣지 않은 이유

이 spec은 중요하지만 매번 돌릴 검사는 아닙니다.

분실/목격 e2e는 Playwright, DB fixture, Next dev server가 모두 필요합니다.
모든 변경에 붙이면 개발 속도가 느려지고, 분실/목격과 무관한 작업에서도 실패 원인을 해석해야 합니다.

그래서 기본 `quality:check`에는 넣지 않고 별도 on-demand 명령으로 분리했습니다.

```bash
corepack pnpm@9.12.3 -C app test:e2e:lost-found
```

실행 기준:

- 분실/목격 랜딩 변경
- 분실/목격 작성/상세 변경
- 공유 도구 변경
- 댓글/목격 제보 저장 변경
- private sighting 공개 정책 변경
- 피드/랜딩 댓글 수 표시 변경

이렇게 하면 중요한 회귀는 잡되, 모든 작업의 hot path를 무겁게 만들지 않습니다.

## 7. 포트폴리오 관점에서 말할 수 있는 것

이 작업은 백엔드 포트폴리오에서 다음 포인트를 보여줍니다.

- 단순 CRUD가 아니라 사용자 여정 기준으로 기능을 닫았다.
- 개인정보/악용 가능성이 있는 UGC를 query/service/UI/test로 나눠 제어했다.
- DB 저장 원본과 public read model을 분리했다.
- 비회원도 쓸 수 있는 기능에 guest identity, password, rate-limit, private visibility를 붙였다.
- Playwright를 “전체 e2e”가 아니라 제품 hot path별 on-demand 검증으로 설계했다.
- 기능 완료 후 README, 운영 문서, e2e scope 문서까지 동기화했다.

면접에서 짧게 말하면 이렇게 정리할 수 있습니다.

> 분실/목격 기능은 단순 게시판 타입이 아니라 획득 루프에 가까운 기능으로 봤습니다. `/lost-found` 랜딩, 구조화 작성, 상세 공유, 목격 댓글, 보호자 공개 privacy, 댓글 수 동기화까지 하나의 모바일 hot path로 묶고, public read model에서 민감 위치와 사진을 마스킹했습니다. 다만 Playwright spec은 무거우므로 기본 quality gate에는 넣지 않고 `test:e2e:lost-found` on-demand 명령으로 분리했습니다.

## 8. 남은 확장

이번 사이클은 “분실/목격 hot path 안정화”까지입니다.
다음 확장은 제품 성장 쪽입니다.

- 전단 이미지 품질 개선
- 카카오톡 공유 SDK 연동
- 보호자 전용 제보 관리 화면
- 지역별 분실/목격 SEO 페이지
- 관리자 허위 제보/개인정보 신고 큐 개선
- 실사용 이벤트 기반 funnel 개선

중요한 것은 이 확장 전에 이미 기본 여정과 privacy 기준이 테스트로 고정되어 있다는 점입니다.
