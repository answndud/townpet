# 02. 시스템 아키텍처(모듈러 모놀리스 + 이벤트)

## 1) 구성 요약
- Web(Thymeleaf SSR + HTMX) → (API Gateway 선택) → Spring Boot(HTML + API)
- DB(Postgres), Cache/RateLimit(Redis), Storage(S3), Queue(Rabbit/Kafka), Search(FTS/추후)
## 1.1 라우팅 계층(SSR/HTMX 표준)
- `/p/**`: Full Page(레이아웃 포함)
- `/f/**`: HTML Fragment(HTMX swap 전용)
- `/api/**`: JSON(지도/업로드/푸시 등 특수 기능)


## 2) 모듈 경계(추천)
- auth
- users & profiles
- neighborhoods & geo
- posts & comments
- places(병원/동반장소)
- walk_routes
- meetups
- market(listing/transaction)
- care_requests
- lost_found
- global_knowledge(QA/foodDB/expert)
- moderation
- notifications
- admin

## 3) 이벤트 기반 처리(예시)
- POST_CREATED → (a) SearchIndexUpdated (b) KeywordSubscribersNotified
- REPORT_FILED → (a) AutoHideEvaluator (b) AdminQueueEnqueued
- LOST_ALERT_CREATED → (a) GeoPushDispatched (b) AdminFastReviewQueued

## 4) Mermaid 개념도(요약)
```mermaid
flowchart LR
  FE[Thymeleaf SSR + HTMX] -->|HTTPS| API[Spring Boot (MVC+API)]
  API --> PG[(PostgreSQL)]
  API --> R[(Redis)]
  API --> S3[(S3/R2 Storage)]
  API --> Q[(Queue)]
  Q --> NTF[Notification Worker]
  Q --> IDX[Search Indexer]
  API --> SRCH[(Search: FTS/Meili)]
  API --> OBS[(Logs/Metrics/Tracing)]
```
