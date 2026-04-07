# TownPet Blog Rebuild Guide

이 문서는 TownPet 블로그 시리즈를 **재현형 구현 가이드**로 만들기 위한 공통 규칙입니다.

## 목표

각 글은 아래를 동시에 만족해야 합니다.

1. 초보자가 읽고도 지금 어떤 문제를 푸는 글인지 이해할 것
2. 독자가 실제 파일을 열어 코드 흐름을 따라갈 수 있을 것
3. 면접에서 바로 설명 가능한 수준까지 설계 이유를 남길 것

## 기본 글 구조

모든 글은 가능하면 아래 순서를 유지합니다.

1. 이번 글에서 풀 문제
2. 이 글이 시리즈에서 왜 지금 필요한가
3. 먼저 알아둘 개념
4. 이번 글에서 볼 파일
5. 요청/데이터 흐름
6. 코드 설명
7. 테스트와 검증
8. 현재 구현의 한계
9. Python/Java 개발자용 요약
10. 면접 포인트

## TownPet 글에서 반드시 넣어야 하는 섹션

### Python/Java 개발자용 번역

```md
## Java/Spring으로 치환하면
- `app/src/app/api/posts/route.ts` = Controller
- `app/src/server/services/post.service.ts` = Service
- `app/src/server/queries/post.queries.ts` = 조회 전용 Query layer
- `app/src/lib/validations/post.ts` = DTO + Validator
- `app/prisma/schema.prisma` = Entity/Schema 정의
```

### 이번 글에서 볼 파일

글에서 다루는 파일은 실제 저장소 기준 경로로 적습니다.

### 검증 명령

문서에는 가능한 한 실제로 도는 명령만 남깁니다.

## React/Next 글에서 특히 조심할 것

- `Server Component`, `Client Component`, `Server Action`, `Route Handler`는 정의 없이 바로 쓰지 않습니다.
- “React가 알아서 해준다” 같은 표현을 쓰지 않습니다.
- 상태(state), 렌더링(render), hydration을 최소 한 번은 쉬운 말로 풉니다.
- `use client`는 “브라우저에서 상태/이벤트를 써야 할 때 필요한 선언”처럼 번역합니다.

## 금지 사항

- 없는 파일/없는 API를 예시로 쓰지 않기
- 문서가 현재 코드보다 더 완성된 것처럼 쓰지 않기
- 내부자 용어를 정의 없이 쓰지 않기
- “중요하다”, “안전하다”만 쓰고 근거를 생략하지 않기

## 문체 원칙

- 도입 문장은 `이 글의 목표는`보다 `이 글은 ...를 정리합니다` 형태를 우선합니다.
- `설명합니다`, `보는 편이 좋습니다`, `같습니다` 같은 완충 표현은 가능한 한 줄이고 단정형으로 씁니다.
- `이건 매우 중요합니다` 같은 강조 문장은 되도록 근거 문장으로 바로 대체합니다.
- 같은 문단 안에서 `즉`를 반복하지 않습니다. 필요할 때만 요약 문장 앞에 씁니다.
