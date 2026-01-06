# 03_map_integration.md (SSR + HTMX 기준)
- File: docs/06_frontend/03_map_integration.md
- Version: v0.2 (SSR/HTMX)
- Status: Phase 2 권장 (산책로/장소/실종 기능이 커질수록 필수)
- Goal: “지도는 JS 전용 화면으로 격리”하고, SSR/HTMX의 단순함을 유지한다.

---

## 1) 왜 지도는 HTMX로 하지 않는가
- 지도는 상태(마커/클러스터/줌/bbox)가 클라이언트에 강하게 존재한다.
- HTMX는 “서버 HTML 교체”에 강하지만, 지도 UI는 “클라 렌더/상태”가 본질이다.
- 결론: 지도는 별도 JS 페이지로 만들고, 데이터만 JSON으로 받는다.

---

## 2) 페이지/라우트 설계
### 2.1 Pages(SSR Shell)
- `GET /p/local/map`
  - SSR로 기본 레이아웃 + 필터 패널 + 지도 컨테이너(div#map) 렌더
- `GET /p/local/map/walk-routes/draw`
  - 산책로 “그리기” 전용 화면(클라에서 polyline 편집)

### 2.2 JSON APIs(지도 데이터)
- `GET /api/v1/map/walk-routes?bbox=...&neighborhoodId=...&tags=...`
- `GET /api/v1/map/places?bbox=...&neighborhoodId=...&category=...`
- `GET /api/v1/map/lost-found?bbox=...&since=...`
- (선택) `GET /api/v1/map/summary?bbox=...`  
  - 한 번에 묶어서 받고 싶을 때(트래픽 절약)

### 2.3 저장(산책로 등록)
- `POST /api/v1/local/walk-routes`
  - body: title/body + geojson + 태그 + 거리/시간 등

---

## 3) 지도 공급자 선택(현실적 기준)
- 한국 사용자 중심이면: 카카오/네이버가 POI/주소 UX에 강점
- 해외 확장/표준: Google Maps (비용/키 관리 부담)
- MVP 원칙: “개발 난이도 낮고 문서가 안정적인 것”을 선택

---

## 4) 데이터 모델/표준
### 4.1 bbox 파라미터 표준
- bbox = `minLng,minLat,maxLng,maxLat`
- zoom은 optional
- 서버는 bbox 범위를 검증하고 최대 범위를 제한(남용 방지)

### 4.2 응답 표준(권장)
- walk-route:
  - id, title, lat, lng(대표점), tags[], difficulty, distance_m
- place:
  - id, name, category, lat, lng, rating
- lost-found:
  - id, type(LOST/FOUND), occurred_at, lat, lng, summary

> 리스트 상세(본문/이미지)는 지도에서 바로 다 내려주지 말고,
> 클릭 시 `/p/local/.../{id}` 상세로 이동하거나, 필요 시 `/api/v1/posts/{id}`로 추가 조회.

---

## 5) 클라이언트 구현 포인트(핵심)
### 5.1 Script 로딩
- SSR 페이지는 “지도 SDK script”를 필요 시에만 로딩
- CSP(콘텐츠 보안 정책) 고려 가능하면 고려

### 5.2 지도 이벤트 → 데이터 로딩
- map idle(이동/줌 종료) 이벤트에서 bbox 계산
- debounce(예: 300~600ms) 적용
- 동일 bbox/줌 반복 요청은 캐시(메모리) 가능

### 5.3 마커/클러스터
- POI가 많아지면 클러스터링 필수
- 클러스터 클릭 시 줌 인(표준 UX)

### 5.4 필터 패널
- category(places), tag(walk-routes), time window(lost-found)
- 필터 변경 시 bbox 요청 재실행

---

## 6) 산책로 “그리기” UX(Phase 2+)
### 6.1 draw 페이지 구성
- 지도 + “시작/종료” 버튼
- 클릭/드래그로 polyline 생성/편집
- 계산:
  - 거리(대략) / 소요시간(사용자 입력 또는 추정)

### 6.2 서버 저장
- geojson(LineString)로 서버에 전달
- 서버는 JSON schema 검증 + 길이 제한 + 좌표 개수 제한(악용 방지)
- 저장 성공 시:
  - `201 Created` + postId 반환
  - 클라는 `/p/local/walk-routes/{postId}`로 이동

---

## 7) 성능/운영(중요)
### 7.1 서버 보호
- bbox 최대 면적 제한(줌 너무 낮으면 요청 거부/축소)
- rate limit(특히 익명/미인증)
- 캐시(동네 기준 hot bbox는 Redis 캐시 가능)

### 7.2 DB 인덱스 권장
- lost-found: `(occurred_at DESC)` + 지역 필터가 있다면 (neighborhood_id, occurred_at)
- places/walk-routes: neighborhood_id + created_at, 그리고 좌표는 대표점(lat/lng) 인덱스(단순)
- 고도화 시: PostGIS 고려(하지만 MVP에서는 과함)

---

## 8) 보안/프라이버시
- 실종/유기 위치는 매우 민감
- 지도에서 공개되는 정밀도를 조절 가능:
  - 기본: 좌표 반올림(예: 4~5자리) 또는 “근처” 표현
  - 작성자/관리자만 정밀 위치 확인
- 연락처 직접 노출 금지(인앱 메시지/마스킹)

---

## 9) 단계별 적용 권장
### Phase 1
- 지도 없이 리스트/피드 중심으로 완성

### Phase 2
- `/p/local/map` 추가
- places/walk-routes/lost-found 지도 표시(읽기 전용)

### Phase 3
- 산책로 그리기(drawing) + 고도화된 필터
- 푸시(실종/유기)와 연동 고려

---