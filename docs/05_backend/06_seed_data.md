# 06. Seed Data (Local Demo Dataset)
> 경로(권장): `docs/05_backend/06_seed_data.md`  
> 목적: TownPet을 혼자 개발할 때, 화면/흐름 테스트가 가능하도록 **로컬 전용 시드 데이터** 전략을 고정한다.  
> 원칙: 운영에 절대 섞이지 않게, 프로필(local) + 토글로 완전히 분리한다.

---

## 1) Seed 데이터의 “정의”

Seed 데이터는 아래 2종으로 나뉜다.

1) **Dev Seed(로컬 개발용)**  
   - UI/기능 검증을 위해 필요한 최소 데이터  
   - 반복 실행해도 안전(멱등성)해야 함

2) **Fixture(테스트용)**  
   - 단위/통합 테스트에서만 쓰는 데이터  
   - `@Sql` 또는 Testcontainers 기반으로 관리(후속)

본 문서는 1) Dev Seed만 다룬다.

---

## 2) 적용 방식(권장): `ApplicationRunner` + local profile

### 2.1 이유
- Flyway에 “로컬 시드 SQL”을 섞으면 운영 위험이 커진다.
- 코드 시드는 멱등성/조건 로직을 넣기 쉽고, 유지보수도 빠르다.

### 2.2 기본 구성
- 클래스 위치(권장):
  - `src/main/java/.../dev/LocalSeedRunner.java`
- 적용 조건:
  - `@Profile("local")`
  - `townpet.dev.seed-enabled=true`

예시(개념 코드):
```java
@Profile("local")
@Component
@RequiredArgsConstructor
public class LocalSeedRunner implements ApplicationRunner {

  private final SeedService seedService;
  private final TownPetProperties props;

  @Override
  public void run(ApplicationArguments args) {
    if (!props.getDev().isSeedEnabled()) return;
    seedService.seedIfEmpty();
  }
}
```

---

## 3) 멱등성(Idempotency) 규칙 (필수)

Seed는 “두 번 실행해도 같은 상태”를 유지해야 한다.

### 3.1 권장 전략

* `existsBy...`로 체크 후 없으면 생성
* Unique 제약(DDL)과 충돌하지 않게, 고정 key를 사용

  * neighborhood: `slug`
  * user: `nickname`
  * place: `(neighborhood_id, type, name)`
  * report: (중복 방지 unique가 있으면 주의)

### 3.2 절대 금지

* 매 실행마다 무조건 INSERT(중복 누적)
* 운영과 동일한 “실제 외부 연동”(OAuth, 결제, 푸시 등)

---

## 4) Seed 데이터 스펙 (MVP 최소)

아래는 “페이지를 열어보기만 해도 의미가 있는” 최소 구성이다.

### 4.1 Neighborhood (2개)

* N1: `seoul-mapodong` (서울/마포구/망원·합정권)
* N2: `seoul-gangnamgu` (서울/강남구/역삼·선릉권)

### 4.2 Users (3명)

* U1: 일반 유저 (`USER`)
* U2: VERIFIED 유저 (`VERIFIED`)
* U3: ADMIN 유저 (`ADMIN`)

> 권장: Role은 `users.status`와 별개로 `user_roles`를 추가하거나(후속)
> MVP에서는 단순히 `users.status`를 ADMIN으로 쓰지 말고 “role 컬럼”을 두는 것이 정석이다.
> 현재 DDL에 role이 없다면, 최소로는 “admin 이메일/닉네임 하드코딩 + 서버에서 권한 처리”도 가능하지만 문서화가 필요하다.

### 4.3 Places (각 동네 5개 이상, 총 10개 추천)

* HOSPITAL 2
* GROOMING 1
* CAFE 1
* RESTAURANT(동반 가능) 1
* 동네별로 “비교”가 가능해야 하므로 최소 5개

### 4.4 Place Reviews (총 20개 추천)

