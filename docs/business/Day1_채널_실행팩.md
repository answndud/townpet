# Day1 채널 실행팩

기준일: 2026-03-08
대상: TownPet 초기 유입 Day1 수동 게시

## 목적

- 외부 채널 게시를 "복붙 후 게시" 수준으로 줄인다.
- Day1은 네이버 1채널만 운영하고, 24시간 판정 뒤에만 채널을 늘린다.

## 공통 규칙

- 랜딩 URL은 `/feed` 1개로 통일한다.
- 첫 게시에서는 과장 표현, 의료 단정, 연락처/외부 메신저 유도 문구를 넣지 않는다.
- 첫 24시간은 조회수보다 `댓글/가입/첫 행동`을 우선 본다.
- Day1은 네이버만 게시하고 카카오/인스타는 보류한다.

## Day1 채널 UTM

| Channel | URL |
|---|---|
| Naver Blog | `https://townpet.vercel.app/feed?utm_source=naver&utm_medium=blog&utm_campaign=day1_ondongne&utm_content=seed-post-1` |

## 1. Naver Blog

- 게시 유형: 시작가이드 1건
- 제목:

```text
동네 반려생활 정보, 광고 말고 실제 경험으로 찾고 싶다면
```

- 본문:

```text
반려생활에서 정말 급한 순간은 대부분 "지금 이 동네에서 실제로 어떤 경험을 했는지"가 필요할 때였습니다.

병원 후기가 광고처럼 보이거나,
산책 코스는 오래된 정보만 남아 있거나,
실종/목격 글은 흩어져 있어서 찾기 어려웠습니다.

그래서 TownPet은 동네 반려생활 경험을 익명 질문, 후기, 제보 중심으로 모으는 커뮤니티로 시작했습니다.

처음에는 아래 3가지만 바로 확인해 보시면 됩니다.
1. 지금 내 상황과 비슷한 글이 있는지 보기
2. 질문/후기/제보 템플릿으로 바로 남기기
3. 댓글로 실제 경험을 받아보기

광고보다 실제 경험이 필요한 순간,
정답보다 빠른 현장 정보가 필요한 순간에 쓰기 좋은 구조로 만들었습니다.

둘러보기:
https://townpet.vercel.app/feed?utm_source=naver&utm_medium=blog&utm_campaign=day1_ondongne&utm_content=seed-post-1

첫날에는 가입자 수보다,
"읽고 들어와서 실제로 한 번 질문/댓글을 남기는지"를 더 중요하게 보고 있습니다.
```

- 증적:
  - 게시 URL
  - 게시 화면 스크린샷 1장

## 보류 채널

- Kakao Open Chat: Day1 범위에서 제외
- Instagram: Day1 범위에서 제외
- 확장 조건: 네이버 글 1건에서 클릭/가입/첫 행동 데이터가 확인될 때만 재투입

## 게시 후 즉시 체크

- [ ] Naver Blog 게시 완료
- [ ] 게시 URL 확보
- [ ] 스크린샷 확보
- [ ] `/tmp/day1-growth-handoff-2026-03-08.md`의 Status/실행 로그 업데이트

## 24시간 후 체크

- Read -> Signup
- Signup -> First action
- First post -> 24h first comment

판정 규칙:

- Keep: 댓글/가입/첫 행동 반응이 예상 범위에 들어오면 동일 메시지 유지
- Fix: 클릭은 있는데 가입/행동이 약하면 제목 또는 CTA 1개만 수정
- Kill: 노출 대비 클릭과 반응이 모두 낮으면 다른 채널 확장 없이 네이버 메시지부터 재작성
