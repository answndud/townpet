# 04. Migration Policy (Flyway)
> 경로(권장): `docs/04_architecture/04_migration_policy.md`  
> 대상: TownPet (Spring Boot + PostgreSQL + Flyway)  
> 목적: 혼자 개발하면서도 DB 스키마가 **절대 꼬이지 않게** 마이그레이션 운영 규칙을 고정한다.

---

## 1) 기본 원칙 (절대 규칙)

### 1.1 “스키마의 진실”은 Flyway 뿐이다
- `spring.jpa.hibernate.ddl-auto=validate`를 기본으로 한다.
- 엔티티 변경이 있어도 DB는 **항상 Flyway로만** 변경한다.
- 운영 환경에서는 Flyway가 적용되지 않으면 배포 실패로 본다.

### 1.2 Forward-only (롤백 금지)
- 롤백 SQL을 별도로 유지하지 않는다.
- 문제가 생기면:
  1) 새 마이그레이션으로 “되돌리는 변경”을 추가하거나
  2) 핫픽스 마이그레이션으로 수정한다.

### 1.3 이미 실행된 마이그레이션 파일은 수정하지 않는다
- 한번 적용된 `Vx__...sql` 파일은 **절대 수정/덮어쓰기 금지**
- 수정이 필요하면 새로운 버전 파일을 추가한다.

---

## 2) 파일 구조 및 네이밍 규칙

### 2.1 위치
- `src/main/resources/db/migration/`

### 2.2 네이밍
- Flyway 버전 마이그레이션:
  - `V1__init_core_tables.sql`
  - `V2__add_moderation_tables.sql`
  - `V3__add_notifications.sql`

권장 규칙:
- 버전은 정수 증가(1, 2, 3…)
- 제목은 **동사+대상** 형태로 간결하게
- 파일명에는 날짜를 넣지 않는다(버전이 날짜 역할)

### 2.3 “로컬 전용” 마이그레이션 정책
혼자 개발에서는 로컬 시드가 필요할 수 있다. 다만 운영에 섞이면 위험하다.

권장 선택지(우선순위):
1) **로컬 시드는 코드(Seed Loader)로 처리** (추천)
2) 로컬 전용 SQL을 쓰려면:
   - `db/migration/local/` 같은 별도 경로를 두고
   - local 프로필에서만 Flyway 위치를 추가한다

예시(local에서만 추가 경로):
```yaml
spring:
  flyway:
    locations: classpath:db/migration,classpath:db/migration/local
```

---

## 3) 마이그레이션 작성 규약

### 3.1 한 파일 = 한 목적

* “테이블 생성 + 인덱스 + 제약”은 같은 파일에 묶어도 된다.
* 서로 다른 도메인의 변경을 한 파일에 섞지 않는다.

### 3.2 반드시 포함해야 하는 것

* 테이블 생성 시:

  * PK
  * NOT NULL
  * CHECK(ENUM 대체)
  * unique index(중복 방지)
  * cursor 인덱스(리스트/피드 성능)

### 3.3 변경 유형별 작성 패턴

#### A) 컬럼 추가

* 기본:

  * nullable로 추가 → 백필 → NOT NULL 전환(필요 시)
* 예시:

  1. `ALTER TABLE ... ADD COLUMN ... NULL;`
  2. `UPDATE ... SET ... WHERE ...;` (가능하면 배치/조건부)
  3. `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL;`

#### B) 인덱스 추가

* 운영 고려:

  * PostgreSQL에서는 대형 테이블에 `CREATE INDEX CONCURRENTLY` 고려
  * 단, Flyway 트랜잭션과 충돌할 수 있어 별도 전략이 필요함
* MVP 단계에서는 일반 `CREATE INDEX`로 시작해도 무방하되,
  운영 단계에서는 “온라인 인덱스” 정책을 별도 문서로 확장한다.

#### C) 컬럼 타입 변경

* 위험도 높음
* 가능한 회피:

  * 새 컬럼 추가 → 데이터 복사 → 기존 컬럼 폐기(후속)
