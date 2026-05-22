# 오프라인 QR 파트너 운영 체크리스트

## 운영 목적

초기 파트너 QR은 가입자 수보다 `문제 해결 흐름 진입`과 `첫 제보 생성`을 확인하는 실험이다. 병원, 펫카페, 미용실, 보호소 현장에서 보호자가 바로 이해할 수 있는 링크만 사용한다.

## QR URL 매트릭스

| 파트너 | 랜딩 URL | 1차 액션 URL | 측정 source |
| --- | --- | --- | --- |
| 동물병원 | `/guides/24h-vet-checklist?utm_source=hospital_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `/posts/new?type=HOSPITAL_REVIEW&template=hospital_review&utm_source=hospital_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `hospital_qr` |
| 펫카페 | `/campaigns/neighborhood-map?utm_source=petcafe_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `/posts/new?type=PRODUCT_REVIEW&template=place_report&utm_source=petcafe_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `petcafe_qr` |
| 미용실 | `/campaigns/neighborhood-map?utm_source=grooming_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `/posts/new?type=WALK_ROUTE&template=walk_route_large_dog&utm_source=grooming_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `grooming_qr` |
| 보호소/입양센터 | `/guides/lost-pet-first-24-hours?utm_source=shelter_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `/lost/new?utm_source=shelter_qr&utm_medium=offline_qr&utm_campaign=neighborhood_map` | `shelter_qr` |

## 배치 전 확인

- QR이 회원가입이나 로그인 화면으로 직접 연결되지 않는다.
- 모바일 첫 화면에서 CTA가 접히지 않는다.
- 포스터 문구에 특정 지역명이 들어가지 않는다.
- 병원/업체 정보는 경험 공유이며 정정 요청 가능하다는 문구를 함께 설명한다.
- 분실동물 문구에는 전화번호, 상세 주소 입력을 강요하지 않는다.

## 현장 제안 스크립트

1. `TownPet는 반려동물 커뮤니티라기보다 동네 반려생활 정보를 모으는 게시판입니다.`
2. `QR은 가입이 아니라 보호자가 바로 쓰는 체크리스트나 제보 화면으로 연결됩니다.`
3. `병원/매장 입장에서는 광고보다 보호자에게 필요한 정보를 안내하는 형태입니다.`
4. `초기 2주 동안은 QR 조회와 제보 수만 확인하고, 비용이나 정산 약속은 하지 않습니다.`
5. `업체 정보에 문제가 있으면 정정 요청 경로로 처리합니다.`

## 2주 파일럿 체크

- 파트너 10곳 중 실제 QR 배치 수
- source별 랜딩 조회 수
- source별 CTA 클릭 수
- source별 첫 글 또는 분실/목격 등록 수
- QR 철거 요청 또는 문구 수정 요청
- 개인정보/후기 분쟁 가능성 제보

## 중단 기준

- 특정 파트너가 후기 삭제나 추천 순위 노출을 요구한다.
- 보호자 개인정보를 오프라인 포스터에서 직접 수집하려 한다.
- QR이 문제 해결보다 가입 강요로 인식된다는 피드백이 반복된다.
- 병원/업체 분쟁 처리 경로 없이 후기 수집만 확대해야 하는 상황이 된다.
