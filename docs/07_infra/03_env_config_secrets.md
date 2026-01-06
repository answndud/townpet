# 03. 환경변수/시크릿 목록(초안)

## 1) Backend
- `SPRING_PROFILES_ACTIVE`
- `DB_URL`, `DB_USER`, `DB_PASSWORD`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- OAuth
  - `OAUTH_KAKAO_CLIENT_ID`, `OAUTH_KAKAO_SECRET`, `OAUTH_KAKAO_REDIRECT`
  - `OAUTH_GOOGLE_CLIENT_ID`, ...
- Storage
  - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- Queue(선택)
  - `MQ_URL` 또는 `KAFKA_BOOTSTRAP`
- Observability(선택)
  - `SENTRY_DSN`
  - `OTEL_EXPORTER_*`

## 2) Web UI(SSR/HTMX)
- 별도 Next.js 프론트가 없으므로 `NEXT_PUBLIC_*` 환경변수는 사용하지 않는다.
- 지도 SDK 키는 서버에서 템플릿(Thymeleaf)로 주입하여 브라우저에서 사용한다.
  - 예: `MAP_PROVIDER=KAKAO|NAVER`, `MAP_PROVIDER_KEY`


## 3) 시크릿 관리
- GitHub Secrets(초기)
- 운영 확장 시: Parameter Store/Secret Manager로 이전
