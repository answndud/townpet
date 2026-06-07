# 분실/목격 acquisition production 확인

일시: 2026-06-07

## 결과

- 판정: PASS
- production health: `https://townpet.vercel.app/api/health` 200, `status=ok`
- public landing: `https://townpet.vercel.app/lost-found` 200
- 배포 반영: `/lost-found` HTML에 `LOST_FLOW_VIEWED`, `LOST_FLOW_CTA_CLICKED` tracker payload가 포함됨
- event write smoke: `POST /api/acquisition/events` 200, `{ "recorded": true, "skippedReason": null }`

## 확인 payload

```json
{
  "surface": "LOST_FLOW",
  "event": "LOST_FLOW_VIEWED",
  "targetType": "POST_TYPE",
  "targetId": "LOST_FOUND",
  "source": "production_check"
}
```

## 운영 확인 순서

1. `/admin/ops`의 `분실/목격 획득 전환` 섹션을 확인한다.
2. 0건이면 production `NEXT_PUBLIC_ENABLE_CLIENT_TELEMETRY=1` 설정을 먼저 확인한다.
3. `/lost-found` 조회, CTA 클릭, 상세 공유 도구 진입 순서로 이벤트 source가 쌓이는지 확인한다.
4. source가 비어 있고 랜딩 조회만 있다면 실제 CTA/공유 도구 클릭 표본이 아직 없는 상태로 판단한다.

## 비고

- 이 확인은 acquisition aggregate에 `production_check` source 1건을 남긴다.
- 사용자 개인정보, 인증 정보, 작성/댓글/신고 정책은 변경하지 않았다.
