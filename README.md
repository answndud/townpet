# 🐾 TownPet

> 동네 기반 반려동물 커뮤니티 플랫폼

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 프로젝트 소개

TownPet은 **동네 기반(Local) 반려생활 인프라**와 **지역 무관(Global) 지식 축적**을 결합한 반려동물 커뮤니티 플랫폼입니다.

### 핵심 가치
- 🏥 **동네 인프라**: 병원/동반 가능 식당/카페 리뷰, 산책로 공유
- 🤝 **커뮤니티**: 번개 모임, 펫친소, 마켓/나눔
- 🚨 **긴급 서비스**: 실종/유기 알림, 마이크로 돌봄
- 📚 **지식 축적**: 품종별 Q&A, 사료/용품 DB

---

## 🛠 기술 스택

### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| Java | 21 (LTS) | 메인 언어 |
| Spring Boot | 3.3.x | 웹 프레임워크 |
| Spring Security | - | 인증/인가 (세션 + OAuth2) |
| Spring Data JPA | - | ORM |
| QueryDSL | 5.1.0+ | 동적 쿼리 |
| Flyway | - | DB 마이그레이션 |

### Database & Cache
| 기술 | 버전 | 용도 |
|------|------|------|
| PostgreSQL | 16 | 메인 DB |
| Redis | 7 | 캐시, Rate Limit |

### Frontend (SSR)
| 기술 | 용도 |
|------|------|
| Thymeleaf | 서버 사이드 렌더링 |
| HTMX | 부분 갱신 (HTML swap) |
| Tailwind CSS | 스타일링 (CDN) |
| Alpine.js | 최소 UI 상태 (선택) |

---

## 🚀 시작하기

### 사전 요구사항
- JDK 21
- Docker & Docker Compose
- Git

### 로컬 실행

```bash
# 1. 저장소 클론
git clone https://github.com/YOUR_USERNAME/townpet.git
cd townpet

# 2. 데이터베이스 실행 (PostgreSQL + Redis)
docker compose -f infra/local/docker-compose.yml up -d

# 3. 애플리케이션 실행
./gradlew bootRun

# 4. 브라우저에서 확인
open http://localhost:8080
```

---

## 📁 프로젝트 구조

```
townpet/
├── src/main/java/com/townpet/
│   ├── common/          # 공통 유틸, 에러 코드
│   ├── config/          # 설정 (Security, JPA, Redis)
│   ├── auth/            # 인증/인가
│   ├── users/           # 사용자/프로필
│   ├── neighborhood/    # 동네/장소
│   ├── posts/           # 게시물/댓글
│   ├── market/          # 마켓/거래
│   └── moderation/      # 신고/운영
├── src/main/resources/
│   ├── templates/       # Thymeleaf 템플릿
│   ├── static/          # 정적 리소스
│   └── db/migration/    # Flyway 마이그레이션
├── docs/                # 프로젝트 문서
└── infra/               # Docker, CI/CD 설정
```

---

## 📖 문서

| 문서 | 설명 |
|------|------|
| [프로젝트 개요](docs/Overview.md) | 전체 비전, 기술 스택, 로드맵 |
| [초기 설정 가이드](docs/00_project/00_project_setup.md) | Spring Initializr부터 시작하기 |
| [Quickstart](docs/00_project/01_quickstart.md) | 로컬 개발 환경 구축 |
| [기술 스택](docs/Project-Tech-Stack.md) | 상세 기술 선택 이유 |

---

## 🗓 로드맵

- **Phase 1**: 병원/장소 템플릿 리뷰, 산책로 지도, 동네 피드
- **Phase 2**: 번개/펫친소, 마켓/나눔, 실종/유기 알림
- **Phase 3**: Q&A, 사료/용품 DB, 마이크로 돌봄
- **Phase 4**: 결제/정산, 광고/멤버십

---


## 👤 Contact

- **개발자**: Alex
- **이메일**: [your-email@example.com]
- **GitHub**: [https://github.com/YOUR_USERNAME](https://github.com/YOUR_USERNAME)
