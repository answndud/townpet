# 02. Local Env & Profiles (Configuration Standard)
> 경로(권장): `docs/00_project/02_local_env_profiles.md`  
> 목적: TownPet의 환경 설정을 “혼자 개발해도 절대 안 꼬이게” 표준화한다.  
> 전제: Spring Boot + Flyway + PostgreSQL, 프론트는 Thymeleaf + HTMX(기본 CDN).

---

## 1) 프로필 전략(Profiles)

### 1.1 고정 프로필
- `local` : 로컬 개발용 (Docker DB, Dev login/seed 가능)
- `prod` : 운영 배포용 (강한 보안/로그/외부 연동)

> 권장: `dev` 같은 중간 프로필은 만들지 않는다. 혼자 개발 시 오히려 꼬인다.

### 1.2 프로필별 “허용되는 기능” 정책
| 기능 | local | prod |
|---|---:|---:|
| Dev Login(`/dev/login`) | 허용 | 금지 |
| Dev Seed Loader | 허용 | 금지 |
| SQL 로그(상세) | 허용 | 제한 |
| H2 같은 인메모리 | 비권장(가능) | 금지 |
| Flyway 자동 migrate | 허용 | 허용(필수) |
| DB reset/clean | 로컬에서만 수동 허용 | 금지 |

---

## 2) 설정 파일 구조(권장)

### 2.1 resources 구성
- `src/main/resources/application.yml` (공통 기본값)
- `src/main/resources/application-local.yml`
- `src/main/resources/application-prod.yml`

### 2.2 `application.yml`에는 “안 변하는 기본값”만 둔다
- 포트/DB/시크릿처럼 환경별로 바뀌는 값은 **절대** 넣지 않는다.
- 공통 권장:
  - Jackson 설정
  - 공통 타임존
  - error response 기본 형식(선택)
  - thymeleaf cache 기본값(프로필에서 override)

---

## 3) 환경변수 로딩 방식(권장)

### 3.1 원칙
- “비밀 값”은 Git에 커밋하지 않는다.
- 개발이 빠르도록 `.env.local`(또는 IDE 환경변수)로 통일한다.
- 운영은 배포 환경의 Secret Manager/CI secret으로 주입한다.

### 3.2 로컬용 파일
- `.env.local` (gitignore)
- `.env.example` (커밋, 문서화 목적)

---

## 4) `.env.example` 템플릿(권장)

> 아래 파일은 커밋 대상이다: `.env.example`

```bash
# === Spring profile ===
SPRING_PROFILES_ACTIVE=local

# === Database ===
DB_URL=jdbc:postgresql://localhost:5432/townpet
DB_USERNAME=townpet
DB_PASSWORD=townpet

# === Session/Cookie (prod에서 중요) ===
SESSION_COOKIE_NAME=TOWNPET_SESSION
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=LAX

# === Security ===
CSRF_ENABLED=true

# === OAuth2 (선택: 붙일 때만) ===
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_KAKAO_CLIENT_ID=
OAUTH_KAKAO_CLIENT_SECRET=

# === Storage (선택: S3/Cloudflare R2 등) ===
STORAGE_PROVIDER=NONE   # NONE|S3|R2
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_PUBLIC_BASE_URL=

# === Observability (선택) ===
LOG_LEVEL_ROOT=INFO
LOG_SQL=false

### 4.1 `.env.local` 예시(로컬 개인 파일)

```bash
SPRING_PROFILES_ACTIVE=local
DB_URL=jdbc:postgresql://localhost:5432/townpet
DB_USERNAME=townpet
DB_PASSWORD=townpet
LOG_SQL=true
```

---

## 5) 프로필별 application 설정 예시

## 5.1 `application-local.yml` (권장)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
  flyway:
    enabled: true
    baseline-on-migrate: true
  thymeleaf:
    cache: false

logging:
  level:
    root: ${LOG_LEVEL_ROOT:INFO}
    org.hibernate.SQL: ${LOG_SQL:false}  # true면 DEBUG로 실제 SQL 출력(구현에 따라 다름)

townpet:
  security:
    csrf-enabled: ${CSRF_ENABLED:true}
  dev:
    dev-login-enabled: true
    seed-enabled: true
```

## 5.2 `application-prod.yml` (권장)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
    baseline-on-migrate: false
  thymeleaf:
    cache: true

logging:
  level:
    root: ${LOG_LEVEL_ROOT:INFO}

townpet:
  security:
    csrf-enabled: true
  dev:
    dev-login-enabled: false
    seed-enabled: false
```

---

## 6) Spring Boot에서 ENV를 “일관되게” 읽는 방식

### 6.1 DB 설정

* 무조건 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`로 통일한다.
* 운영/로컬이 달라도 키 이름은 바꾸지 않는다(꼬임 방지).

### 6.2 커스텀 프로퍼티 prefix

* 커스텀 설정은 `townpet.*` 아래에 둔다.
* 예: `townpet.dev.dev-login-enabled`

---

## 7) Dev 전용 기능 토글(필수)

### 7.1 Dev Login

* 조건:

  * `@Profile("local")`
  * `townpet.dev.dev-login-enabled=true`
* 운영에서 완전히 제거:

  * prod 프로필에서 false
  * CI에서 prod 빌드 시 `local` 프로필 포함 금지

### 7.2 Seed Loader

* 조건:

  * `@Profile("local")`
  * `townpet.dev.seed-enabled=true`

---

## 8) OAuth2를 “나중에 붙일 때”의 기준(중요)

### 8.1 로컬에서 OAuth가 귀찮은 이유

* Redirect URI, 도메인, HTTPS 제약 때문에 설정 시간이 길어진다.

### 8.2 권장 순서

1. 로컬은 Dev Login으로 기능 구현/검증
2. MVP 기능이 안정되면 OAuth2를 추가
3. prod에서만 OAuth 강제(로컬은 옵션)

### 8.3 Redirect URI 원칙

* local: `http://localhost:8080/login/oauth2/code/{provider}`
* prod: `https://<your-domain>/login/oauth2/code/{provider}`

---

## 9) CSRF/HTMX를 위한 로컬 설정 표준

### 9.1 원칙

* CSRF를 끄지 않는다. (면접/실무 관점에서 감점 포인트)
* 메타 태그 + HTMX 요청 헤더로 전달한다.

### 9.2 구현 방향(문서 연결)

* 상세는 `docs/06_frontend/05_htmx_error_handling_playbook.md` 및
  `docs/04_architecture/TownPet-Controller-Contract.md`의 토스트/에러 규약에 맞춘다.

---

## 10) 로그 정책(로컬 vs 운영)

### 10.1 로컬

* 개발 생산성 위해 SQL 로그/바인딩 로그 허용(필요할 때만)
* 권장 토글:

  * `LOG_SQL=true`

### 10.2 운영

* SQL 로그 기본 비활성
* 에러 로그는 stacktrace 과다 노출 금지
* request-id(또는 trace-id) 도입 권장(후속 문서로 분리 가능)

---

## 11) 체크리스트

* [ ] `SPRING_PROFILES_ACTIVE=local`로 실행되는가?
* [ ] `.env.local`은 gitignore 되었는가?
* [ ] `application-prod.yml`에 dev-login/seed가 완전히 꺼져 있는가?
* [ ] DB 키(`DB_URL/DB_USERNAME/DB_PASSWORD`)가 모든 환경에서 동일한가?
* [ ] `ddl-auto=validate`로 Flyway와 충돌 없이 동작하는가?

---

```
::contentReference[oaicite:0]{index=0}
```
