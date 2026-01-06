# 03. API 컨벤션


## 0) 라우팅 컨벤션(참고: SSR/HTMX)
- Page(SSR): `/p/**`
- Fragment(HTMX): `/f/**`
- JSON API: `/api/v1/**`

## 1) 버전/네이밍
- Base: `/api/v1`
- 리소스 중심: `/posts`, `/markets`, `/care-requests`

## 2) 인증
- Access Token: `Authorization: Bearer <JWT>`
- Refresh Token: HttpOnly Cookie(권장) 또는 별도 엔드포인트

## 3) 에러 포맷(예시)
```json
{
  "timestamp": "2026-01-06T12:00:00+09:00",
  "traceId": "abc123...",
  "code": "POST_NOT_FOUND",
  "message": "게시물을 찾을 수 없습니다.",
  "details": {
    "postId": "uuid"
  }
}
```

## 4) 페이지네이션(커서)
- 요청: `?cursor=<opaque>&limit=20`
- 응답:
```json
{
  "items": [ ... ],
  "nextCursor": "opaque-or-null"
}
```

## 5) id 규칙
- 기본: UUID
- 공개용 shortId(선택): 공유 링크/전단 등에 사용(추후)

## 6) 상태/정렬 규칙
- `status`: ACTIVE/HIDDEN/DELETED(soft delete)
- 정렬: 최신(createdAt desc), 인기(저장/댓글/조회 가중)

## 7) Rate Limit
- 로그인/글쓰기/댓글/신고/검색에 개별 rate limit 적용
- 응답 헤더(선택): `X-RateLimit-Remaining` 등