# 05. 데이터 모델(ERD) — posts 다형성 중심

## 1) 설계 원칙
- 게시물은 `posts`(공통) + 타입별 상세 테이블로 저장한다.
- Local/Global은 `scope`로 분리하거나, `type`을 Local/Global로 구분한다.
- 지도/위치는 정밀도를 낮춰(동 단위 + 좌표는 옵션) 개인정보 리스크를 줄인다.

## 2) Mermaid ERD (초안)
```mermaid
erDiagram
  USERS ||--o{ USER_NEIGHBORHOODS : has
  USERS ||--o{ POSTS : writes
  USERS ||--o{ COMMENTS : writes
  USERS ||--o{ REPORTS : files
  USERS ||--o{ BLOCKS : blocks

  NEIGHBORHOODS ||--o{ USER_NEIGHBORHOODS : contains
  NEIGHBORHOODS ||--o{ POSTS : scopes

  POSTS ||--o{ COMMENTS : has
  POSTS ||--o{ REACTIONS : has
  POSTS ||--o{ POST_MEDIA : has
  POSTS ||--o{ REPORTS : is_reported

  POSTS ||--o| HOSPITAL_REVIEWS : details
  POSTS ||--o| PLACE_REVIEWS : details
  POSTS ||--o| WALK_ROUTES : details
  POSTS ||--o| MEETUPS : details
  POSTS ||--o| MARKET_LISTINGS : details
  POSTS ||--o| CARE_REQUESTS : details
  POSTS ||--o| LOST_FOUND_ALERTS : details
  POSTS ||--o| QA_QUESTIONS : details
  POSTS ||--o| QA_ANSWERS : details
  POSTS ||--o| FOOD_PRODUCT_REVIEWS : details
  POSTS ||--o| EXPERT_ARTICLES : details

  MARKET_LISTINGS ||--o{ TRANSACTIONS : creates
  TRANSACTIONS ||--o{ TRANSACTION_REVIEWS : has

  QA_QUESTIONS ||--o{ QA_ANSWERS : has
  QA_QUESTIONS ||--o| QA_ACCEPTED : accepted

  USERS {
    uuid id PK
    string nickname
    string auth_provider
    string role
    datetime created_at
  }

  NEIGHBORHOODS {
    uuid id PK
    string name
    float lat
    float lng
  }

  POSTS {
    uuid id PK
    uuid user_id FK
    uuid neighborhood_id FK
    string type  "HOSPITAL_REVIEW/WALK_ROUTE/..."
    string scope "LOCAL/GLOBAL"
    string title
    text body
    string status "ACTIVE/HIDDEN/DELETED"
    datetime created_at
  }
```
> 실제 스키마는 `05_backend/01_database_schema.md`에서 Flyway DDL로 구체화한다.

## 3) 상태 머신(요약)
- `POST.status`: ACTIVE → HIDDEN(신고/운영) → ACTIVE(복구) / DELETED(작성자)
- `MARKET_LISTINGS.status`: AVAILABLE → RESERVED → DONE / CANCELLED
- `MEETUPS.status`: OPEN → CLOSED → DONE / CANCELLED
- `CARE_REQUESTS.status`: OPEN → MATCHED → DONE / CANCELLED
- `LOST_FOUND_ALERTS.status`: ACTIVE → FOUND / CLOSED