* Place당 2개 이상
* 비용/대기/서비스 항목이 다양하게

### 4.5 Walk Routes (각 동네 3개)

* EASY/MEDIUM/HARD 각각 1개 이상
* tags 예시: `["가로등","화장실","오르막"]`

### 4.6 Market Listings (각 동네 5개, 총 10개 추천)

* USED/RENTAL/SHARE 타입이 골고루
* 상태는 OPEN 위주 (RESERVED/COMPLETED 1개씩)

### 4.7 Job Posts (각 동네 3개, 총 6개)

* PET_SITTING, DOG_WALKING, ERRAND 형태로 다양화
* OPEN 상태 위주 + CLOSED 1개

### 4.8 Missing Reports (각 동네 2개)

* LOST/FOUND/STRAY 최소 1개씩 포함

### 4.9 Posts/Comments (피드 확인용)

* LOCAL feed: 동네별 10개
* GLOBAL feed: 10개
* 댓글: post당 3개 정도

---

## 5) Dev Login과의 연결(강력 권장)

로컬에서 OAuth 없이 빠르게 확인하려면 Dev Login이 필요하다.

* dev login이 제공된다면:

  * U1/U2/U3를 seed로 만들고,
  * `/dev/login?userId=...`로 세션 주입

> dev login은 prod에서 절대 활성화되지 않도록
> `@Profile("local")` + property gating 두 겹으로 막는다.

---

## 6) Seed Service 계약(권장)

### 6.1 SeedService 인터페이스

```java
public interface SeedService {
  void seedIfEmpty();      // DB가 비어있으면 실행
  void seedAlways();       // 필요 시 강제(개발 편의, 위험하므로 local에서만)
}
```

### 6.2 “비어있음” 기준(권장)

* `neighborhoods`가 0이면 전체 seed 실행
* 또는 `users` 0 기준

---

## 7) 생성 순서(참조용)

Seed는 FK 관계 때문에 순서가 중요하다.

1. neighborhoods
2. users (+ user_neighborhoods)
3. places
4. place_reviews
5. walk_routes
6. posts
7. comments
8. market_listings
9. job_posts
10. job_applications (선택)
11. care_requests
12. missing_reports
13. reports/audit_logs (선택)

---

## 8) 데이터 콘텐츠 예시(문구 가이드)

### 8.1 장소명

* 병원: “망원동 24시 동물의료센터”, “합정 봄동물병원”
* 동반 식당: “테라스 동반가능 브런치”, “반려동물 동반 OK 파스타”
* 카페: “강아지 환영 카페”, “테라스 카페”

### 8.2 리뷰 템플릿 다양화

* 진료 항목: “예방접종”, “피부염”, “중성화”, “스케일링”
* 비용: 3만~30만 범위로 다양화
* 대기: 5분~90분 다양화

### 8.3 마켓 품목

* 사료/간식/이동가방/하네스/급수기/펫드라이룸(대여)

---

## 9) 운영 안전장치(필수)

* [ ] `@Profile("local")` 적용
* [ ] `townpet.dev.seed-enabled` 토글 적용
* [ ] seed runner가 prod에서 로드되지 않음 확인
* [ ] seed 데이터가 외부 API 호출(OAuth/푸시/결제)을 절대 하지 않음

---

## 10) 디버그/리셋 가이드(로컬)

### 10.1 “시드가 꼬였을 때” 가장 빠른 리셋

* DB 볼륨 제거 후 재기동(권장)

```bash
docker compose -f infra/local/docker-compose.yml down -v
docker compose -f infra/local/docker-compose.yml up -d
```

### 10.2 Flyway 관련 이슈

* checksum mismatch 등 문제가 나면 로컬은 DB 리셋이 가장 빠르다.
* 운영에서는 절대 리셋하지 말고 forward fix로 해결한다.

---

```
::contentReference[oaicite:0]{index=0}
```