* 타입 변경이 불가피하면:

  * 영향 범위(테이블 크기/락)를 먼저 고려

#### D) 테이블/컬럼 rename

* 가능하지만 혼자 개발에서는 “rename 남발”이 가장 위험하다.
* 추천:

  * rename은 최소화
  * 필요 시 뷰/호환 레이어를 잠깐 둔다(운영 고려)

---

## 4) baseline / clean / repair 정책

### 4.1 baseline-on-migrate

* 로컬: `true` 가능(이미 DB가 만들어져 있어도 시작 가능)
* 운영: `false` 권장

  * 운영 DB는 항상 “정상 경로”로 생성되어야 한다.

### 4.2 clean (절대 운영 금지)

* 운영: Flyway clean 사용 금지
* 로컬: 필요할 때만 수동으로 수행

로컬 reset 전략(권장):

* “데이터만 날리기”가 아니라 “DB 볼륨 자체 재생성”

  * `docker compose down -v` 로 볼륨 제거

### 4.3 repair

* checksum mismatch(실수로 파일을 수정한 경우) 해결 도구
* 원칙:

  * 운영에서는 repair 남발 금지
  * checksum mismatch가 나오면 “이전에 적용된 파일이 수정된 것”

    * 정상 해결: 파일 수정 금지 + 새 마이그레이션으로 수정
    * 로컬에서는 상황에 따라 DB reset이 더 빠르다

---

## 5) 마이그레이션 실행/검증 절차

### 5.1 로컬 개발자 루틴(권장)

* 새 기능 개발 전:

  * 엔티티/서비스 설계 → DDL 수정 필요하면 migration 작성
* 적용 확인:

  * `./gradlew bootRun`로 기동 시 Flyway 로그 확인
* 스키마 검증:

  * `ddl-auto=validate`로 엔티티와 스키마 불일치 즉시 탐지

### 5.2 PR(또는 커밋) 체크리스트

* [ ] `Vx__...sql` 파일이 새로운 버전으로 추가되었는가? (기존 수정 금지)
* [ ] 인덱스/유니크 제약이 함께 포함되어 있는가?
* [ ] 커서 인덱스가 누락되지 않았는가?
* [ ] 로컬 reset 없이도 migrate가 정상 적용되는가?

---

## 6) TownPet 권장 마이그레이션 분할(예시)

* `V1__init_core_tables.sql`

  * users, neighborhoods, user_neighborhoods, oauth_accounts, pet_profiles
* `V2__init_local_core.sql`

  * places, place_reviews, walk_routes
* `V3__init_social_core.sql`

  * posts, comments
* `V4__init_market_jobs_missing.sql`

  * market_listings, job_posts, job_applications, care_requests, missing_reports
* `V5__init_moderation_audit.sql`

  * reports, audit_logs
* `V6__init_notifications.sql`

  * notifications

---

## 7) 운영(Prod) 관점 최소 규칙

* 운영 배포 시:

  1. Flyway migrate 성공
  2. 애플리케이션 기동
  3. health check OK
* 마이그레이션에서 실패하면:

  * 즉시 배포 중단(rollback은 “코드 배포”만, DB는 forward fix)

---

## 8) 흔한 실패 시나리오와 처방

### 8.1 “파일 수정”으로 checksum mismatch

* 처방:

  * 로컬이면 DB reset 또는 flyway repair
  * 운영이면:

    * 수정된 파일을 원상복구
    * 새 버전 마이그레이션으로 변경사항을 반영

### 8.2 “엔티티는 바뀌었는데 DB가 안 바뀜”

* 처방:

  * ddl-auto가 update로 되어 있지 않은지 확인(반드시 validate)
  * migration 파일이 경로/네이밍 규칙을 지키는지 확인
  * flyway enabled 여부 확인

### 8.3 인덱스 누락으로 리스트 페이지 느림

* 처방:

  * 해당 리스트의 정렬 키 `(created_at desc, id desc)` 인덱스 추가
  * tags 검색이 있으면 GIN 인덱스 고려

---

```
::contentReference[oaicite:0]{index=0}
```
