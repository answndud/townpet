아래는 **그대로 복붙해서 바로 실행 가능한 TownPet(Spring Boot + Thymeleaf + HTMX/Alpine/Tailwind CDN + PostgreSQL + Flyway)** 초기 스캐폴딩입니다.
(의도: Node 없이 SSR/Fragment 패턴을 즉시 굴리고, 이후 도메인을 수직 확장)

---

## 0) 생성할 파일 트리

```text
townpet/
├─ build.gradle
├─ settings.gradle
├─ .env.example
├─ infra/
│  └─ local/
│     └─ docker-compose.yml
└─ src/
   └─ main/
      ├─ java/
      │  └─ com/townpet/
      │     ├─ TownPetApplication.java
      │     ├─ common/
      │     │  ├─ config/
      │     │  │  └─ SecurityConfig.java
      │     │  ├─ error/
      │     │  │  ├─ ApiErrorResponse.java
      │     │  │  ├─ BusinessException.java
      │     │  │  ├─ ErrorCode.java
      │     │  │  └─ GlobalExceptionHandler.java
      │     │  └─ web/
      │     │     ├─ Cursor.java
      │     │     └─ Htmx.java
      │     ├─ neighborhood/
      │     │  ├─ domain/Neighborhood.java
      │     │  └─ repository/NeighborhoodRepository.java
      │     ├─ place/
      │     │  ├─ controller/PlaceFragmentController.java
      │     │  ├─ controller/PlacePageController.java
      │     │  ├─ domain/Place.java
      │     │  ├─ dto/PlaceCardDto.java
      │     │  ├─ repository/PlaceRepository.java
      │     │  └─ service/PlaceService.java
      │     └─ web/
      │        └─ HomePageController.java
      └─ resources/
         ├─ application.yml
         ├─ application-local.yml
         ├─ application-prod.yml
         ├─ db/
         │  └─ migration/
         │     ├─ V1__init_core_tables.sql
         │     └─ V2__init_places.sql
         ├─ static/
         │  ├─ css/
         │  │  └─ app.css
         │  └─ js/
         │     └─ app.js
         └─ templates/
            ├─ layout/
            │  ├─ base.html
            │  └─ error.html
            ├─ pages/
            │  ├─ home.html
            │  └─ local/
            │     └─ places.html
            └─ fragments/
               ├─ common/
               │  └─ toast.html
               └─ places/
                  └─ page_oob.html
```

---

## 1) Gradle (Spring Boot 3 + Java 21)

### `settings.gradle`

```gradle
rootProject.name = 'townpet'
```

### `build.gradle`

```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.4.0'
    id 'io.spring.dependency-management' version '1.1.6'
}

group = 'com.townpet'
version = '0.1.0'
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Web + SSR
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'

    // Validation
    implementation 'org.springframework.boot:spring-boot-starter-validation'

    // Security (CSRF + session 기반 기본틀)
    implementation 'org.springframework.boot:spring-boot-starter-security'

    // Persistence
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'org.postgresql:postgresql'

    // Flyway
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    // Observability
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

---

## 2) 로컬 DB (docker-compose)

### `infra/local/docker-compose.yml`

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

---

## 3) 환경변수 예시

### `.env.example`

```bash
SPRING_PROFILES_ACTIVE=local

DB_URL=jdbc:postgresql://localhost:5432/townpet
DB_USERNAME=townpet
DB_PASSWORD=townpet

LOG_LEVEL_ROOT=INFO
LOG_SQL=false

CSRF_ENABLED=true
```

---

## 4) Spring 설정 (application yml)

### `src/main/resources/application.yml`

```yaml
spring:
  application:
    name: townpet
  thymeleaf:
    prefix: classpath:/templates/
    suffix: .html
  mvc:
    throw-exception-if-no-handler-found: true

server:
  error:
    whitelabel:
      enabled: false

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

### `src/main/resources/application-local.yml`

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
    org.hibernate.SQL: ${LOG_SQL:false}

townpet:
  security:
    csrf-enabled: ${CSRF_ENABLED:true}
```

### `src/main/resources/application-prod.yml`

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
```

---

## 5) DB 마이그레이션 (Flyway)

