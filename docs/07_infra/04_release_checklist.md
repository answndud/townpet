# 04. Release Checklist (Deploy & Rollback Runbook)
> 경로(권장): `docs/07_infra/04_release_checklist.md`  
> 목적: TownPet을 혼자 운영/배포할 때, 실수를 줄이기 위한 “배포 체크리스트 + 장애 대응 절차”를 고정한다.  
> 전제: Spring Boot + PostgreSQL + Flyway, SSR(Thymeleaf) + HTMX, CI/CD는 GitHub Actions(권장).

---

## 1) 릴리즈 전제(Release Gate)

배포를 시작하기 전에 아래 4가지가 충족되어야 한다.

- [ ] `main`(또는 `release`) 브랜치가 **green** 상태(테스트/빌드 통과)
- [ ] DB 마이그레이션(Flyway) 파일이 준비되어 있고, 기존 파일 수정이 없다
- [ ] 운영 환경 시크릿/환경변수가 최신 상태로 반영되어 있다
- [ ] 최소 헬스 체크(Health endpoint + 주요 페이지)가 배포 후 검증 가능하다

---

## 2) 배포 전 체크리스트(Pre-Deploy)

### 2.1 코드/브랜치
- [ ] `main`에 머지된 커밋이 의도한 버전인지 확인
- [ ] 릴리즈 태그(선택): `v0.1.0` 등으로 태깅
- [ ] 릴리즈 노트(간단): 변경점 5줄 이내로 작성

### 2.2 마이그레이션(Flyway)
- [ ] 새로운 `Vx__*.sql`가 추가되었는가? (기존 파일 수정 금지)
- [ ] 위험 변경(컬럼 타입 변경/대형 인덱스 추가/대량 UPDATE)이 있는가?
  - 있으면 배포 시간대를 조정하거나 분할(백필→NOT NULL) 전략 적용
- [ ] 로컬에서 아래가 통과되는가?
  - `ddl-auto=validate` 상태에서 기동 성공
  - Flyway migrate 로그 정상

### 2.3 환경 변수/시크릿
- [ ] `DB_URL/DB_USERNAME/DB_PASSWORD` 유효
- [ ] OAuth를 켰다면(선택):
  - [ ] Redirect URI가 운영 도메인으로 설정됨
- [ ] 세션/쿠키(운영):
  - [ ] `SESSION_COOKIE_SECURE=true`
  - [ ] `SameSite` 정책 확인(LAX 권장)
- [ ] Dev 기능:
  - [ ] `dev-login-enabled=false`
  - [ ] `seed-enabled=false`

### 2.4 운영 설정(보안/로그)
- [ ] CSRF 활성(권장): `CSRF_ENABLED=true`
- [ ] SQL 로그 비활성: `LOG_SQL=false`
- [ ] 에러 응답에 민감정보 노출 금지(스택트레이스 응답 금지)

### 2.5 “수동 확인” 5분 점검(강력 권장)
- [ ] 로컬 또는 스테이징에서:
  - [ ] `/p/home` 로딩
  - [ ] `/p/local/places` HTMX swap 동작
  - [ ] 마켓 reserve (409/정상 케이스)
  - [ ] 폼 validation error 시 폼 fragment가 그대로 교체되는지

---

## 3) 배포 순서(Deploy Steps)

> 환경마다 절차는 조금 다르지만, 핵심은 “DB → 앱 → 검증” 순서를 고정하는 것이다.

### 3.1 기본 순서(권장)
1) 배포 시작(새 이미지/아티팩트 준비)
2) **Flyway migrate 수행**
3) 앱 인스턴스 롤링 업데이트(또는 재시작)
4) 헬스체크 + 스모크 테스트
5) 배포 완료 기록

### 3.2 Flyway migrate 수행 방식(선택)
- 방식 A(일반): 앱 부팅 시 자동 migrate
  - 장점: 단순
  - 단점: migrate 실패 시 앱이 안 뜸(하지만 그게 정상임)
- 방식 B(권장, 가능하면): migrate Job을 분리
  - 장점: 실패 지점이 명확
  - 단점: 인프라 구성 난이도 증가

---

## 4) 배포 직후 스모크 테스트(Post-Deploy)

배포 직후 아래는 최소로 확인한다.

### 4.1 Health
- [ ] `/actuator/health` (또는 커스텀 `/health`)가 `UP`

### 4.2 핵심 페이지 6개(SSR/HTMX 혼합 검증)
- [ ] `GET /p/home`
- [ ] `GET /p/local/places`
- [ ] `GET /p/local/walks`
- [ ] `GET /p/local/market`
- [ ] `GET /p/local/jobs`
- [ ] `GET /p/local/missing`

