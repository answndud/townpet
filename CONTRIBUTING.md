# 기여 가이드

## 브랜치 전략

### 브랜치 종류
- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `bugfix/*`: 버그 수정 브랜치
- `hotfix/*`: 긴급 수정 브랜치

### 브랜치 네이밍
- `feature/issue-number-short-description`
- `bugfix/issue-number-short-description`
- `hotfix/issue-number-short-description`

## 커밋 규칙

### 커밋 메시지 형식
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드
- `chore`: 빌드/설정 변경

### 예시
```
feat(posts): Add hospital post creation

- Add HospitalPost entity
- Add hospital post creation endpoint
- Add validation for hospital name

Closes #123
```

## Pull Request

### PR 템플릿
```markdown
## 변경 사항
- 

## 테스트
- [ ] 단위 테스트 추가/수정
- [ ] 통합 테스트 추가/수정
- [ ] 수동 테스트 완료

## 체크리스트
- [ ] 코드 리뷰 요청
- [ ] 문서 업데이트
- [ ] 마이그레이션 스크립트 (필요시)

## 관련 이슈
Closes #
```

### PR 규칙
- PR은 최대한 작게 유지
- 리뷰어 최소 1명 지정
- CI 통과 필수
- Squash merge 사용

## 코드 스타일

### Backend (Java)
- Google Java Style Guide 준수
- Checkstyle 사용

### Frontend (TypeScript)
- ESLint + Prettier 사용
- Airbnb Style Guide 기반

## 테스트

### 테스트 작성 규칙
- 모든 새로운 기능은 테스트 포함
- 테스트 커버리지 80% 이상 유지

## 문서화

### 코드 문서화
- Public API는 JavaDoc/JSDoc 작성
- 복잡한 로직은 주석 추가

### 문서 업데이트
- 기능 추가/변경 시 관련 문서 업데이트
