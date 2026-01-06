# 01. Quickstart (Local MVP Runbook)
> 경로(권장): `docs/00_project/01_quickstart.md`  
> 목표: TownPet를 **Node 없이**(Thymeleaf + HTMX CDN) 로컬에서 가장 빠르게 실행한다.  
> 범위: 로컬 실행, DB 마이그레이션(Flyway), 최소 시드 데이터, 흔한 장애 포인트.

---

## 1) 로컬 실행 목표 상태(Definition of Done)

아래가 되면 “로컬 개발 준비 완료”로 본다.

- [ ] `http://localhost:8080/p/home` 접속 시 홈 페이지가 렌더링된다.
- [ ] `/p/local/places` 진입 시 HTMX로 `/f/places/list`가 호출되고 리스트 영역이 교체된다.
- [ ] Flyway 마이그레이션이 자동 적용된다.
- [ ] 데모 계정(일반/VERIFIED/ADMIN)으로 로그인 또는 강제 세션이 가능하다(구현 방식은 선택).

---

## 2) 전제 스택(로컬)

### 2.1 필수
- JDK **21** 권장 (Spring Boot 3.x 기준)  
  - 최소 17 이상에서도 가능하지만, 프로젝트 기준을 21로 고정하는 편이 면접/이력서에도 깔끔하다.
- Docker Desktop(또는 Colima 등) — PostgreSQL 로컬 컨테이너 실행용
- Git

### 2.2 불필요(의도적으로 제외)
- Node.js / npm  
  - HTMX, Alpine.js, Tailwind는 **CDN 로드**를 기본으로 한다(초기 MVP 단순화).

---

## 3) 저장소 준비

```bash
git clone <YOUR_REPO_URL>
cd townpet

권장 디렉터리(없으면 만들어도 됨)

* `docs/` : 문서
* `infra/local/` : 로컬 docker-compose
* `src/main/resources/` : Thymeleaf 템플릿/정적 리소스

---

## 4) 로컬 DB(PostgreSQL) 기동

### 4.1 docker-compose 파일 준비(권장 위치)

* `infra/local/docker-compose.yml` (없으면 생성)

예시(최소):

```yaml
services:
  postgres:
    image: postgres:16
    container_name: townpet-postgres
    environment:
      POSTGRES_DB: townpet
      POSTGRES_USER: townpet
      POSTGRES_PASSWORD: townpet
    ports:
      - "5432:5432"
    volumes:
      - townpet_pg:/var/lib/postgresql/data

volumes:
  townpet_pg:
```

### 4.2 실행

```bash
docker compose -f infra/local/docker-compose.yml up -d
docker ps
```

### 4.3 DB 접속 확인

```bash
docker exec -it townpet-postgres psql -U townpet -d townpet
```

---

## 5) 애플리케이션 설정(로컬 프로필)

### 5.1 로컬 프로필 권장

* `SPRING_PROFILES_ACTIVE=local`

### 5.2 `application-local.yml` 준비(예시)

* 위치: `src/main/resources/application-local.yml`

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/townpet
    username: townpet
    password: townpet
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
  flyway:
    enabled: true
    baseline-on-migrate: true

logging:
  level:
    org.hibernate.SQL: debug
```

> `ddl-auto`는 `validate` 권장.
> 스키마는 **Flyway가 유일한 진실(source of truth)** 이 되게 한다.

### 5.3 환경변수(.env) 운영 방식

로컬에서는 다음 중 하나로 통일한다.

* 방법 A(간단): IDE Run Configuration에 환경변수 등록
* 방법 B(권장): `.env.local` 파일을 두고 IDE가 로드하도록 설정

필수(최소):

* `SPRING_PROFILES_ACTIVE=local`

OAuth를 붙이면 추가 시크릿이 필요하다. (상세 목록은 `docs/07_infra/03_env_config_secrets.md`)

---

## 6) Flyway 마이그레이션 준비

### 6.1 마이그레이션 파일 위치(권장)

* `src/main/resources/db/migration/`

  * 예: `V1__init_core_tables.sql`

### 6.2 실행 방식

Spring Boot 기동 시 자동으로 Flyway가 적용되는 구성을 기본으로 한다.

---

## 7) 앱 실행

### 7.1 Gradle로 실행

```bash
./gradlew bootRun
```

또는 테스트 포함:

```bash
./gradlew clean test bootRun
```

