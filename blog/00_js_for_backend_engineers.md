# Python / Java 백엔드 개발자를 위한 TownPet JS 번역 가이드

이 문서는 TownPet 블로그 시리즈를 읽기 전에 알아두면 좋은 **최소한의 JS/Next 번역표**입니다.

## 제일 먼저 기억할 대응표

### Java / Spring 기준

- `app/src/app/api/**/route.ts` = Controller
- `app/src/server/services/*.ts` = Service
- `app/src/server/queries/*.ts` = 조회 전용 Query layer / Read repository
- `app/src/lib/validations/*.ts` = DTO + Validator
- `app/prisma/schema.prisma` = Entity/Schema 정의
- `app/src/app/**/page.tsx` = 서버 렌더링되는 page entry
- `app/src/components/**` = View / UI layer

### Python / FastAPI 기준

- `route.ts` = API endpoint function
- `service.ts` = business logic module
- `queries.ts` = read-only data access module
- `validations/*.ts` = Pydantic schema 역할
- `schema.prisma` = SQLAlchemy model + migration source 느낌

## TownPet가 왜 이렇게 나뉘어 있는가

TownPet는 구현 순서를 아래처럼 고정합니다.

```text
Prisma -> Zod -> Service -> Action/Route -> UI -> Tests
```

즉, React 프로젝트처럼 보여도 내부 구조는 꽤 백엔드식입니다.

## 처음 낯선 개념 6개

### `page.tsx`
- 해당 경로의 화면 entry 파일
- Spring MVC로 치면 `Controller + server-rendered template entry`에 가까움

### `route.ts`
- API endpoint
- `GET`, `POST` 같은 함수를 export

### Server Component
- 서버에서 렌더되는 기본 컴포넌트
- DB 조회나 서버 로직 호출 가능

### Client Component
- 파일 상단에 `"use client"` 선언
- 브라우저 상태, 이벤트 처리 가능

### Server Action
- 폼 제출이나 mutation을 서버 함수로 직접 연결하는 방식
- TownPet는 action과 route를 실용적으로 혼합 사용

### Prisma
- ORM이면서 schema와 client code generation을 같이 담당
- TownPet는 Prisma만으로 끝내지 않고 write는 `service`, read는 `queries`로 다시 나눔

## TownPet에서 어디부터 읽어야 하는가

1. `app/prisma/schema.prisma`
2. `app/src/lib/validations`
3. `app/src/server/services`
4. `app/src/server/queries`
5. `app/src/app/api`
6. `app/src/app/**/page.tsx`
7. `app/src/components`

## 자주 나오는 폴더 의미

- `app/src/app`: 라우트, 페이지, API endpoint
- `app/src/components`: 재사용 가능한 UI
- `app/src/server/services`: 비즈니스 로직
- `app/src/server/queries`: 조회 전용 로직
- `app/src/lib`: validation, 유틸리티, 정책 함수

## 한 줄 요약

TownPet는 겉으로는 Next.js 앱이지만, 읽는 순서를 잘 잡으면 **백엔드 아키텍처 감각으로 충분히 해석 가능한 프로젝트**입니다.

