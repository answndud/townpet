# 01. 기술 스택 결정 근거(왜 이 조합인가)

## 1) Backend: Spring Boot(선택 이유)
- 이력서/면접에서 검증 가능한 실전 스택
- Security(OAuth2/JWT), 데이터 처리(JPA/QueryDSL), 운영 기능(비동기/스케줄링/관측성) 구현에 유리
- 커뮤니티 특성상 “정책/권한/운영 자동화”가 중요하며, Spring 생태계가 적합

권장 구성
- Java 21 (LTS)
- Spring Boot 3.x + Spring Security
  - MVP(SSR): 세션 + CSRF (Thymeleaf/HTMX 최적)
  - 확장(API): OAuth2 + JWT (모바일/외부 API 제공 시)
- PostgreSQL 16+ + JPA + QueryDSL 5.1.0+
- Flyway
- Redis(레이트리밋/캐시)
- 메시지 큐(선택): RabbitMQ 또는 Kafka

## 2) Web UI: Thymeleaf(SSR) + HTMX (+ Tailwind/Alpine)
- **학습/개발 효율**: React/Next 생태계(라우팅/상태/빌드) 부담 없이, 서버 렌더링을 기본으로 빠르게 MVP를 만든다.
- **UX**: HTMX로 댓글/좋아요/필터/무한스크롤 같은 상호작용을 “HTML 부분 교체”로 구현해 SPA에 가까운 체감을 제공한다.
- **SEO/공유**: Global(Q&A/DB/가이드)는 SSR로도 OG/메타/구조화 데이터를 충분히 제공할 수 있다.
- **AI 친화성**: 선언적 마크업 중심(Thymeleaf + hx-*)이라, 코드 생성/수정 루프가 안정적이다.
- **PWA/푸시(선택)**: Next.js가 없어도 Service Worker/manifest로 도입 가능하나, 운영 리스크(권한/스팸/정책)를 고려해 Phase 2~3에서 붙인다.


## 3) DB: PostgreSQL 16+
- 커뮤니티 피드/검색/통계/트랜잭션에 적합
- JSONB 성능 향상, 논리 복제 개선
- FTS로 MVP 검색 구현 가능

## 4) Search
- MVP: Postgres FTS + trigram
- 확장: OpenSearch/Elasticsearch 또는 Meilisearch/Typesense

## 5) Storage
- 이미지/영수증/전단: S3 호환 스토리지 + presigned upload

## 6) Infra/Deploy
- Docker 기반 배포(재현성, CI/CD)
- 관리형 DB/Redis로 운영 부담 최소화

## 7) Observability(면접 임팩트)
- Micrometer + (Prometheus/Grafana 선택)
- 요청 ID/트레이스 ID, JSON 로그
