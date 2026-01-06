# TownPet 프로젝트 문서 분석 및 수정 제안

> **리뷰 일자**: 2026-01-06  
> **리뷰 범위**: `/docs` 폴더 전체 (50+ 문서)  
> **목적**: 프로젝트 문서의 일관성, 기술 스택 적합성, 버전 호환성, 실행 가능성 검토

---

> [!NOTE]
> ## ✅ 수정 완료 (2026-01-06)
> 
> 아래 항목들이 모두 수정 적용되었습니다:
> - **Java 21 통일**: `Project-Tech-Stack.md`, `Project-Summary.md`, `Overview.md`, `01_tech_stack_rationale.md`
> - **세션 우선 인증 전략**: 위 4개 파일 + `01_security_basics.md`
> - **QueryDSL 5.1.0+ 명시**: `Project-Summary.md`, `01_tech_stack_rationale.md`
> - **PostgreSQL 16 명시**: 위 모든 관련 파일
> - **Rate Limit 수치 추가**: `01_security_basics.md`
> - **누락된 참조 수정**: `01_quickstart.md`에서 Repository Contract 제거 및 불필요한 코드 블록 제거
> - **파일명 정리**: `TownPet Scaffolding(...).md` → `TownPet-Scaffolding-Guide.md`

---

## 📋 총평

전반적으로 **매우 잘 작성된 문서 세트**입니다. 특히:

### ✅ 잘된 점
1. **Local vs Global 분리 전략**: 비즈니스적으로 명확한 방향성 제시
2. **이력서/면접 관점 고려**: 실제 취업에 도움이 되는 기술 선택 명시
3. **운영 자동화 강조**: 신고/블라인드/rate limit 등 실전 필수 요소 포함
4. **SSR + HTMX 선택**: 1인 개발자에게 적합한 현실적인 스택
5. **Phase별 로드맵**: MVP → 확장 경로가 명확
6. **Flyway 정책**: 마이그레이션 규칙이 상세하고 실용적

### ⚠️ 개선이 필요한 영역
아래에 카테고리별로 수정 제안을 정리했습니다.

---

## 🔧 수정 제안 목록

### 1. 기술 스택 일관성 문제

#### 1.1 Java 버전 불일치
| 문서 | 명시된 버전 |
|------|-------------|
| `Project-Tech-Stack.md` | Java 17 또는 21 |
| `Project-Summary.md` | Java 17 또는 21 |
| `01_quickstart.md` | JDK 21 권장 |

> [!IMPORTANT]  
> **권장 수정**: 모든 문서에서 **Java 21**로 통일하세요.  
> - Java 21은 LTS(Long Term Support) 버전  
> - Spring Boot 3.x와 최적의 호환성  
> - 이력서에서 "최신 LTS 사용"으로 어필 가능

**수정 대상 파일**:
- `docs/Project-Tech-Stack.md` (라인 31)
- `docs/Project-Summary.md` (라인 56)

---

#### 1.2 QueryDSL 버전 명시 부족
`Project-Summary.md`에서 QueryDSL을 "최신(5.x~)"로만 표기했습니다.

> [!WARNING]  
> QueryDSL 5.x는 **Jakarta EE** 기반이며, Spring Boot 3.x + Hibernate 6.x와 호환됩니다.  
> QueryDSL 4.x는 javax 패키지를 사용하므로 **호환되지 않습니다**.

**권장 수정**:
```diff
- QueryDSL | 최신(5.x~) | 동적 필터/정렬/검색 조립
+ QueryDSL | 5.1.0+ (Jakarta EE 호환) | 동적 필터/정렬/검색 조립
```

**수정 대상 파일**:
- `docs/Project-Summary.md` (라인 60)

---

#### 1.3 PostgreSQL 버전 미명시
docker-compose 예시에서 `postgres:16`을 사용하지만, 다른 문서에서는 버전을 명시하지 않았습니다.

**권장 수정**: 모든 관련 문서에 PostgreSQL 16 명시
- 장점: JSONB 성능 개선, 논리 복제 향상
- `docs/Project-Tech-Stack.md`와 `docs/04_architecture/01_tech_stack_rationale.md`에 추가

---

### 2. 인증/인가 전략 불일치

#### 2.1 JWT vs 세션 혼용
| 문서 | 인증 방식 |
|------|----------|
| `Project-Tech-Stack.md` | OAuth2 + JWT (Access + Refresh) |
| `06_frontend/00_thymeleaf_htmx_blueprint.md` | **세션 기반 + CSRF** 권장 |

> [!CAUTION]  
> **SSR + HTMX 환경에서는 세션 기반 인증이 더 적합합니다.**  
> JWT는 SPA/모바일 API에 적합하지만, SSR에서는:
> - CSRF 토큰 관리가 복잡해짐
> - Refresh 토큰 처리가 어려움
> - 세션 무효화(로그아웃)가 까다로움

**권장 수정 방향**:
```
Phase 1 (MVP/SSR): 세션 + CSRF + OAuth2 로그인
Phase 4+ (API 추가 시): JWT API 레이어 도입
```

**수정 대상 파일**:
- `docs/Project-Tech-Stack.md` (라인 38-39): JWT 부분을 "Phase 확장 시 도입"으로 조정
- `docs/04_architecture/01_tech_stack_rationale.md`: 세션 우선 전략 명시

