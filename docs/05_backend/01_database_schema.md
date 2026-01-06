# 01. 데이터베이스 스키마(초안) — Flyway 기준

> 본 문서는 “핵심 테이블/인덱스/제약” 수준을 정의한다. 실제 DDL은 `db/migration`으로 관리한다.

## 1) 공통
- 모든 테이블: `created_at`, `updated_at`
- soft delete가 필요한 리소스: `status` + `deleted_at`(선택)

## 2) 핵심 테이블 목록(요약)
- users, user_auth, user_profiles, pet_profiles
- neighborhoods, user_neighborhoods
- posts, post_media, post_tags, reactions, comments, views
- reports, blocks, admin_actions
- places(병원/동반장소), hospital_reviews, place_reviews
- walk_routes
- meetups, meetup_participants
- market_listings, transactions, transaction_reviews
- care_requests, care_assignments, care_reviews
- lost_found_alerts, lost_found_sightings
- qa_questions, qa_answers, qa_accepts
- food_products, food_reviews, expert_articles
- notifications, subscriptions(키워드/태그/긴급)

## 3) 인덱스 전략(필수)
### Posts 피드
- (neighborhood_id, type, created_at desc)
- (scope, created_at desc)
- (status, created_at desc)

### 검색(FTS)
- title/body에 대한 tsvector + GIN 인덱스
- 유사 검색을 위한 trigram 인덱스(제목/병원명/제품명)

### 신고/운영
- reports (target_type, target_id, created_at)
- admin_actions (created_at)

### 마켓/모임
- market_listings (neighborhood_id, status, created_at desc)
- meetups (neighborhood_id, status, start_at)

## 4) 정합성(제약/체크)
- 비용/대여료/보증금은 음수 불가
- 긴급 알림(lost_found) 생성은 조건(권한) 만족 시만 허용(애플리케이션 레벨)
