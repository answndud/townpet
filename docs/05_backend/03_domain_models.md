# 03. 도메인 모델/상태 머신(요약)

## 1) Posts
- 공통 상태: ACTIVE / HIDDEN / DELETED
- 숨김 트리거
  - 신고 누적 룰 충족
  - 관리자 조치
- 복구 조건: 관리자 승인 또는 템플릿 보완 후 재검토

## 2) Meetups(번개)
- 상태: OPEN → CLOSED → DONE
- 예외: CANCELLED
- 주요 규칙
  - 인원 제한, 시작 시간 이후 참여 제한
  - 노쇼/반복 취소에 대한 평판 페널티(정책 기반)

## 3) Market Listing
- 유형: USED / RENTAL / FREE
- 상태: AVAILABLE → RESERVED → DONE / CANCELLED
- 대여 추가 필드
  - deposit, rentFee, min/max 기간
  - 인수/반납 체크(사진, 체크리스트)

## 4) Care Request(심부름/긴급 돌봄)
- 상태: OPEN → MATCHED → DONE / CANCELLED
- 매칭 규칙(초기 단순화)
  - 선착순 수락 또는 요청자가 선택
- 신뢰도 반영
  - 완료율/후기/신고

## 5) Lost & Found Alert
- 상태: ACTIVE → FOUND / CLOSED
- 이벤트
  - 생성 시: GeoPushDispatched
  - 제보: SIGHTING_RECORDED
  - 종료: ALERT_CLOSED

## 6) Global Q&A
- 질문: OPEN/CLOSED
- 답변: ACTIVE/DELETED
- 채택: 질문당 1개(accepted_answer_id)
