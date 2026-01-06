# 01. 배포 아키텍처(권장)

## 1) 환경 분리
- dev: 로컬/개발
- stage: 기능 검증/테스트
- prod: 실제 운영

## 2) 컴포넌트
- Web(App): Spring Boot(Docker) — SSR(Thymeleaf) + HTMX Fragment + JSON API를 단일 서비스로 제공
- DB: Managed Postgres
- Cache: Redis
- Storage: S3/R2
- Queue: RabbitMQ/Kafka(선택)
- Observability: 로그/메트릭

## 3) 네트워크
- HTTPS(리버스 프록시/로드밸런서)
- CORS 최소화(단일 서비스/동일 도메인 운영을 기본값으로 하여 CORS 자체를 제거)

## 4) 롤백 전략(최소)
- 컨테이너 이미지 태그 기반 롤백
- DB 마이그레이션은 “forward only” 원칙(Flyway)
