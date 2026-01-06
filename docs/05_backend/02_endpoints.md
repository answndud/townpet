# 02. API 엔드포인트(초안)

## 0) 공통
- 인증 필요 엔드포인트는 `🔒` 표시

---

## 1) Auth
- `POST /api/v1/auth/login/oauth` (OAuth 코드 교환 → JWT 발급)
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout` 🔒

---

## 2) Neighborhood
- `GET /api/v1/neighborhoods/search?q=...`
- `POST /api/v1/users/me/neighborhoods` 🔒 (대표 동네 설정)
- `GET /api/v1/users/me/neighborhoods` 🔒

---

## 3) Posts (공통)
- `GET /api/v1/posts?scope=LOCAL&type=HOSPITAL_REVIEW&neighborhoodId=...&cursor=...`
- `POST /api/v1/posts` 🔒
- `GET /api/v1/posts/{postId}`
- `PATCH /api/v1/posts/{postId}` 🔒
- `DELETE /api/v1/posts/{postId}` 🔒

### 3.1 타입별 작성 payload(예시: 병원 리뷰)
`POST /api/v1/posts` 🔒
```json
{
  "scope": "LOCAL",
  "type": "HOSPITAL_REVIEW",
  "neighborhoodId": "uuid",
  "title": "OO동물병원 중성화 비용",
  "body": "설명은 충분했고 대기시간은 ...",
  "detail": {
    "hospitalName": "OO동물병원",
    "visitDate": "2026-01-01",
    "items": ["NEUTER", "BLOOD_TEST"],
    "totalPrice": 320000,
    "waitMinutes": 40,
    "hasReceipt": true,
    "priceBreakdown": [
      { "name": "중성화", "price": 250000 },
      { "name": "혈액검사", "price": 70000 }
    ]
  },
  "tags": ["친절", "설명충실"]
}
```

---

## 4) Comments/Reactions
- `POST /api/v1/posts/{postId}/comments` 🔒
- `GET /api/v1/posts/{postId}/comments`
- `POST /api/v1/posts/{postId}/reactions` 🔒 (like/save)
- `DELETE /api/v1/posts/{postId}/reactions/{reactionType}` 🔒

---

## 5) Search
- `GET /api/v1/search?scope=LOCAL&q=...&neighborhoodId=...`
- `GET /api/v1/search?scope=GLOBAL&q=...&topic=...`

---

## 6) Meetups(번개)
- `POST /api/v1/meetups` 🔒
- `GET /api/v1/meetups?neighborhoodId=...`
- `POST /api/v1/meetups/{id}/join` 🔒
- `POST /api/v1/meetups/{id}/leave` 🔒
- `PATCH /api/v1/meetups/{id}` 🔒

---

## 7) Market(중고/대여/나눔)
- `POST /api/v1/market/listings` 🔒
- `GET /api/v1/market/listings?neighborhoodId=...&type=RENTAL`
- `PATCH /api/v1/market/listings/{id}/status` 🔒
- `POST /api/v1/market/listings/{id}/inquiry` 🔒 (문의 → 알림)

---

## 8) Care Requests(심부름/돌봄)
- `POST /api/v1/care/requests` 🔒
- `GET /api/v1/care/requests?neighborhoodId=...`
- `POST /api/v1/care/requests/{id}/accept` 🔒
- `POST /api/v1/care/requests/{id}/complete` 🔒

---

## 9) Lost & Found(실종/유기)
- `POST /api/v1/lost-found/alerts` 🔒 (긴급)
- `GET /api/v1/lost-found/alerts?neighborhoodId=...`
- `POST /api/v1/lost-found/alerts/{id}/sightings` 🔒 (제보)
- `POST /api/v1/lost-found/alerts/{id}/close` 🔒

---

## 10) Moderation
- `POST /api/v1/reports` 🔒
- `GET /api/v1/admin/reports` 🔒 (admin)
- `POST /api/v1/admin/actions/hide` 🔒
- `POST /api/v1/admin/actions/ban` 🔒