### `src/main/resources/db/migration/V1__init_core_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','BANNED')),
  nickname VARCHAR(20) NOT NULL,
  bio VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_nickname
  ON users (nickname) WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  city VARCHAR(40) NOT NULL,
  district VARCHAR(40) NOT NULL,
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_neighborhood_slug ON neighborhoods(slug);
CREATE INDEX IF NOT EXISTS ix_neighborhood_city_dist ON neighborhoods(city, district);

CREATE TABLE IF NOT EXISTS user_neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  level VARCHAR(20) NOT NULL DEFAULT 'JOINED' CHECK (level IN ('NONE','JOINED','VERIFIED')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_neighborhood
  ON user_neighborhoods(user_id, neighborhood_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_user_neighborhood_neighborhood
  ON user_neighborhoods(neighborhood_id, level);
```

### `src/main/resources/db/migration/V2__init_places.sql`

```sql
CREATE TABLE IF NOT EXISTS places (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES neighborhoods(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('HOSPITAL','GROOMING','CAFE','RESTAURANT','ETC')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PENDING','REJECTED','CLOSED')),
  name VARCHAR(60) NOT NULL,
  address_text VARCHAR(120),
  phone VARCHAR(40),
  tags TEXT[],
  description VARCHAR(500),

  hidden_at TIMESTAMPTZ,
  hidden_reason_code VARCHAR(50),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_places_unique_name
  ON places(neighborhood_id, type, name) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ix_places_neighborhood_created
  ON places(neighborhood_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS ix_places_type ON places(type);
CREATE INDEX IF NOT EXISTS ix_places_status ON places(status);
CREATE INDEX IF NOT EXISTS ix_places_tags_gin ON places USING GIN(tags);

-- 최소 데모용 동네 2개(운영에서는 seed runner로 분리해도 됨)
INSERT INTO neighborhoods(city, district, name, slug)
VALUES
('서울', '마포구', '망원·합정권', 'seoul-mapodong'),
('서울', '강남구', '역삼·선릉권', 'seoul-gangnamgu')
ON CONFLICT (slug) DO NOTHING;

-- 최소 데모용 place 6개
INSERT INTO places(neighborhood_id, type, status, name, address_text, tags, description)
SELECT n.id, 'HOSPITAL', 'ACTIVE', '망원동 24시 동물의료센터', '서울 마포구 망원로 00', ARRAY['야간진료','친절'], '야간 진료 가능(데모)'
FROM neighborhoods n WHERE n.slug='seoul-mapodong'
ON CONFLICT DO NOTHING;

INSERT INTO places(neighborhood_id, type, status, name, address_text, tags, description)
SELECT n.id, 'RESTAURANT', 'ACTIVE', '테라스 동반가능 브런치', '서울 마포구 양화로 00', ARRAY['테라스','동반가능'], '반려동물 동반 OK(데모)'
FROM neighborhoods n WHERE n.slug='seoul-mapodong'
ON CONFLICT DO NOTHING;

INSERT INTO places(neighborhood_id, type, status, name, address_text, tags, description)
SELECT n.id, 'CAFE', 'ACTIVE', '강아지 환영 카페', '서울 마포구 월드컵로 00', ARRAY['테라스','물그릇'], '물그릇 제공(데모)'
FROM neighborhoods n WHERE n.slug='seoul-mapodong'
ON CONFLICT DO NOTHING;

INSERT INTO places(neighborhood_id, type, status, name, address_text, tags, description)
SELECT n.id, 'HOSPITAL', 'ACTIVE', '역삼 봄동물병원', '서울 강남구 테헤란로 00', ARRAY['예약','친절'], '예약 권장(데모)'
FROM neighborhoods n WHERE n.slug='seoul-gangnamgu'
ON CONFLICT DO NOTHING;

INSERT INTO places(neighborhood_id, type, status, name, address_text, tags, description)
SELECT n.id, 'GROOMING', 'ACTIVE', '선릉 펫그루밍', '서울 강남구 선릉로 00', ARRAY['미용','소형견'], '소형견 전문(데모)'
FROM neighborhoods n WHERE n.slug='seoul-gangnamgu'
ON CONFLICT DO NOTHING;

INSERT INTO places(neighborhood_id, type, status, name, address_text, tags, description)
SELECT n.id, 'CAFE', 'ACTIVE', '역삼 테라스 카페', '서울 강남구 역삼로 00', ARRAY['테라스','동반가능'], '테라스 좌석(데모)'
FROM neighborhoods n WHERE n.slug='seoul-gangnamgu'
ON CONFLICT DO NOTHING;
```

---

## 6) Java 코드 (패키지/기본 라우팅/에러/커서)

### `src/main/java/com/townpet/TownPetApplication.java`

```java
package com.townpet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TownPetApplication {
    public static void main(String[] args) {
        SpringApplication.run(TownPetApplication.class, args);
    }
}
```

### `src/main/java/com/townpet/common/web/Htmx.java`

```java
package com.townpet.common.web;

import jakarta.servlet.http.HttpServletRequest;

public final class Htmx {
    private Htmx() {}

    public static boolean isHtmx(HttpServletRequest req) {
        return "true".equalsIgnoreCase(req.getHeader("HX-Request"));
    }
}
```

### `src/main/java/com/townpet/common/web/Cursor.java`

```java
package com.townpet.common.web;

import java.time.Instant;

public record Cursor(Instant createdAt, long id) {

    public static Cursor parse(String raw) {
        if (raw == null || raw.isBlank()) return null;
        // format: 2026-01-01T00:00:00Z_123
        String[] parts = raw.split("_", 2);
        if (parts.length != 2) throw new IllegalArgumentException("Invalid cursor");
        return new Cursor(Instant.parse(parts[0]), Long.parseLong(parts[1]));
    }

    public static String encode(Cursor c) {
        if (c == null) return null;
        return c.createdAt().toString() + "_" + c.id();
    }
}
```

### `src/main/java/com/townpet/common/error/ErrorCode.java`

```java
package com.townpet.common.error;

public enum ErrorCode {
    AUTH_REQUIRED,
    FORBIDDEN,
    NOT_FOUND,
    VALIDATION_FAILED,
    DUPLICATE_RESOURCE,
    POLICY_RESTRICTED,
    STATE_CONFLICT,
    RATE_LIMITED,
    CONTENT_BLOCKED,
    INTERNAL_ERROR
}
```

### `src/main/java/com/townpet/common/error/BusinessException.java`

```java
package com.townpet.common.error;

public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
```

### `src/main/java/com/townpet/common/error/ApiErrorResponse.java`

```java
package com.townpet.common.error;

import java.time.Instant;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String errorCode,
        String message,
        String path
) {
    public static ApiErrorResponse of(int status, ErrorCode code, String message, String path) {
        return new ApiErrorResponse(Instant.now(), status, code.name(), message, path);
    }
}
```

### `src/main/java/com/townpet/common/error/GlobalExceptionHandler.java`

```java
package com.townpet.common.error;

import com.townpet.common.web.Htmx;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusiness(BusinessException ex, HttpServletRequest req, Model model) {
        String path = req.getRequestURI();
        int status = mapStatus(ex.getErrorCode());

        // /api/** => JSON
        if (path.startsWith("/api/")) {
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ApiErrorResponse.of(status, ex.getErrorCode(), safeMessage(ex), path));
        }

        // /f/** => HTMX fragment (toast OOB)
        if (path.startsWith("/f/")) {
            // AUTH_REQUIRED 같은 경우는 HX-Redirect를 쓰는 편이 낫다.
            if (ex.getErrorCode() == ErrorCode.AUTH_REQUIRED) {
                return ResponseEntity.status(401)
                        .header("HX-Redirect", "/p/login?next=" + path)
                        .build();
            }

            model.addAttribute("message", safeMessage(ex));
            model.addAttribute("level", levelForStatus(status));
            // toast fragment는 toast-root를 OOB로 갱신한다.
            return ResponseEntity.status(status)
                    .contentType(MediaType.TEXT_HTML)
                    .body(renderToastOobHtml(model));
        }

        // /p/** => 에러 페이지
        return ResponseEntity.status(status)
                .contentType(MediaType.TEXT_HTML)
                .body("""
                      <!doctype html>
                      <html><head><meta charset="utf-8"><title>Error</title></head>
                      <body>
                        <h1>오류</h1>
                        <p>%s</p>
                        <p><a href="/p/home">홈으로</a></p>
                      </body></html>
                      """.formatted(escapeHtml(safeMessage(ex))));
    }

    private int mapStatus(ErrorCode code) {
        return switch (code) {
            case AUTH_REQUIRED -> 401;
            case FORBIDDEN, POLICY_RESTRICTED -> 403;
            case NOT_FOUND -> 404;
            case VALIDATION_FAILED -> 400;
            case DUPLICATE_RESOURCE, STATE_CONFLICT -> 409;
            case RATE_LIMITED -> 429;
            case CONTENT_BLOCKED -> 410;
            default -> 500;
        };
    }

    private String safeMessage(BusinessException ex) {
        return ex.getMessage() == null || ex.getMessage().isBlank()
                ? "요청을 처리할 수 없습니다."
                : ex.getMessage();
    }

    private String levelForStatus(int status) {
        if (status >= 500) return "error";
        if (status >= 400) return "warning";
        return "info";
    }

    /**
     * MVP 단순화를 위해, toast fragment를 “문자열”로 렌더링한다.
     * 실제로는 Thymeleaf ViewResolver로 fragments/common/toast 를 렌더링하는 방식이 더 정석.
     */
    private String renderToastOobHtml(Model model) {
        String message = escapeHtml((String) model.getAttribute("message"));
        String level = escapeHtml((String) model.getAttribute("level"));

        return """
            <div id="toast-root" hx-swap-oob="innerHTML">
              <div class="toast toast-%s">%s</div>
            </div>
            """.formatted(level, message);
    }

    private String escapeHtml(String s) {
        return s == null ? "" : s
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
```

> 위 handler는 “일단 돌아가게” 만든 MVP 버전입니다.
> 나중에 `fragments/common/toast.html`을 Thymeleaf로 렌더링하도록 개선하면 됩니다(구조는 그대로 유지).

---

### `src/main/java/com/townpet/common/config/SecurityConfig.java`

```java
package com.townpet.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/css/**", "/js/**", "/img/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/p/**", "/f/**").permitAll()
                .anyRequest().permitAll()
            )
            // CSRF: HTMX POST/PUT/DELETE 대비. (GET만 쓰더라도 틀은 잡아둠)
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            )
            .formLogin(Customizer.withDefaults());

        return http.build();
    }
}
```

---

### Neighborhood / Place (JPA 최소)

#### `src/main/java/com/townpet/neighborhood/domain/Neighborhood.java`

```java
package com.townpet.neighborhood.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "neighborhoods")
public class Neighborhood {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String city;

    @Column(nullable = false, length = 40)
    private String district;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, length = 80, unique = true)
    private String slug;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getSlug() { return slug; }
}
```

#### `src/main/java/com/townpet/neighborhood/repository/NeighborhoodRepository.java`

```java
package com.townpet.neighborhood.repository;

import com.townpet.neighborhood.domain.Neighborhood;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NeighborhoodRepository extends JpaRepository<Neighborhood, Long> {
    Optional<Neighborhood> findBySlug(String slug);
}
```

#### `src/main/java/com/townpet/place/domain/Place.java`

```java
package com.townpet.place.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "places")
public class Place {

    public enum Type { HOSPITAL, GROOMING, CAFE, RESTAURANT, ETC }
    public enum Status { ACTIVE, PENDING, REJECTED, CLOSED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "neighborhood_id", nullable = false)
    private Long neighborhoodId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(name = "address_text", length = 120)
    private String addressText;

    @Column(length = 40)
    private String phone;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getNeighborhoodId() { return neighborhoodId; }
    public Type getType() { return type; }
    public Status getStatus() { return status; }
    public String getName() { return name; }
    public String getAddressText() { return addressText; }
    public String getDescription() { return description; }
    public Instant getCreatedAt() { return createdAt; }
}
```

#### `src/main/java/com/townpet/place/dto/PlaceCardDto.java`

```java
package com.townpet.place.dto;

import com.townpet.place.domain.Place;

import java.time.Instant;

public record PlaceCardDto(
        long id,
        String type,
        String status,
        String name,
        String addressText,
        String description,
        Instant createdAt
) {
    public static PlaceCardDto from(Place p) {
        return new PlaceCardDto(
                p.getId(),
                p.getType().name(),
                p.getStatus().name(),
                p.getName(),
                p.getAddressText(),
                p.getDescription(),
                p.getCreatedAt()
        );
    }
}
```

#### `src/main/java/com/townpet/place/repository/PlaceRepository.java`

```java
package com.townpet.place.repository;

import com.townpet.place.domain.Place;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface PlaceRepository extends JpaRepository<Place, Long> {

    @Query("""
        select p from Place p
        where p.neighborhoodId = :neighborhoodId
          and p.isDeleted = false
          and p.hiddenAt is null
        order by p.createdAt desc, p.id desc
    """)
    List<Place> firstPage(long neighborhoodId, Pageable pageable);

    @Query("""
        select p from Place p
        where p.neighborhoodId = :neighborhoodId
          and p.isDeleted = false
          and p.hiddenAt is null
          and (p.createdAt < :cursorCreatedAt or (p.createdAt = :cursorCreatedAt and p.id < :cursorId))
        order by p.createdAt desc, p.id desc
    """)
    List<Place> nextPage(long neighborhoodId, Instant cursorCreatedAt, long cursorId, Pageable pageable);
}
```

#### `src/main/java/com/townpet/place/service/PlaceService.java`

```java
package com.townpet.place.service;

import com.townpet.common.web.Cursor;
import com.townpet.neighborhood.repository.NeighborhoodRepository;
import com.townpet.place.dto.PlaceCardDto;
import com.townpet.place.repository.PlaceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlaceService {

    private final PlaceRepository placeRepository;
    private final NeighborhoodRepository neighborhoodRepository;

    public PlaceService(PlaceRepository placeRepository, NeighborhoodRepository neighborhoodRepository) {
        this.placeRepository = placeRepository;
        this.neighborhoodRepository = neighborhoodRepository;
    }

    public record PlacePage(List<PlaceCardDto> items, String nextCursor) {}

    public PlacePage listByNeighborhoodSlug(String slug, String cursorRaw, int size) {
        long neighborhoodId = neighborhoodRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Unknown neighborhood slug: " + slug))
                .getId();

        return listByNeighborhoodId(neighborhoodId, cursorRaw, size);
    }

    public PlacePage listByNeighborhoodId(long neighborhoodId, String cursorRaw, int size) {
        var pageable = PageRequest.of(0, Math.min(Math.max(size, 1), 50));

        Cursor cursor = Cursor.parse(cursorRaw);
        var entities = (cursor == null)
                ? placeRepository.firstPage(neighborhoodId, pageable)
                : placeRepository.nextPage(neighborhoodId, cursor.createdAt(), cursor.id(), pageable);

        var dtos = entities.stream().map(PlaceCardDto::from).toList();
        String next = null;
        if (!entities.isEmpty() && entities.size() == pageable.getPageSize()) {
            var last = entities.get(entities.size() - 1);
            next = Cursor.encode(new Cursor(last.getCreatedAt(), last.getId()));
        }
        return new PlacePage(dtos, next);
    }
}
```

---

### 기본 Page 라우팅

#### `src/main/java/com/townpet/web/HomePageController.java`

```java
package com.townpet.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomePageController {

    @GetMapping({"/", "/p/home"})
    public String home() {
        return "pages/home";
    }
}
```

#### `src/main/java/com/townpet/place/controller/PlacePageController.java`

```java
package com.townpet.place.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.ui.Model;

@Controller
@RequestMapping("/p/local")
public class PlacePageController {

    @GetMapping("/places")
    public String places(@RequestParam(defaultValue = "seoul-mapodong") String n, Model model) {
        // n = neighborhood slug
        model.addAttribute("neighborhoodSlug", n);
        return "pages/local/places";
    }
}
```

#### `src/main/java/com/townpet/place/controller/PlaceFragmentController.java`

```java
package com.townpet.place.controller;

import com.townpet.place.service.PlaceService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/f/places")
public class PlaceFragmentController {

    private final PlaceService placeService;

    public PlaceFragmentController(PlaceService placeService) {
        this.placeService = placeService;
    }

    /**
     * HTMX OOB 패턴:
     * - #places-items 에 beforeend로 items append
     * - #places-more 에 innerHTML로 다음 버튼 갱신
     */
    @GetMapping("/page")
    public String page(@RequestParam String neighborhoodSlug,
                       @RequestParam(required = false) String cursor,
                       @RequestParam(defaultValue = "10") int size,
                       Model model) {

        var result = placeService.listByNeighborhoodSlug(neighborhoodSlug, cursor, size);
        model.addAttribute("items", result.items());
        model.addAttribute("nextCursor", result.nextCursor());
        model.addAttribute("neighborhoodSlug", neighborhoodSlug);
        return "fragments/places/page_oob";
    }
}
```

---

## 7) Templates (Thymeleaf + HTMX OOB)

### `src/main/resources/templates/layout/base.html`

```html
<!doctype html>
<html lang="ko" xmlns:th="http://www.thymeleaf.org">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>

  <title th:text="${title} ?: 'TownPet'">TownPet</title>

  <!-- Tailwind CDN (MVP) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- HTMX -->
  <script src="https://unpkg.com/htmx.org@1.9.12"></script>

  <!-- Alpine (optional) -->
  <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>

  <link rel="stylesheet" href="/css/app.css"/>
  <script defer src="/js/app.js"></script>
</head>

<body class="bg-slate-50 text-slate-900">
  <header class="border-b bg-white">
    <div class="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
      <a href="/p/home" class="font-semibold">TownPet</a>
      <nav class="text-sm flex gap-3">
        <a class="hover:underline" href="/p/local/places">동네 인프라</a>
      </nav>
    </div>
  </header>

  <!-- Toast Root (HTMX OOB로 innerHTML 갱신) -->
  <div id="toast-root" class="mx-auto max-w-5xl px-4 pt-4"></div>

  <main class="mx-auto max-w-5xl px-4 py-6">
    <div th:replace="${content}"></div>
  </main>

  <footer class="border-t bg-white">
    <div class="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-500">
      TownPet MVP (Thymeleaf + HTMX)
    </div>
  </footer>
</body>
</html>
```

### `src/main/resources/templates/pages/home.html`

```html
<!doctype html>
<html xmlns:th="http://www.thymeleaf.org">
  <th:block th:replace="layout/base :: content(~{::content})">
    <th:block th:fragment="content">
      <h1 class="text-xl font-semibold">TownPet</h1>
      <p class="mt-2 text-sm text-slate-600">
        SSR + HTMX 기반 MVP 스캐폴딩이 정상 동작 중입니다.
      </p>

      <div class="mt-6">
        <a class="inline-flex items-center rounded bg-blue-600 px-3 py-2 text-white text-sm"
           href="/p/local/places">동네 인프라(Places) 보기</a>
      </div>
    </th:block>
  </th:block>
</html>
```

> 주의: 위 `layout/base :: content` 방식은 “레이아웃 조합”의 간단 버전입니다.
> Thymeleaf 레이아웃을 더 정석으로 쓰려면 Layout Dialect를 추가하면 되지만, MVP에서는 이 정도로 충분합니다.

### `src/main/resources/templates/pages/local/places.html`

```html
<!doctype html>
<html xmlns:th="http://www.thymeleaf.org">
  <th:block th:replace="layout/base :: content(~{::content})">
    <th:block th:fragment="content">
      <div class="flex items-end justify-between">
        <div>
          <h1 class="text-xl font-semibold">동네 인프라</h1>
          <p class="mt-1 text-sm text-slate-600">병원/식당/카페 등의 장소 정보를 비교합니다.</p>
        </div>

        <form method="get" action="/p/local/places" class="flex gap-2 items-center">
          <label class="text-sm text-slate-600">동네</label>
          <select name="n" class="border rounded px-2 py-1 text-sm">
            <option value="seoul-mapodong" th:selected="${neighborhoodSlug == 'seoul-mapodong'}">망원·합정권</option>
            <option value="seoul-gangnamgu" th:selected="${neighborhoodSlug == 'seoul-gangnamgu'}">역삼·선릉권</option>
          </select>
          <button class="border rounded px-3 py-1 text-sm bg-white">이동</button>
        </form>
      </div>

      <!-- Items append target -->
      <div id="places-items" class="mt-6 space-y-3"></div>

      <!-- Load more button target -->
      <div id="places-more" class="mt-4"></div>

      <!-- HTMX trigger target (응답은 OOB로 places-items/places-more를 갱신) -->
      <div id="places-trigger"
           hx-get="/f/places/page"
           hx-trigger="load"
           hx-target="#places-trigger"
           hx-swap="innerHTML"
           th:attr="hx-vals=${'{\"neighborhoodSlug\":\"' + neighborhoodSlug + '\"}'}">
      </div>
    </th:block>
  </th:block>
</html>
```

### `src/main/resources/templates/fragments/places/page_oob.html`

```html
<!doctype html>
<html xmlns:th="http://www.thymeleaf.org">
  <!-- OOB: items append -->
  <div id="places-items" hx-swap-oob="beforeend">
    <div th:each="p : ${items}" class="rounded border bg-white p-4">
      <div class="flex items-center justify-between">
        <div class="font-medium" th:text="${p.name()}">Place Name</div>
        <div class="text-xs text-slate-500" th:text="${p.type()}">HOSPITAL</div>
      </div>
      <div class="mt-1 text-sm text-slate-600" th:text="${p.addressText()}">Address</div>
      <div class="mt-2 text-sm" th:text="${p.description()}">Description</div>
    </div>
  </div>

  <!-- OOB: load more button replace -->
  <div id="places-more" hx-swap-oob="innerHTML">
    <div th:if="${nextCursor != null}">
      <button class="rounded border bg-white px-3 py-2 text-sm"
              hx-get="/f/places/page"
              hx-target="#places-trigger"
              hx-swap="innerHTML"
              th:attr="hx-vals=${'{\"neighborhoodSlug\":\"' + neighborhoodSlug + '\",\"cursor\":\"' + nextCursor + '\"}'}">
        더보기
      </button>
    </div>
    <div th:if="${nextCursor == null}" class="text-sm text-slate-500">
      더 이상 데이터가 없습니다.
    </div>
  </div>

  <!-- swap 대상(places-trigger)에 들어가는 내용은 의미 없음 -->
  <div>OK</div>
</html>
```

### `src/main/resources/templates/fragments/common/toast.html`

```html
<!doctype html>
<html xmlns:th="http://www.thymeleaf.org">
  <div class="toast" th:text="${message}">toast</div>
</html>
```

---

## 8) Static (app.js / app.css)

### `src/main/resources/static/js/app.js`

```javascript
// HTMX + Spring Security CSRF (CookieCsrfTokenRepository)
// - 기본적으로 XSRF-TOKEN 쿠키가 생김
// - 요청 헤더에 X-XSRF-TOKEN을 실어 보냄
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

document.body.addEventListener('htmx:configRequest', function (evt) {
  const token = getCookie('XSRF-TOKEN');
  if (token) {
    evt.detail.headers['X-XSRF-TOKEN'] = token;
  }
});
```

### `src/main/resources/static/css/app.css`

```css
/* MVP 최소: Toast 스타일만 */
.toast {
  border: 1px solid rgba(15, 23, 42, 0.15);
  background: white;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 8px;
}

.toast-warning { border-color: rgba(245, 158, 11, 0.5); }
.toast-error   { border-color: rgba(239, 68, 68, 0.6); }
.toast-info    { border-color: rgba(59, 130, 246, 0.5); }
```

---

## 9) 에러 페이지(선택)

### `src/main/resources/templates/layout/error.html`

```html
<!doctype html>
<html xmlns:th="http://www.thymeleaf.org">
  <th:block th:replace="layout/base :: content(~{::content})">
    <th:block th:fragment="content">
      <h1 class="text-xl font-semibold">오류</h1>
      <p class="mt-2 text-sm text-slate-600">요청을 처리할 수 없습니다.</p>
      <div class="mt-6">
        <a class="underline text-sm" href="/p/home">홈으로</a>
      </div>
    </th:block>
  </th:block>
</html>
```

---

## 10) 실행 커맨드(로컬)

```bash
# 1) DB
docker compose -f infra/local/docker-compose.yml up -d

# 2) 앱 (환경변수는 IDE에 넣거나 .env.local로 관리)
SPRING_PROFILES_ACTIVE=local \
DB_URL=jdbc:postgresql://localhost:5432/townpet \
DB_USERNAME=townpet \
DB_PASSWORD=townpet \
./gradlew bootRun
```

브라우저:

* `http://localhost:8080/p/home`
* `http://localhost:8080/p/local/places`

---

## 다음 작업(코딩 시작 순서, 권장)

1. `Place` 리스트가 정상(더보기 포함)임을 확인
2. “리뷰(PlaceReview)” 테이블/페이지/fragment 추가
3. Market(예약/상태전이 409) 추가 → `STATE_CONFLICT` UX 확인
4. Job apply 폼(VALIDATION_FAILED 400) 추가 → 폼 fragment 교체 패턴 정착

원하면, 다음 메시지에서 **“Places 리뷰까지 포함한 V3 마이그레이션 + 리뷰 목록 HTMX OOB 패턴”**을 같은 방식으로 한 번에 제시하겠습니다.
