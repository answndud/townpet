# 관리자 큐 smoke fixture cleanup 누락 가능성

- 날짜: `2026-06-06`
- 영향: `ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES=1` 실행에서 local fixture 생성 후 Playwright 브라우저 실행/페이지 생성이 실패하면 임시 관리자/신고/정정 데이터가 local DB에 남을 수 있었다.
- 원인: fixture 생성이 `chromium.launch()`보다 먼저 실행되지만, 기존 `finally`는 page/browser 생성 이후 블록 안에만 있어 launch/newPage 실패 경로를 덮지 못했다.
- 수정: page/browser/local fixture를 nullable resource로 추적하고, 공통 cleanup helper가 각 cleanup을 독립적으로 시도하도록 변경했다.
- 회귀 테스트: page close 실패 상황에서도 browser close와 local fixture cleanup이 호출되는지 검증했다.