### 7.2 접속

* Home(Page): `http://localhost:8080/p/home`
* Places(Page): `http://localhost:8080/p/local/places`
* Feed(Page): `http://localhost:8080/p/local/feed`

---

## 8) 시드 데이터(최소 데모 데이터) 전략

### 8.1 권장 원칙

* “데모/개발 편의”는 운영 코드와 분리한다.
* 로컬에서만 동작하는 시드 로더를 둔다.

### 8.2 구현 옵션(택1)

#### 옵션 A: `ApplicationRunner` (로컬 프로필에서만)

* `@Profile("local")` + `ApplicationRunner`로 동네/유저/장소 몇 개 생성

#### 옵션 B: Flyway로 시드 삽입(로컬 전용 migration)

* 예: `V1_1__seed_local.sql`
* 단, 운영 환경에 섞이지 않게 **프로필/빌드 분리**가 필요해 관리 난도가 상승

### 8.3 최소 시드 권장 데이터

* Neighborhood 2개
* User 3개: `USER`, `VERIFIED`, `ADMIN` (role/level 정책에 맞춰)
* Place 5개 + PlaceReview 10개
* MarketListing 5개
* JobPost 3개
* MissingReport 2개

---

## 9) 로컬에서 로그인/권한을 빨리 확인하는 방법(실전 팁)

OAuth를 초기에 붙이면 속도가 느려진다. MVP 개발 초반에는 아래 중 하나를 권장한다.

* 방법 1(권장): **Dev Login 엔드포인트**

  * `local` 프로필에서만 `/dev/login?userId=...` 같은 임시 로그인 제공
  * 운영에서는 빌드/프로필로 완전히 제거
* 방법 2: OAuth를 붙이되, “테스트 앱”으로만 운용

  * 리다이렉트 URL/도메인 이슈 때문에 로컬만 빠르게 하긴 애매할 수 있음

---

## 10) 자주 터지는 문제 TOP 8 (체크리스트)

### 10.1 DB 연결 실패

* Docker postgres가 떠 있는지 `docker ps`
* `application-local.yml`의 url/port 확인(5432 충돌 흔함)

### 10.2 Flyway 적용 안 됨

* `spring.flyway.enabled=true`
* migration 경로가 `db/migration`인지 확인
* 이미 스키마가 생겼다면 `baseline-on-migrate` / clean 전략 점검

### 10.3 템플릿 렌더링은 되는데 HTMX swap이 안 됨

* Fragment 경로(`/f/**`)가 맞는지
* 반환이 `fragments/... :: fragmentName` 형태인지
* `hx-target` id가 실제 DOM에 존재하는지

### 10.4 403/CSRF 문제

* HTMX POST에 CSRF 토큰이 포함되어야 함(설정 방식 고정 필요)
* 초기에는 CSRF를 끄지 말고, 표준 방식(메타 태그 + hx-headers)로 맞추는 편이 낫다

### 10.5 한글 깨짐

* `server.servlet.encoding.charset=UTF-8` (필요 시)
* DB 인코딩/클라이언트 설정 확인

### 10.6 커서 페이징이 중복/누락

* 정렬이 `(created_at DESC, id DESC)`로 고정되어 있는지
* cursor 조건이 `(created_at < c) OR (created_at = c AND id < i)`인지

### 10.7 “숨김/삭제”가 리스트에서 섞여 나옴

* Query 레벨 기본 where: `is_deleted=false AND hidden_at is null` 고정(관리자 제외)

### 10.8 느린 쿼리/리스트 N+1

* DTO projection 기반으로 리스트 조회(QueryDSL)
* 필요한 연관만 fetch join

---

## 11) 다음 문서(연결 지점)

* 아키텍처 계약:

  * `docs/04_architecture/TownPet-Controller-Contract.md`
  * `docs/04_architecture/TownPet-Form-DTO-Contract.md`
  * `docs/04_architecture/TownPet-Service-Contract.md`
  * `docs/04_architecture/TownPet-DDL-Blueprint.md`
* 인프라 운영:

  * `docs/07_infra/01_deployment_architecture.md`
  * `docs/07_infra/02_ci_cd.md`
  * `docs/07_infra/03_env_config_secrets.md`

---

## 12) 최소 실행 커맨드 모음(복붙용)

```bash
# 1) DB up
docker compose -f infra/local/docker-compose.yml up -d

# 2) run
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

