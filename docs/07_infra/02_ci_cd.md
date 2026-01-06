# 02. CI/CD (GitHub Actions) 설계

## 1) Backend 파이프라인(예시)
- trigger: PR, main push
- steps
  - checkout
  - set up JDK
  - gradle build + test
  - docker build
  - push image(registry)
  - deploy(stage/prod)

## 2) Web UI(SSR) 파이프라인(옵션)
- Thymeleaf/HTMX는 Spring Boot에 포함되므로 별도 FE 빌드 파이프라인이 필수는 아니다.
- (선택) Tailwind를 CDN이 아니라 빌드로 고정할 경우:
  - Tailwind CLI(또는 Gradle task)로 `src/main/resources/static/css/app.css` 생성
  - 산출물을 Docker 이미지에 포함

## 3) DB 마이그레이션(Flyway)
- 배포 전 단계에서 마이그레이션 적용
- 실패 시 배포 중단

## 4) 품질 게이트(최소)
- 테스트 실패 시 merge 차단
- main 보호 브랜치 적용
