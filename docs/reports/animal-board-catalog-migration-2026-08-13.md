# 선호 동물 제거 및 동물 게시판 catalog 분리

## 결정

TownPet의 동물 게시판은 회원별 설정이 아니라 고정 catalog를 기준으로 노출한다. catalog는 URL 코드, 표시명, 그룹, 기존 `Community.slug` 연결과 게시판 URL 생성을 담당한다. 게시글은 기존 `Post.petTypeId` 연결을 유지해 기존 분류 데이터를 보존한다.

## 제거 범위

- 헤더의 선호 동물 선택 UI와 저장 액션
- 선호 동물 쿠키·사용자 조회·피드 개인화 보정
- `UserPetTypePreference` Prisma 모델과 관련 서비스/query/action
- viewer shell의 선호 동물 응답 필드

기존 적용 migration은 수정하지 않았고, `20260813000000_remove_user_pet_type_preferences`에서 legacy table을 안전하게 정리한다.

## 유지 범위

- 동물 catalog의 기존 12개 게시판 종류
- 공통 게시판의 별도 경계와 공통 글의 동물 태그 정책
- 글 작성 시 동물 분류 선택과 글 수정 시 분류 변경
- 프로필 기반 품종/반려동물 개인화, 최근 반응·행동 신호
