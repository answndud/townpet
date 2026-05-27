# Auth/Local Detail Visual Smoke

- generatedAt: `2026-05-27T03:30:15.928Z`
- baseUrl: `https://townpet.vercel.app`
- requestedTypes: `HOSPITAL_REVIEW`, `CARE_REQUEST`
- policyContext: `HOSPITAL_REVIEW` requires login, `CARE_REQUEST` requires matching local neighborhood.

## Summary

| type | target | profile | title | comments | report | expected detail | local gate | no overflow | screenshot |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HOSPITAL_REVIEW | 병원 후기 상세 화면 검증용 안전 정보 | desktop | PASS | PASS | PASS | PASS | PASS | PASS | `docs/reports/auth-local-detail-visual-smoke-2026-05-27T03-30-15-928Z/HOSPITAL_REVIEW-desktop.png` |
| HOSPITAL_REVIEW | 병원 후기 상세 화면 검증용 안전 정보 | mobile | PASS | PASS | PASS | PASS | PASS | PASS | `docs/reports/auth-local-detail-visual-smoke-2026-05-27T03-30-15-928Z/HOSPITAL_REVIEW-mobile.png` |
| CARE_REQUEST | 동네 돌봄 요청 상세 화면 검증용 정보 | desktop | PASS | PASS | PASS | PASS | PASS | PASS | `docs/reports/auth-local-detail-visual-smoke-2026-05-27T03-30-15-928Z/CARE_REQUEST-desktop.png` |
| CARE_REQUEST | 동네 돌봄 요청 상세 화면 검증용 정보 | mobile | PASS | PASS | PASS | PASS | PASS | PASS | `docs/reports/auth-local-detail-visual-smoke-2026-05-27T03-30-15-928Z/CARE_REQUEST-mobile.png` |

## Guest Gate

| type | target | login gate | protected title hidden | no overflow | screenshot |
| --- | --- | ---: | ---: | ---: | --- |
| HOSPITAL_REVIEW | 병원 후기 상세 화면 검증용 안전 정보 | PASS | PASS | PASS | `docs/reports/auth-local-detail-visual-smoke-2026-05-27T03-30-15-928Z/HOSPITAL_REVIEW-guest-gate-mobile.png` |
| CARE_REQUEST | 동네 돌봄 요청 상세 화면 검증용 정보 | PASS | PASS | PASS | `docs/reports/auth-local-detail-visual-smoke-2026-05-27T03-30-15-928Z/CARE_REQUEST-guest-gate-mobile.png` |