### 4.3 HTMX 액션 3개(실제 swap)
- [ ] Places 리스트 “더보기”(커서)
- [ ] Market reserve 버튼(정상/경쟁 상황)
- [ ] Job apply 폼(검증 실패 케이스 포함)

---

## 5) 모니터링/로그 확인(최소)

### 5.1 즉시 확인(배포 후 10분)
- [ ] 5xx 증가 여부
- [ ] DB connection pool 고갈 여부
- [ ] Flyway migrate 로그에서 lock/timeout 여부
- [ ] 응답 지연(p95) 급증 여부

### 5.2 반드시 남겨야 하는 로그(권장)
- requestId 포함 구조화 로그
- ErrorCode 발생 로그(특히 401/403/409/429)

---

## 6) 롤백/장애 대응(Incident Runbook)

### 6.1 기본 원칙
- **DB는 기본적으로 롤백하지 않는다(forward fix)**  
- 롤백은 “애플리케이션 코드(이미지)”만 이전 버전으로 되돌리는 것을 의미한다.

### 6.2 장애 유형별 대응

#### A) 앱이 부팅되지 않음 (Flyway 실패)
증상:
- startup 로그에 Flyway error
- DB 락/제약/문법 오류

대응:
1) 실패한 migration 원인 파악(로그에서 정확히)
2) 운영에서 `repair`는 금지(원칙)
3) 해결책 선택
   - (권장) **새로운 핫픽스 migration(Vx+1)** 로 수정
   - (임시) 문제 migration을 적용하지 않은 새 DB로 “갈아끼우기”는 개인 프로젝트에서만 가능하지만 일반적으로 비권장

#### B) 특정 기능만 500(서비스 예외)
대응:
1) 해당 endpoint + requestId로 에러코드/스택 추적
2) 즉시 핫픽스 배포 or 기능 토글(가능하면)
3) 사용자 영향이 크면 이전 이미지로 롤백(코드 롤백)

#### C) 성능 급락(p95 급증)
대응:
1) 최근 변경 중 “리스트 쿼리/인덱스/조인”이 있는지 확인
2) 커서 인덱스 누락 여부 확인
3) 임시 완화:
   - 페이지 크기 축소
   - 고비용 정렬/필터 비활성
4) 근본 해결:
   - 인덱스 추가 migration
   - N+1 제거(QueryDSL projection)

#### D) 데이터 정합성 문제(중복/상태 전이 꼬임)
대응:
1) Unique 제약/상태 전이 조건부 업데이트 여부 점검
2) audit_logs로 영향 범위 확인
3) 정정 migration(필요 시) + 코드 수정

---

## 7) 배포 전후 “필수 기록”(운영 히스토리)

개인 프로젝트라도 아래를 남겨두면 나중에 복구가 쉬워진다.

- 릴리즈 태그/커밋 SHA
- 적용된 Flyway 버전(최신 `schema_history` 확인)
- 배포 시간/원인/변경사항 요약
- 장애가 있었다면 incident 요약(원인/조치/재발 방지)

---

## 8) 운영 환경 필수 토글(최종 점검)

- [ ] `SPRING_PROFILES_ACTIVE=prod`
- [ ] `townpet.dev.dev-login-enabled=false`
- [ ] `townpet.dev.seed-enabled=false`
- [ ] `CSRF_ENABLED=true`
- [ ] `SESSION_COOKIE_SECURE=true`
- [ ] `LOG_SQL=false`

---

## 9) “혼자 운영” 기준 최소 배포 시나리오(추천)

### 9.1 빈도
- 주 1~2회, 저녁 시간대(사용자 영향 적을 때)

### 9.2 배포 단위
- 한 번에 큰 기능을 넣지 말고,
- UI/도메인/DB 변경이 섞인 릴리즈는 피한다(혼자면 특히 위험)

---

## 10) 체크리스트(복붙용)

### Pre-Deploy
- [ ] main green
- [ ] migration 신규 추가(수정 없음)
- [ ] prod env/secrets 검증
- [ ] dev-login/seed OFF
- [ ] local smoke 완료

### Deploy
- [ ] migrate 성공
- [ ] 앱 롤링 업데이트
- [ ] health UP
- [ ] 핵심 페이지 6개 확인
- [ ] HTMX 액션 3개 확인

### Post-Deploy
- [ ] 5xx 증가 없음
- [ ] p95 급등 없음
- [ ] DB pool 안정
- [ ] release 기록 남김

---
