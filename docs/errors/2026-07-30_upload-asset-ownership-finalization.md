# 업로드 asset ownership 및 finalization 정합성

## 증상

게시글·프로필·반려동물 mutation이 공개 upload URL만으로 `UploadAsset`을 `ATTACHED`로 승격할 수 있었고, mutation 이후 release 실패는 조용히 무시되어 미참조 asset이 남을 수 있었다.

## 원인

`attachUploadUrls()`의 update 조건이 `storageKey`뿐이었다. 또한 upload finalization이 DB mutation과 외부 저장소 lifecycle 사이에서 별도 실행되며 release 오류를 관측하지 않았다.

## 수정

- 인증 upload는 `ownerUserId`, guest upload는 IP/fingerprint hash ownership으로 attach 조건을 제한했다.
- ownership context가 없는 attach 호출은 수행하지 않는다.
- guest identity ownership 컬럼과 조회 index를 추가하고 local migration을 적용했다.
- release 실패를 structured logger/Sentry로 기록한다.
- 오래된 `ATTACHED` asset도 기존 cleanup 명령에서 미참조 여부를 확인하도록 범위를 확장했다.
- 삭제 상태 asset은 남은 local 파일이 있어도 media route에서 재서빙하지 않는다.

## 회귀 방지

소유자 불일치, guest identity 불일치, ownership 없는 attach, 삭제 media 재서빙, cleanup 경로를 Vitest로 고정했다.

## 검증

Prisma schema validate, local `prisma migrate deploy`, typecheck, 관련 upload/media/service tests를 실행했다. production migration deploy와 Blob 실서비스 cleanup은 별도 배포 전 검증 대상이다.
