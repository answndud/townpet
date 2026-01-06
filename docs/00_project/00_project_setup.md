# 00. TownPet 프로젝트 초기 설정 (Spring Initializr부터)

> **경로(권장)**: `docs/00_project/00_project_setup.md`  
> **목표**: Spring Initializr에서 프로젝트를 생성하고, 로컬 개발 환경을 완벽하게 구축하는 단계별 가이드  
> **대상**: Spring Boot를 처음 시작하는 개발자도 따라할 수 있도록 작성

---

## 📋 목차
1. [Spring Initializr 설정](#1-spring-initializr-설정)
2. [프로젝트 다운로드 및 IDE 열기](#2-프로젝트-다운로드-및-ide-열기)
3. [디렉토리 구조 정리](#3-디렉토리-구조-정리)
4. [설정 파일 작성](#4-설정-파일-작성)
5. [Docker 환경 구성](#5-docker-환경-구성)
6. [첫 실행 및 검증](#6-첫-실행-및-검증)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. Spring Initializr 설정

https://start.spring.io/ 로 이동하여 다음 설정을 입력합니다.

### 1.1 Project Metadata

| 항목 | 값 | 설명 |
|------|-----|------|
| **Project** | Gradle - Groovy | Gradle 빌드 시스템 사용 |
| **Language** | Java | |
| **Spring Boot** | 3.3.x (최신 3.x 안정 버전) | 3.4.x는 아직 안정화 검증 필요, 3.3.x 권장 |
| **Group** | `com.townpet` | 패키지 네임스페이스 |
| **Artifact** | `townpet` | 프로젝트명 (소문자) |
| **Name** | `TownPet` | 애플리케이션명 |
| **Description** | `Local pet community platform` | |
| **Package name** | `com.townpet` | 자동 생성됨 |
| **Packaging** | **Jar** | Docker 배포 시 Jar 권장 |
| **Java** | **21** | LTS 버전 |    

### 1.2 Dependencies (의존성 추가)

**GENERATE 버튼을 누르기 전에** 우측 `ADD DEPENDENCIES` 버튼을 클릭하여 다음 dependencies를 검색해서 추가합니다.

#### ✅ 필수 의존성

| 카테고리 | Dependency 이름 | 용도 |
|---------|----------------|------|
| **Web** | Spring Web | REST API, MVC 컨트롤러 |
| **Template Engines** | Thymeleaf | SSR 템플릿 엔진 |
| **SQL** | Spring Data JPA | ORM, 엔티티 관리 |
| **SQL** | PostgreSQL Driver | PostgreSQL JDBC 드라이버 |
| **SQL** | Flyway Migration | DB 마이그레이션 도구 |
| **Security** | Spring Security | 인증/인가 |
| **Security** | OAuth2 Client | 소셜 로그인 (카카오/구글) |
| **Developer Tools** | Spring Boot DevTools | 자동 재시작 (개발 편의) |
| **Developer Tools** | Lombok | 보일러플레이트 코드 제거 |
| **I/O** | Validation | Bean Validation (@Valid) |
| **NoSQL** | Spring Data Redis (Access+Jedis) | Rate Limit, 캐시 |

#### ⚠️ 주의사항
- **QueryDSL**은 Spring Initializr에서 제공하지 않으므로, 프로젝트 생성 후 수동으로 추가해야 합니다.
- **HTMX, Alpine.js, Tailwind**는 CDN으로 로드하므로 백엔드 의존성 불필요

### 1.3 Generate 버튼 클릭

모든 설정이 완료되면 `GENERATE` 버튼을 클릭합니다.  
→ `townpet.zip` 파일이 다운로드됩니다.

---

## 2. 프로젝트 다운로드 및 IDE 열기

### 2.1 압축 해제

```bash
# 원하는 작업 디렉토리로 이동
cd ~/Project

# 다운로드한 zip 파일 압축 해제
unzip ~/Downloads/townpet.zip

# 프로젝트 디렉토리로 이동
cd townpet
```

### 2.2 IDE에서 열기

**IntelliJ IDEA 권장**
```bash
# IntelliJ IDEA로 열기 (macOS)
idea .

# 또는 IntelliJ에서 File > Open > townpet 디렉토리 선택
```

**VS Code 사용 시**
```bash
code .
```

### 2.3 Gradle 동기화

IntelliJ가 자동으로 Gradle을 동기화합니다.
- 우측 하단에 "Indexing..." 완료될 때까지 기다립니다.
- `build.gradle` 파일이 변경되면 우측 상단의 "Load Gradle Changes" 클릭

---

## 3. 디렉토리 구조 정리

### 3.1 현재 생성된 기본 구조

```
townpet/
├── gradle/
├── src/
│   ├── main/
│   │   ├── java/com/townpet/
│   │   │   └── TownPetApplication.java
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── static/
│   │       └── templates/
│   └── test/
├── .gitignore
├── build.gradle
├── gradlew
├── gradlew.bat
└── settings.gradle
```

### 3.2 추가할 디렉토리 및 파일

프로젝트 루트에서 다음 구조를 만듭니다:

```bash
# 인프라 관련 디렉토리
mkdir -p infra/local

# Flyway 마이그레이션 디렉토리
mkdir -p src/main/resources/db/migration

# 프론트엔드 리소스 디렉토리
mkdir -p src/main/resources/static/{css,js,images}
mkdir -p src/main/resources/templates/{layout,pages,fragments,errors}

# 프로필별 설정 파일 준비 (다음 단계에서 작성)
touch src/main/resources/application.yml
touch src/main/resources/application-local.yml
touch src/main/resources/application-dev.yml
touch src/main/resources/application-prod.yml
```

### 3.3 application.properties 삭제

Spring Initializr가 생성한 `application.properties`는 삭제하고 YAML 형식을 사용합니다:

```bash
rm src/main/resources/application.properties
```

---

## 4. 설정 파일 작성

### 4.1 build.gradle 수정 (QueryDSL 추가)

`build.gradle` 파일을 열고 다음 내용을 추가/수정합니다:

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.6' // 버전은 생성 시점에 맞게 조정
    id 'io.spring.dependency-management' version '1.1.6'
}

group = 'com.townpet'
version = '0.0.1-SNAPSHOT'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Starters (Initializr가 추가한 것들)
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'
    implementation 'org.thymeleaf.extras:thymeleaf-extras-springsecurity6'
    
    // QueryDSL 추가 (Jakarta EE 호환)
    implementation 'com.querydsl:querydsl-jpa:5.1.0:jakarta'
    annotationProcessor 'com.querydsl:querydsl-apt:5.1.0:jakarta'
    annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
    annotationProcessor 'jakarta.persistence:jakarta.persistence-api'
    
    // PostgreSQL
    runtimeOnly 'org.postgresql:postgresql'
    
    // Lombok
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    
    // DevTools
    developmentOnly 'org.springframework.boot:spring-boot-devtools'
    
    // Test
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

### 4.2 application.yml (공통 설정)

`src/main/resources/application.yml` 파일:

```yaml
spring:
  application:
    name: TownPet
  
  profiles:
    active: local
  
  jpa:
    open-in-view: false
    properties:
      hibernate:
        query:
          in_clause_parameter_padding: true
  
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 20MB

server:
  error:
    include-message: always
    include-binding-errors: always

logging:
  level:
    com.townpet: DEBUG
```

### 4.3 application-local.yml (로컬 개발용)

`src/main/resources/application-local.yml` 파일:

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/townpet
    username: townpet
    password: townpet
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate  # Flyway가 스키마 관리
    properties:
      hibernate:
        format_sql: true
        show_sql: false
    show-sql: false
  
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
  
  data:
    redis:
      host: localhost
      port: 6379
  
  security:
    oauth2:
      client:
        registration:
          # 카카오/구글 설정은 나중에 추가
          kakao:
            client-id: ${OAUTH_KAKAO_CLIENT_ID:NOT_SET}
            client-secret: ${OAUTH_KAKAO_SECRET:NOT_SET}
            redirect-uri: "{baseUrl}/login/oauth2/code/kakao"
            authorization-grant-type: authorization_code
            client-name: Kakao
            scope: profile_nickname, account_email
        provider:
          kakao:
            authorization-uri: https://kauth.kakao.com/oauth/authorize
            token-uri: https://kauth.kakao.com/oauth/token
            user-info-uri: https://kapi.kakao.com/v2/user/me
            user-name-attribute: id

logging:
  level:
    org.hibernate.SQL: debug
    org.hibernate.orm.jdbc.bind: trace
    org.springframework.security: debug
```

### 4.4 .gitignore 확장

기존 `.gitignore`에 다음 내용을 추가합니다:

```gitignore
# 기존 내용 유지하고 아래 추가

### Custom ###
# 로컬 환경 변수
.env
.env.local

# IDE
.vscode/
.idea/
*.iml

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
```

---

## 5. Docker 환경 구성

### 5.1 docker-compose.yml 작성

`infra/local/docker-compose.yml` 파일:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: townpet-postgres
    environment:
      POSTGRES_DB: townpet
      POSTGRES_USER: townpet
      POSTGRES_PASSWORD: townpet
      TZ: Asia/Seoul
    ports:
      - "5432:5432"
    volumes:
      - townpet_pg_data:/var/lib/postgresql/data
    networks:
      - townpet-network
  
  redis:
    image: redis:7-alpine
    container_name: townpet-redis
    ports:
      - "6379:6379"
    networks:
      - townpet-network
    command: redis-server --appendonly yes
    volumes:
      - townpet_redis_data:/data

networks:
  townpet-network:
    driver: bridge

volumes:
  townpet_pg_data:
  townpet_redis_data:
```

### 5.2 Docker 컨테이너 실행

```bash
# 프로젝트 루트에서 실행
docker compose -f infra/local/docker-compose.yml up -d

# 상태 확인
docker ps

# 로그 확인 (필요 시)
docker compose -f infra/local/docker-compose.yml logs -f
```

### 5.3 DB 접속 확인

```bash
# PostgreSQL 컨테이너 접속
docker exec -it townpet-postgres psql -U townpet -d townpet

# psql 프롬프트에서
\dt  # 테이블 목록 (아직 없음)
\q   # 종료
```

---

## 6. 첫 실행 및 검증

### 6.1 최소 Flyway 마이그레이션 작성

`src/main/resources/db/migration/V1__init_core_tables.sql` 파일:

```sql
-- V1: 초기 테이블 생성 (최소)

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- 타임스탬프 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 6.2 Spring Boot 애플리케이션 실행

```bash
# Gradle을 통한 실행
./gradlew bootRun

# 또는 IDE에서 TownPetApplication.java 우클릭 > Run
```

### 6.3 실행 성공 확인

터미널에서 다음과 같은 로그가 보이면 성공입니다:

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.3.6)

...
Started TownPetApplication in 3.456 seconds
```

브라우저에서 `http://localhost:8080` 접속:
- Spring Security 기본 로그인 페이지가 보이면 **정상**입니다.
- (아직 사용자가 없으므로 로그인은 불가)

### 6.4 Flyway 마이그레이션 확인

```bash
# PostgreSQL 접속
docker exec -it townpet-postgres psql -U townpet -d townpet

# 테이블 생성 확인
\dt

# 예상 출력:
#            List of relations
#  Schema |         Name         | Type  | Owner
# --------+----------------------+-------+---------
#  public | flyway_schema_history| table | townpet
#  public | users                | table | townpet

# Flyway 이력 확인
SELECT version, description, installed_on FROM flyway_schema_history;

# 종료
\q
```

---

## 7. 트러블슈팅

### 7.1 "Port 5432 is already in use"

**원인:** 로컬에 PostgreSQL이 이미 실행 중이거나, 다른 컨테이너가 포트 사용 중

**해결:**
```bash
# 실행 중인 PostgreSQL 확인
lsof -i :5432

# Docker 포트를 다른 번호로 변경
# docker-compose.yml에서 "5433:5432"로 수정
# application-local.yml에서도 포트 5433으로 변경
```

### 7.2 "Flyway baseline failed"

**원인:** DB에 이미 테이블이 있는데 Flyway 이력 테이블이 없음

**해결:**
```bash
# DB 초기화 (개발 환경에서만!)
docker compose -f infra/local/docker-compose.yml down -v
docker compose -f infra/local/docker-compose.yml up -d
```

### 7.3 "Cannot resolve symbol 'Q...'"

**원인:** QueryDSL Q클래스가 아직 생성되지 않음

**해결:**
```bash
# Gradle 빌드로 Q클래스 생성
./gradlew clean build

# IntelliJ에서 "Rebuild Project"
```

### 7.4 "Spring Security blocks all requests"

**원인:** 정상 동작. Spring Security 기본 설정은 모든 요청을 차단

**해결:** Phase 1에서 SecurityConfig 작성 예정 (다음 단계)

---

## ✅ 다음 단계

프로젝트 초기 설정이 완료되었습니다!

### 다음으로 진행할 문서:
1. **`01_quickstart.md`**: 로컬 개발 워크플로우 확인
2. **`TownPet-Scaffolding-Guide.md`**: 첫 도메인(users) 구현
3. **`TownPet-DDL-Blueprint.md`**: 전체 데이터베이스 스키마 설계

### 다음 작업 (권장 순서):
1. SecurityConfig 작성 (세션 기반 인증 설정)
2. User 엔티티 및 Repository 작성
3. 간단한 홈 페이지 컨트롤러 + Thymeleaf 템플릿 작성
4. HTMX로 첫 번째 부분 갱신 구현

**궁금한 점이나 막히는 부분이 있으면 언제든 질문하세요!** 🚀
