# Production Demo/E2E Read-only Audit

- date: 2026-05-24
- target: `https://townpet.vercel.app`
- mode: read-only
- command: `DEMO_CONTENT_AUDIT_CONFIRM=DEMO_CONTENT_AUDIT DEMO_CONTENT_EMAIL_DOMAIN=demo.townpet.co.kr DEMO_CONTENT_AUDIT_LIMIT=50 pnpm -C app db:audit:demo-content`
- production DB mutation: not executed
- raw output: kept only in local `/tmp`, not committed

## Summary

| Candidate | Count |
| --- | ---: |
| Users | 7 |
| Posts | 17 |
| Comments | 68 |

## Candidate Pattern

- All sampled users use the owned demo domain `demo.townpet.co.kr`.
- All sampled user nicknames use the `샘플·` prefix.
- All sampled posts are `ACTIVE`.
- Sampled posts have `reports=0`.
- The 17 sampled posts match the legacy production demo content set, not Playwright/E2E guest smoke content.

## User Samples

Emails are masked in this report.

- `cmnmnntw7000ej7zxm4florkb` | `sa***@demo.townpet.co.kr` | `샘플·도리장터` | posts=2 comments=7
- `cmnmnntpx000dj7zxa4p14bf8` | `sa***@demo.townpet.co.kr` | `샘플·하리후기` | posts=2 comments=12
- `cmnmnntjn000bj7zxeukobobn` | `sa***@demo.townpet.co.kr` | `샘플·코코랑산책` | posts=2 comments=10
- `cmnmnntde000aj7zxiugez5n0` | `sa***@demo.townpet.co.kr` | `샘플·나비메모` | posts=2 comments=12
- `cmnmnnt740009j7zxw03h25gu` | `sa***@demo.townpet.co.kr` | `샘플·보리보호자` | posts=2 comments=10
- `cmnmnnt0v0008j7zxvdpknes7` | `sa***@demo.townpet.co.kr` | `샘플·마루집사` | posts=2 comments=10
- `cmnmnnsbp0007j7zxga2mxq7n` | `sa***@demo.townpet.co.kr` | `샘플·입양센터` | posts=5 comments=7

## Post Samples

- `cmnmoq6vz000h1slwux4j65lf` | `ACTIVE/FREE_BOARD/LOCAL` | `서초동 아침 산책 같이 다니실 분 있나요` | author=`샘플·마루집사` | comments=4 reports=0
- `cmnmoqdsk000z1slwfjpzwhb6` | `ACTIVE/FREE_POST/GLOBAL` | `고양이 자동급식기 일주일 사용 후기 공유해요` | author=`샘플·보리보호자` | comments=4 reports=0
- `cmnmoqijt001h1slw3h12g8qz` | `ACTIVE/DAILY_SHARE/LOCAL` | `망원한강공원 벚꽃 산책 사진 한 장 남기고 가요` | author=`샘플·나비메모` | comments=4 reports=0
- `cmnmoqo6l001z1slwudacsph6` | `ACTIVE/PET_SHOWCASE/GLOBAL` | `첫 목욕 끝내고 포근해진 코코 자랑합니다` | author=`샘플·코코랑산책` | comments=4 reports=0
- `cmnmoqtmx002i1slwakdhuzqh` | `ACTIVE/PRODUCT_REVIEW/GLOBAL` | `흡수형 패드 교체 주기 짧아지는 제품 찾는 분께 추천` | author=`샘플·하리후기` | comments=4 reports=0
- `cmnmoqydu002z1slw10glqdmc` | `ACTIVE/QA_QUESTION/GLOBAL` | `건강 검진에서 ALT 수치 살짝 높게 나오면 바로 식단 바꿔야 할까요` | author=`샘플·보리보호자` | comments=4 reports=0
- `cmnmor52g003j1slwhrayu1lt` | `ACTIVE/HOSPITAL_REVIEW/GLOBAL` | `24시 강동동물의료원 야간 건강 검진 상담은 빨랐어요` | author=`샘플·하리후기` | comments=4 reports=0
- `cmnmorapc00411slw3ig0jxmw` | `ACTIVE/PLACE_REVIEW/GLOBAL` | `연남동 반려동물 동반 브런치 카페 후기 남겨요` | author=`샘플·나비메모` | comments=4 reports=0
- `cmnmorgcg004k1slwiqbz5ok7` | `ACTIVE/WALK_ROUTE/LOCAL` | `분당 탄천 35분 산책 코스, 가로등이 많아 저녁에도 괜찮아요` | author=`샘플·코코랑산책` | comments=4 reports=0
- `cmnmorlsr00521slwuu4n5fxc` | `ACTIVE/MARKET_LISTING/GLOBAL` | `펫드라이룸 상태 좋은 중고로 내놓아요` | author=`샘플·도리장터` | comments=4 reports=0
- `cmnmorr8v005l1slwe0t7uedr` | `ACTIVE/MARKET_LISTING/GLOBAL` | `이동가방 하루 대여 필요하신 분 계실까요` | author=`샘플·도리장터` | comments=4 reports=0
- `cmnmorxks00641slw5hwojslh` | `ACTIVE/MEETUP/LOCAL` | `이번 토요일 서초동 반려인 소규모 모임 열어요` | author=`샘플·마루집사` | comments=4 reports=0
- `cmnmos319006n1slw1hbwvaoh` | `ACTIVE/ADOPTION_LISTING/GLOBAL` | `사람을 잘 따르는 2살 믹스견 코코 가족을 찾고 있어요` | author=`샘플·입양센터` | comments=4 reports=0
- `cmnmos8ur00761slw7uo60c8s` | `ACTIVE/ADOPTION_LISTING/GLOBAL` | `차분한 성격의 치즈 고양이 마루, 1묘 가정에 잘 맞아요` | author=`샘플·입양센터` | comments=4 reports=0
- `cmnmoseb7007q1slw10vg8jfg` | `ACTIVE/ADOPTION_LISTING/GLOBAL` | `활동량 많은 1살 진도 믹스 모카, 산책 좋아하는 보호자 찾습니다` | author=`샘플·입양센터` | comments=4 reports=0
- `cmnmosjy000891slw5qf778cw` | `ACTIVE/SHELTER_VOLUNTEER/GLOBAL` | `주말 산책 봉사자 모집, 2시간만 함께해도 큰 도움이 됩니다` | author=`샘플·입양센터` | comments=4 reports=0
- `cmnmosq3q008t1slw5znajs5r` | `ACTIVE/SHELTER_VOLUNTEER/GLOBAL` | `사진 촬영 봉사 모집, 입양 공고용 프로필 사진이 필요해요` | author=`샘플·입양센터` | comments=4 reports=0

## Public Smoke

- `OPS_BASE_URL=https://townpet.vercel.app pnpm -C app ops:check:health`: passed
- `GET https://townpet.vercel.app/api/home/feed`: `ok=true`, `best=0`, `latest=0`
- Blocked public preview signals: none

## Recommendation

Cleanup is eligible for a separate approval step because the sampled users belong to the owned demo domain, sampled nicknames use `샘플·`, sampled posts have no reports, and the public home preview is already protected.

Recommended next phase:

1. Run a second confirmation audit immediately before cleanup.
2. Execute legacy `production-demo-content` workflow with `mode=cleanup`, `email_domain=demo.townpet.co.kr`, `include_lost_found=false`.
3. Re-run read-only audit and public smoke.
4. Record deleted counts from workflow summary and remaining candidate counts.

Do not use direct SQL cleanup for this set.
