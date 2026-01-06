# 04. 비동기 이벤트 설계(선택 도입)

## 1) 도입 목적
- 알림/인덱싱/이미지 처리 등 “응답시간에 포함시키지 않아도 되는 작업”을 분리
- 운영 작업(신고 자동 판단)을 워커로 분리하여 API 부하를 낮춤

## 2) 이벤트 목록(예시)
- POST_CREATED
- POST_UPDATED
- REPORT_FILED
- POST_AUTO_HIDDEN
- MEETUP_CREATED
- MARKET_INQUIRY_CREATED
- CARE_REQUEST_CREATED
- LOST_ALERT_CREATED
- LOST_SIGHTING_CREATED

## 3) 소비자(Consumers)
- NotificationWorker: 구독자/인근 사용자에게 알림 발송
- SearchIndexer: 검색 인덱스 업데이트(FTS는 제외 가능)
- MediaWorker: 이미지 리사이즈/썸네일 생성
- ModerationWorker: 신고 누적 기반 자동 판단

## 4) 최소 구현 전략
- MVP에서는 “DB outbox 테이블” + 스케줄러 폴링으로 시작 가능
- 트래픽 증가 시 RabbitMQ/Kafka로 전환