---

### 3. 라우팅 컨벤션 중복/불일치

여러 문서에서 라우팅 컨벤션을 반복 정의하고 있습니다:
- `docs/Overview.md` (라인 176-179)
- `docs/Project-Summary.md` (라인 139-141)
- `docs/04_architecture/02_system_architecture.md` (라인 6-9)
- `docs/06_frontend/00_thymeleaf_htmx_blueprint.md` (라인 26-28)

> [!TIP]  
> **권장**: 한 곳(예: `04_architecture/03_api_conventions.md`)에서 정의하고, 다른 문서에서는 링크로 참조

---

### 4. 누락된 문서/내용

#### 4.1 Repository Contract 파일 누락
`01_quickstart.md`에서 `TownPet-Repository-Contract.md`를 참조하지만, 실제 파일이 없습니다.

**수정**: 파일 생성 또는 참조 제거

#### 4.2 테스트 전략 구체화 필요
`docs/05_backend/05_testing_strategy.md`가 존재하지만 내용이 간략합니다.

**권장 추가 내용**:
- Testcontainers 설정 예시 (PostgreSQL, Redis)
- 테스트 프로필 (`application-test.yml`)
- CI에서 테스트 실행 명령어

#### 4.3 ERD 다이어그램 부재
`docs/02_product/05_data_model_erd.md`에 실제 ERD 이미지/Mermaid가 없습니다.

**권장**: Mermaid erDiagram 추가

---

### 5. 과도하게 장황한 부분

#### 5.1 기술 스택 중복 설명
다음 파일들이 유사한 내용을 반복합니다:
- `docs/Overview.md` (섹션 7)
- `docs/Project-Tech-Stack.md`
- `docs/Project-Summary.md` (섹션 2)
- `docs/04_architecture/01_tech_stack_rationale.md`

**권장 구조 재편**:
```
Project-Tech-Stack.md (상세/권위)
  ↑ 요약 링크
Overview.md (한눈에 보기)
  ↓ 참조
04_architecture/01_tech_stack_rationale.md (결정 근거만)
```

#### 5.2 비즈니스 모델 중복
`docs/01_business/04_monetization_pricing.md`와 `docs/08_data_analytics/03_payments_plan.md`가 유사한 내용입니다.

---

### 6. 운영 환경 보완 필요

#### 6.1 Tailwind 빌드 전략 명확화
현재 "CDN 시작 → 성장 시 빌드"로 되어 있으나, 전환 시점 기준이 없습니다.

**권장 기준 추가**:
- 페이지 로드 시간이 3초 초과 시
- 번들 크기 최적화 필요 시
- 프로덕션 배포 직전

#### 6.2 Redis 구성 상세화
`07_infra/03_env_config_secrets.md`에서 `REDIS_URL`만 명시되어 있습니다.

**권장 추가**:
```yaml
REDIS_HOST: localhost
REDIS_PORT: 6379
REDIS_PASSWORD: (선택)
REDIS_SSL: false
```

---

### 7. 보안 관련 보완

#### 7.1 JWT Secret Rotation 구체화
`09_security/01_security_basics.md`에서 "JWT secret rotation 계획"이 언급되었으나 상세가 없습니다.

**권장 추가 내용**:
- 키 버전 관리 방식
- 구 키 유효 기간(grace period)
- 긴급 rotation 절차

#### 7.2 Rate Limit 구체적 수치 제안
현재 "rate limit"만 언급되고 구체적 값이 없습니다.

**권장 기본값**:
| 엔드포인트 | 제한 |
|-----------|------|
| 로그인 시도 | 5회/분 |
| 게시글 작성 | 10회/시간 |
| 검색 | 60회/분 |
| 신고 | 10회/일 |
| 실종 알림 생성 | 3회/일 |

---

### 8. 사소한 수정 사항

#### 8.1 잘못된 문법/오타
- `01_quickstart.md` 라인 292-293: 불필요한 코드 블록 잔여물
  ```
  ::contentReference[oaicite:0]{index=0}
  ```
  → 삭제 필요

#### 8.2 파일명 일관성
- `TownPet Scaffolding(...).md`: 파일명에 괄호와 공백이 포함되어 있어 CLI에서 불편
- 권장: `TownPet-Scaffolding-Guide.md`로 변경

---

## 📊 수정 우선순위

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| 🔴 높음 | Java 버전 통일 (21) | 빌드/배포 시 혼란 방지 |
| 🔴 높음 | 인증 전략 명확화 (세션 우선) | 아키텍처 전체에 영향 |
| 🟡 중간 | QueryDSL 버전 명시 | 의존성 충돌 방지 |
| 🟡 중간 | 중복 문서 정리 | 유지보수성 향상 |
| 🟢 낮음 | Rate Limit 수치 추가 | 구현 시 결정 가능 |
| 🟢 낮음 | 파일명 정리 | 편의성 개선 |

---

## ✅ 결론

문서 품질이 전반적으로 **우수**합니다. 위 수정사항을 반영하면:

1. **기술 스택 일관성** 확보
2. **실제 구현 시 혼란 최소화**
3. **이력서/포트폴리오로 바로 활용 가능**

추가로 궁금한 점이나 수정 방향에 대해 논의가 필요하시면 말씀해 주세요!
