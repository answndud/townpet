import "dotenv/config";
import {
  AdoptionStatus,
  AnimalSex,
  ItemCondition,
  MarketStatus,
  MarketType,
  MeetupStatus,
  PostScope,
  PostType,
  Prisma,
  PrismaClient,
  ReviewCategory,
  RouteDifficulty,
  UserRole,
  VolunteerRecruitmentStatus,
} from "@prisma/client";

import { resolveBoardByPostType } from "../src/lib/community-board";

const prisma = new PrismaClient();

const neighborhoods = [
  { name: "서초동", city: "서울", district: "서초구" },
  { name: "연남동", city: "서울", district: "마포구" },
  { name: "망원동", city: "서울", district: "마포구" },
  { name: "수영동", city: "부산", district: "수영구" },
  { name: "광안동", city: "부산", district: "수영구" },
  { name: "정자동", city: "성남", district: "분당구" },
  { name: "중앙동", city: "대구", district: "중구" },
  { name: "탄방동", city: "대전", district: "서구" },
] as const;

const communityCategories = [
  { slug: "dogs", labelKo: "강아지", sortOrder: 1 },
  { slug: "cats", labelKo: "고양이", sortOrder: 2 },
  { slug: "birds", labelKo: "조류", sortOrder: 3 },
  { slug: "reptiles", labelKo: "파충류", sortOrder: 4 },
  { slug: "small-pets", labelKo: "소동물", sortOrder: 5 },
] as const;

const communities = [
  {
    slug: "dogs",
    labelKo: "강아지",
    categorySlug: "dogs",
    sortOrder: 1,
    tags: ["산책", "훈련", "사료", "건강"],
    defaultPostTypes: [
      PostType.FREE_BOARD,
      PostType.FREE_POST,
      PostType.QA_QUESTION,
      PostType.PET_SHOWCASE,
      PostType.PRODUCT_REVIEW,
      PostType.MEETUP,
    ],
  },
  {
    slug: "cats",
    labelKo: "고양이",
    categorySlug: "cats",
    sortOrder: 2,
    tags: ["화장실", "간식", "건강", "장난감"],
    defaultPostTypes: [
      PostType.FREE_BOARD,
      PostType.FREE_POST,
      PostType.QA_QUESTION,
      PostType.PET_SHOWCASE,
      PostType.PRODUCT_REVIEW,
    ],
  },
  {
    slug: "birds",
    labelKo: "조류",
    categorySlug: "birds",
    sortOrder: 3,
    tags: ["케이지", "먹이", "발성", "장난감"],
    defaultPostTypes: [
      PostType.FREE_BOARD,
      PostType.QA_QUESTION,
      PostType.PET_SHOWCASE,
      PostType.PRODUCT_REVIEW,
    ],
  },
  {
    slug: "reptiles",
    labelKo: "파충류",
    categorySlug: "reptiles",
    sortOrder: 4,
    tags: ["온습도", "UVB", "탈피", "먹이"],
    defaultPostTypes: [
      PostType.FREE_BOARD,
      PostType.QA_QUESTION,
      PostType.PET_SHOWCASE,
      PostType.PRODUCT_REVIEW,
    ],
  },
  {
    slug: "small-pets",
    labelKo: "소동물",
    categorySlug: "small-pets",
    sortOrder: 5,
    tags: ["케이지", "급여", "깔짚", "합사"],
    defaultPostTypes: [
      PostType.FREE_BOARD,
      PostType.QA_QUESTION,
      PostType.PET_SHOWCASE,
      PostType.PRODUCT_REVIEW,
    ],
  },
] as const;

const authors = [
  { email: "admin.platform@townpet.dev", nickname: "platform-admin", role: UserRole.ADMIN },
  { email: "admin.ops@townpet.dev", nickname: "ops-admin", role: UserRole.ADMIN },
  { email: "mod.trust@townpet.dev", nickname: "trust-mod", role: UserRole.MODERATOR },
  { email: "mod.local@townpet.dev", nickname: "local-mod", role: UserRole.MODERATOR },
  { email: "mod.content@townpet.dev", nickname: "content-mod", role: UserRole.MODERATOR },
  { email: "power.reviewer@townpet.dev", nickname: "review-pro", role: UserRole.USER },
  { email: "hospital.geek@townpet.dev", nickname: "vet-notes", role: UserRole.USER },
  { email: "place.hunter@townpet.dev", nickname: "pet-place-hunter", role: UserRole.USER },
  { email: "route.runner@townpet.dev", nickname: "walk-route-runner", role: UserRole.USER },
  { email: "qa.helper@townpet.dev", nickname: "qa-helper", role: UserRole.USER },
  { email: "lostfound.alert@townpet.dev", nickname: "lostfound-watch", role: UserRole.USER },
  { email: "cat.parent@townpet.dev", nickname: "cat-mom", role: UserRole.USER },
  { email: "dog.parent@townpet.dev", nickname: "dog-dad", role: UserRole.USER },
  { email: "multi.pet.family@townpet.dev", nickname: "family-pack", role: UserRole.USER },
  { email: "weekend.meetup@townpet.dev", nickname: "weekend-meetup", role: UserRole.USER },
  { email: "market.scout@townpet.dev", nickname: "market-scout", role: UserRole.USER },
] as const;

const imagePool = [
  "/uploads/1771498436056-70bcff26-10c7-409a-b9a0-ba1d18e7b86f.png",
  "/uploads/1771498505175-b5b8aecc-1b8c-401e-baf2-f120ae4d2aba.png",
  "/uploads/1771501467432-a80f9b51-cc43-4d37-a0f9-dc8cf51f99f6.png",
  "/uploads/1771502481440-aea1f0a2-1d77-45fc-bfe1-a6684a478c56.png",
  "/uploads/1772020630884-21df17aa-6da9-4603-b424-9bdb2b40c43e.png",
  "/uploads/1772020630888-44aa7340-d319-4e90-8b44-e5c2036ad595.png",
  "/uploads/1772020699369-6bc18af9-dc11-4863-a6c5-b91a78fccdb3.png",
  "/uploads/1772020699369-dcb2cc2a-0ebf-4c8e-b4f4-4f686878b635.png",
  "/uploads/1772020819360-1436ad20-4a7e-4900-97b7-479d332f7ca5.png",
  "/uploads/1772020819361-1bd8ac4f-84f1-44fb-9113-0a971b8aa6d5.png",
  "/uploads/1772020895608-936add93-af7e-4882-896e-7f6db98a5de6.png",
  "/uploads/1772020895609-ffdaf8bc-f878-413a-beff-ae55f00fc699.png",
] as const;

const neighborhoodKey = (city: string, district: string, name: string) =>
  `${city}|${district}|${name}`;

type SeedPost = {
  authorEmail: string;
  title: string;
  content: string;
  type: PostType;
  scope: PostScope;
  communitySlug?: string;
  neighborhoodIdKey?: string;
  animalTags?: string[];
  reviewCategory?: ReviewCategory;
  imageUrls?: string[];
  viewCount: number;
  likeCount: number;
  hospitalReview?: Prisma.HospitalReviewCreateWithoutPostInput;
  placeReview?: Prisma.PlaceReviewCreateWithoutPostInput;
  walkRoute?: Prisma.WalkRouteCreateWithoutPostInput;
  marketListing?: Prisma.MarketListingCreateWithoutPostInput;
  adoptionListing?: Prisma.AdoptionListingCreateWithoutPostInput;
  volunteerRecruitment?: Prisma.VolunteerRecruitmentCreateWithoutPostInput;
  meetup?: Prisma.MeetupCreateWithoutPostInput;
  qaQuestion?: Prisma.QaQuestionCreateWithoutPostInput;
};

type LookupMaps = {
  authorIdByEmail: Map<string, string>;
  neighborhoodIdByKey: Map<string, string>;
  communityIdBySlug: Map<string, string>;
};

function imageAt(index: number) {
  return [imagePool[index % imagePool.length]];
}

function nowMinusHours(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

const seedPosts: SeedPost[] = [
  {
    authorEmail: "dog.parent@townpet.dev",
    title: "정자동 아침 산책 인원 모아봐요",
    content: "평일 7시 전후로 정자동 탄천 쪽 산책 같이 하실 분 있나요? 소형견도 편하게 걸을 수 있는 속도로 맞출 예정입니다.",
    type: PostType.FREE_BOARD,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("성남", "분당구", "정자동"),
    viewCount: 42,
    likeCount: 6,
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "망원동 야간 응급병원 다녀오신 분 후기 궁금해요",
    content: "고양이가 갑자기 토를 해서 혹시 야간 응급 대응 괜찮았던 병원 있으시면 경험 공유 부탁드립니다.",
    type: PostType.FREE_BOARD,
    scope: PostScope.LOCAL,
    communitySlug: "cats",
    neighborhoodIdKey: neighborhoodKey("서울", "마포구", "망원동"),
    viewCount: 35,
    likeCount: 4,
  },
  {
    authorEmail: "multi.pet.family@townpet.dev",
    title: "탄방동 반려동물 동반 가능한 실내 장소 추천 받아요",
    content: "이번 주말 비 예보가 있어서 실내 위주로 움직이려 합니다. 강아지랑 고양이 모두 무리 없는 곳이면 더 좋습니다.",
    type: PostType.FREE_BOARD,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("대전", "서구", "탄방동"),
    viewCount: 29,
    likeCount: 3,
  },
  {
    authorEmail: "qa.helper@townpet.dev",
    title: "초보 집사가 체크하면 좋은 첫 주 준비물 정리",
    content: "사료, 화장실, 이동장만 챙기면 끝일 줄 알았는데 은근 놓치기 쉬운 물품이 많더라고요. 제가 정리한 목록 공유합니다.",
    type: PostType.FREE_BOARD,
    scope: PostScope.GLOBAL,
    communitySlug: "cats",
    viewCount: 57,
    likeCount: 8,
  },
  {
    authorEmail: "power.reviewer@townpet.dev",
    title: "알러지 사료 바꾼 지 2주차 변화 기록",
    content: "눈물자국과 긁는 빈도가 줄어든 편이라 비슷한 고민 있는 분들께 참고가 될까 해서 기록 남깁니다.",
    type: PostType.FREE_POST,
    scope: PostScope.GLOBAL,
    communitySlug: "dogs",
    viewCount: 61,
    likeCount: 7,
  },
  {
    authorEmail: "place.hunter@townpet.dev",
    title: "서울 서북권 펫프렌들리 카페 지도 만들고 있어요",
    content: "직접 다녀본 곳 위주로 정리 중인데, 최근 새로 생긴 곳 있으면 댓글로 제보 부탁드립니다.",
    type: PostType.FREE_POST,
    scope: PostScope.GLOBAL,
    communitySlug: "dogs",
    viewCount: 48,
    likeCount: 9,
  },
  {
    authorEmail: "route.runner@townpet.dev",
    title: "광안리 해변 산책 매너 타임 공유",
    content: "관광객 많은 시간대를 피하면 훨씬 쾌적해서 시간대별 체감 정리해봤습니다. 배변봉투 포인트도 같이 적어둘게요.",
    type: PostType.FREE_POST,
    scope: PostScope.GLOBAL,
    communitySlug: "dogs",
    viewCount: 45,
    likeCount: 5,
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "다묘가정에서 물그릇 몇 개 두시는지 궁금해요",
    content: "자동 급수기 하나와 일반 그릇 두 개를 쓰고 있는데 더 늘려야 하나 고민입니다. 실제 운영 팁이 궁금합니다.",
    type: PostType.FREE_POST,
    scope: PostScope.GLOBAL,
    communitySlug: "cats",
    viewCount: 39,
    likeCount: 4,
  },
  {
    authorEmail: "dog.parent@townpet.dev",
    title: "오늘 비 와서 실내 노즈워크만 했어요",
    content: "에너지 높은 강아지라 비 오는 날이 제일 어렵네요. 종이컵 간식 찾기만 세 판 했더니 지금은 곯아떨어졌습니다.",
    type: PostType.DAILY_SHARE,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("성남", "분당구", "정자동"),
    viewCount: 18,
    likeCount: 3,
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "새 스크래처 꺼내자마자 점령했네요",
    content: "설치하자마자 제일 높은 칸부터 차지했습니다. 생각보다 먼지 적고 공간도 덜 차지해서 만족합니다.",
    type: PostType.DAILY_SHARE,
    scope: PostScope.LOCAL,
    communitySlug: "cats",
    neighborhoodIdKey: neighborhoodKey("서울", "마포구", "망원동"),
    viewCount: 23,
    likeCount: 5,
  },
  {
    authorEmail: "multi.pet.family@townpet.dev",
    title: "주말에는 집에서 번갈아 놀아주기 성공",
    content: "강아지 산책 다녀온 뒤에는 고양이 장난감 타임으로 이어가니 집 분위기가 훨씬 안정적이었습니다.",
    type: PostType.DAILY_SHARE,
    scope: PostScope.GLOBAL,
    communitySlug: "dogs",
    viewCount: 27,
    likeCount: 4,
  },
  {
    authorEmail: "route.runner@townpet.dev",
    title: "광안동은 해 질 무렵 바람이 정말 좋네요",
    content: "저녁 6시쯤만 돼도 산책로 분위기가 달라집니다. 사진은 못 찍었지만 오늘 코스 정말 추천하고 싶어요.",
    type: PostType.DAILY_SHARE,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("부산", "수영구", "광안동"),
    viewCount: 16,
    likeCount: 2,
  },
  {
    authorEmail: "qa.helper@townpet.dev",
    title: "고양이 음수량 적을 때 가장 효과 본 방법이 뭔가요?",
    content: "습식 비중을 조금 늘렸지만 아직도 물 마시는 양이 적은 편입니다. 실제로 체감 좋았던 방법 알려주세요.",
    type: PostType.QA_QUESTION,
    scope: PostScope.GLOBAL,
    communitySlug: "cats",
    viewCount: 64,
    likeCount: 6,
    qaQuestion: {
      tags: ["음수량", "건강", "습식"],
    },
  },
  {
    authorEmail: "qa.helper@townpet.dev",
    title: "파충류 사육장 UVB 램프 교체 주기 어떻게 잡으세요?",
    content: "제조사 권장 주기 말고 실제 체감상 언제쯤 교체하는지 궁금합니다. 사용 시간 기준 팁이 있으면 좋겠습니다.",
    type: PostType.QA_QUESTION,
    scope: PostScope.GLOBAL,
    communitySlug: "reptiles",
    viewCount: 41,
    likeCount: 5,
    qaQuestion: {
      tags: ["UVB", "사육장", "램프"],
    },
  },
  {
    authorEmail: "dog.parent@townpet.dev",
    title: "소형견 겨울옷 사이즈 선택 팁 있을까요?",
    content: "가슴둘레 기준으로 사면 등이 짧고, 등길이 기준으로 사면 가슴이 낍니다. 브랜드별 차이도 큰 것 같아요.",
    type: PostType.QA_QUESTION,
    scope: PostScope.GLOBAL,
    communitySlug: "dogs",
    viewCount: 55,
    likeCount: 7,
    qaQuestion: {
      tags: ["겨울옷", "사이즈", "소형견"],
    },
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "다묘가정 자동화장실 적응 기간 얼마나 걸렸나요?",
    content: "한 아이는 바로 쓰는데 다른 아이는 아직 기존 화장실만 찾습니다. 단계적으로 바꾸는 팁 부탁드려요.",
    type: PostType.QA_QUESTION,
    scope: PostScope.GLOBAL,
    communitySlug: "cats",
    viewCount: 49,
    likeCount: 4,
    qaQuestion: {
      tags: ["화장실", "다묘", "자동화장실"],
    },
  },
  {
    authorEmail: "multi.pet.family@townpet.dev",
    title: "햄스터 케이지 환기와 보온을 같이 잡는 법이 궁금해요",
    content: "밤에는 춥고 낮에는 답답해 보여서 조절이 어렵습니다. 계절 바뀔 때 세팅 팁 있으신가요?",
    type: PostType.QA_QUESTION,
    scope: PostScope.GLOBAL,
    communitySlug: "small-pets",
    viewCount: 32,
    likeCount: 3,
    qaQuestion: {
      tags: ["햄스터", "보온", "환기"],
    },
  },
  {
    authorEmail: "hospital.geek@townpet.dev",
    title: "정자동 피부과 진료 상세 후기",
    content: "알러지성 피부염 진료로 방문했고, 원인 설명과 장기 관리법 안내가 꽤 구체적이었습니다.",
    type: PostType.HOSPITAL_REVIEW,
    scope: PostScope.GLOBAL,
    animalTags: ["강아지"],
    viewCount: 73,
    likeCount: 10,
    hospitalReview: {
      hospitalName: "분당 반짝동물의료센터",
      visitDate: nowMinusHours(72),
      treatmentType: "피부염 검사 및 약 처방",
      totalCost: 68000,
      waitTime: 22,
      rating: 5,
    },
  },
  {
    authorEmail: "power.reviewer@townpet.dev",
    title: "서초 야간 응급 진료 후기 남깁니다",
    content: "응급 상황이라 정신 없었는데 검사 순서와 비용 설명을 차분하게 해줘서 안심이 됐습니다.",
    type: PostType.HOSPITAL_REVIEW,
    scope: PostScope.GLOBAL,
    animalTags: ["고양이"],
    viewCount: 66,
    likeCount: 8,
    hospitalReview: {
      hospitalName: "서초 24시 응급동물병원",
      visitDate: nowMinusHours(108),
      treatmentType: "야간 응급검사",
      totalCost: 132000,
      waitTime: 35,
      rating: 4,
    },
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "연남동 치과 스케일링 상담 후기",
    content: "고양이 스케일링 전 마취 설명이 꼼꼼했고, 회복실 안내도 명확해서 만족했습니다.",
    type: PostType.HOSPITAL_REVIEW,
    scope: PostScope.GLOBAL,
    animalTags: ["고양이"],
    viewCount: 58,
    likeCount: 7,
    hospitalReview: {
      hospitalName: "연남 마음동물치과",
      visitDate: nowMinusHours(144),
      treatmentType: "치석 검사 및 스케일링 상담",
      totalCost: 40000,
      waitTime: 18,
      rating: 5,
    },
  },
  {
    authorEmail: "place.hunter@townpet.dev",
    title: "망원동 테라스 카페 반려견 동반 후기",
    content: "실내외 동선이 넓고 물그릇 요청도 바로 대응해줘서 재방문 의사 있습니다.",
    type: PostType.PLACE_REVIEW,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("서울", "마포구", "망원동"),
    viewCount: 37,
    likeCount: 6,
    placeReview: {
      placeName: "포포 테라스",
      placeType: "카페",
      address: "서울 마포구 망원동",
      isPetAllowed: true,
      rating: 5,
    },
  },
  {
    authorEmail: "place.hunter@townpet.dev",
    title: "수영동 애견동반 브런치 식당 메모",
    content: "테이블 간격이 넓고 직원분들이 반려견 응대에 익숙한 편입니다. 주말엔 예약이 필수 같아요.",
    type: PostType.PLACE_REVIEW,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("부산", "수영구", "수영동"),
    viewCount: 33,
    likeCount: 5,
    placeReview: {
      placeName: "브런치 하버",
      placeType: "브런치",
      address: "부산 수영구 수영동",
      isPetAllowed: true,
      rating: 4,
    },
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "정자동 조용한 반려묘 동반 스튜디오 방문기",
    content: "사진 촬영 예약 전 테스트 방문했는데 소음이 적고 동선이 단순해서 예민한 고양이도 버틸 만했습니다.",
    type: PostType.PLACE_REVIEW,
    scope: PostScope.LOCAL,
    communitySlug: "cats",
    neighborhoodIdKey: neighborhoodKey("성남", "분당구", "정자동"),
    viewCount: 21,
    likeCount: 3,
    placeReview: {
      placeName: "정자 포토룸",
      placeType: "스튜디오",
      address: "성남 분당구 정자동",
      isPetAllowed: true,
      rating: 4,
    },
  },
  {
    authorEmail: "route.runner@townpet.dev",
    title: "광안리 해변 우회 산책 코스 35분",
    content: "관광객이 많은 메인 동선을 피해서 천천히 걷기 좋은 코스입니다. 야간 조명이 잘 되어 있어 저녁 산책도 괜찮습니다.",
    type: PostType.WALK_ROUTE,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("부산", "수영구", "광안동"),
    viewCount: 52,
    likeCount: 8,
    walkRoute: {
      routeName: "광안 우회 코스",
      distance: 2.8,
      duration: 35,
      difficulty: RouteDifficulty.EASY,
      coordinates: [],
      hasStreetLights: true,
      hasRestroom: true,
      hasParkingLot: false,
      safetyTags: ["야간조명", "보행로분리"],
    },
  },
  {
    authorEmail: "route.runner@townpet.dev",
    title: "탄천 그늘 많은 오전 산책 루트",
    content: "해가 올라오기 전 빠르게 걷기 좋은 코스입니다. 중간중간 쉴 수 있는 벤치가 많아 여유 있게 돌기 좋습니다.",
    type: PostType.WALK_ROUTE,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("성남", "분당구", "정자동"),
    viewCount: 46,
    likeCount: 7,
    walkRoute: {
      routeName: "탄천 오전 코스",
      distance: 3.4,
      duration: 48,
      difficulty: RouteDifficulty.MODERATE,
      coordinates: [],
      hasStreetLights: true,
      hasRestroom: true,
      hasParkingLot: true,
      safetyTags: ["그늘많음", "급수대"],
    },
  },
  {
    authorEmail: "dog.parent@townpet.dev",
    title: "서초천 짧게 돌기 좋은 20분 코스",
    content: "출근 전 가볍게 돌 수 있는 짧은 코스입니다. 자전거 구간만 한 번 주의하면 전반적으로 무난합니다.",
    type: PostType.WALK_ROUTE,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("서울", "서초구", "서초동"),
    viewCount: 39,
    likeCount: 5,
    walkRoute: {
      routeName: "서초천 20분 코스",
      distance: 1.6,
      duration: 20,
      difficulty: RouteDifficulty.EASY,
      coordinates: [],
      hasStreetLights: true,
      hasRestroom: false,
      hasParkingLot: false,
      safetyTags: ["짧은코스", "출근전산책"],
    },
  },
  {
    authorEmail: "power.reviewer@townpet.dev",
    title: "눈물자국 케어 간식 2주 급여 후기",
    content: "기호성은 좋았고 배변 상태도 안정적이었습니다. 눈물량 변화는 천천히 보이는 편이라 중간 기록 남깁니다.",
    type: PostType.PRODUCT_REVIEW,
    scope: PostScope.GLOBAL,
    communitySlug: "dogs",
    reviewCategory: ReviewCategory.SNACK,
    viewCount: 70,
    likeCount: 11,
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "자동급수기 소음 적은 모델 후기",
    content: "밤에 틀어도 거슬리는 수준은 아니었고, 분해 세척이 쉬워서 유지 관리가 편했습니다.",
    type: PostType.PRODUCT_REVIEW,
    scope: PostScope.GLOBAL,
    communitySlug: "cats",
    reviewCategory: ReviewCategory.SUPPLIES,
    viewCount: 62,
    likeCount: 9,
  },
  {
    authorEmail: "multi.pet.family@townpet.dev",
    title: "햄스터 모래목욕통 교체 후기",
    content: "기존 플라스틱보다 정전기가 덜하고 세척도 쉬웠습니다. 크기는 생각보다 넉넉한 편입니다.",
    type: PostType.PRODUCT_REVIEW,
    scope: PostScope.GLOBAL,
    communitySlug: "small-pets",
    reviewCategory: ReviewCategory.SUPPLIES,
    viewCount: 31,
    likeCount: 4,
  },
  {
    authorEmail: "qa.helper@townpet.dev",
    title: "앵무새 포징 장난감 교체 후 반응",
    content: "처음에는 경계했지만 하루 정도 지나니 바로 관심을 보였습니다. 발성 스트레스가 조금 줄어든 느낌입니다.",
    type: PostType.PRODUCT_REVIEW,
    scope: PostScope.GLOBAL,
    communitySlug: "birds",
    reviewCategory: ReviewCategory.TOY,
    viewCount: 28,
    likeCount: 3,
  },
  {
    authorEmail: "dog.parent@townpet.dev",
    title: "오늘은 코코가 잔디밭에서 완전히 신났어요",
    content: "오랜만에 긴 리드줄 쓰고 뛰게 했더니 표정이 달라졌습니다. 사진은 몇 장 못 건졌지만 한 장은 꼭 남겨야 해서 올립니다.",
    type: PostType.PET_SHOWCASE,
    scope: PostScope.GLOBAL,
    communitySlug: "dogs",
    imageUrls: imageAt(0),
    viewCount: 80,
    likeCount: 15,
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "햇살 자리 선점한 우리집 치즈냥 자랑",
    content: "오후만 되면 저 자리를 기가 막히게 알아보고 먼저 가서 눕습니다. 오늘은 표정이 너무 좋아서 기록용으로 남겨요.",
    type: PostType.PET_SHOWCASE,
    scope: PostScope.GLOBAL,
    communitySlug: "cats",
    imageUrls: imageAt(1),
    viewCount: 76,
    likeCount: 14,
  },
  {
    authorEmail: "multi.pet.family@townpet.dev",
    title: "겁 많던 아이가 손 위에서 간식 받아먹었어요",
    content: "아직 완전한 핸들링은 어렵지만 확실히 거리감이 줄어든 게 느껴져서 뿌듯합니다.",
    type: PostType.PET_SHOWCASE,
    scope: PostScope.GLOBAL,
    communitySlug: "small-pets",
    imageUrls: imageAt(2),
    viewCount: 33,
    likeCount: 5,
  },
  {
    authorEmail: "qa.helper@townpet.dev",
    title: "앵무새 물놀이 첫 성공 기념샷",
    content: "그릇 바꾸고 위치를 옮겨줬더니 드디어 스스로 들어갔습니다. 깃 상태가 너무 귀여워서 바로 저장했어요.",
    type: PostType.PET_SHOWCASE,
    scope: PostScope.GLOBAL,
    communitySlug: "birds",
    imageUrls: imageAt(3),
    viewCount: 29,
    likeCount: 4,
  },
  {
    authorEmail: "market.scout@townpet.dev",
    title: "반자동 급식기 거의 새 것 양도합니다",
    content: "한 달 정도 사용했고 현재는 자동급식기로 바꿔서 내놓습니다. 박스와 여분 부속까지 같이 드립니다.",
    type: PostType.MARKET_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["고양이"],
    viewCount: 34,
    likeCount: 2,
    marketListing: {
      listingType: MarketType.SELL,
      price: 35000,
      condition: ItemCondition.LIKE_NEW,
      status: MarketStatus.AVAILABLE,
    },
  },
  {
    authorEmail: "market.scout@townpet.dev",
    title: "대형견 이동가방 하루 대여 구합니다",
    content: "검진 일정 때문에 이번 주 토요일만 잠깐 필요합니다. 분당이나 서초 쪽이면 직접 가지러 갈 수 있습니다.",
    type: PostType.MARKET_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["강아지"],
    viewCount: 27,
    likeCount: 1,
    marketListing: {
      listingType: MarketType.RENT,
      price: 15000,
      condition: ItemCondition.GOOD,
      depositAmount: 20000,
      rentalPeriod: "1일",
      status: MarketStatus.AVAILABLE,
    },
  },
  {
    authorEmail: "dog.parent@townpet.dev",
    title: "강아지 계단 논슬립 패드 공동구매 수요 조사",
    content: "미끄럼 방지 패드를 여러 장 사면 가격이 꽤 내려가서 지역 상관없이 수요 있으면 같이 주문하려고 합니다.",
    type: PostType.MARKET_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["강아지"],
    viewCount: 38,
    likeCount: 4,
    marketListing: {
      listingType: MarketType.SHARE,
      price: 12000,
      condition: ItemCondition.NEW,
      status: MarketStatus.AVAILABLE,
    },
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "원목 캣타워 예약 거래 중입니다",
    content: "부피가 커서 직접 가져가실 분만 부탁드립니다. 현재 한 분과 시간 조율 중이라 예약 상태로 올립니다.",
    type: PostType.MARKET_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["고양이"],
    viewCount: 22,
    likeCount: 1,
    marketListing: {
      listingType: MarketType.SELL,
      price: 50000,
      condition: ItemCondition.GOOD,
      status: MarketStatus.RESERVED,
    },
  },
  {
    authorEmail: "weekend.meetup@townpet.dev",
    title: "서초천 소형견 산책모임 이번 주 토요일",
    content: "공격성 없는 소형견 위주로 천천히 걷는 모임입니다. 처음 나오시는 분도 부담 없이 합류하실 수 있습니다.",
    type: PostType.MEETUP,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("서울", "서초구", "서초동"),
    viewCount: 31,
    likeCount: 4,
    meetup: {
      meetupDate: nowMinusHours(-24),
      location: "서초천 산책로 입구",
      maxParticipants: 8,
      currentCount: 3,
      status: MeetupStatus.OPEN,
    },
  },
  {
    authorEmail: "weekend.meetup@townpet.dev",
    title: "망원동 고양이 집사 수다모임 열어요",
    content: "실제 반려묘 사진과 정보 공유 위주로 가볍게 이야기 나누는 모임입니다. 입양 예정자도 환영합니다.",
    type: PostType.MEETUP,
    scope: PostScope.LOCAL,
    communitySlug: "cats",
    neighborhoodIdKey: neighborhoodKey("서울", "마포구", "망원동"),
    viewCount: 19,
    likeCount: 3,
    meetup: {
      meetupDate: nowMinusHours(-48),
      location: "망원 카페 거리",
      maxParticipants: 6,
      currentCount: 2,
      status: MeetupStatus.OPEN,
    },
  },
  {
    authorEmail: "route.runner@townpet.dev",
    title: "광안동 아침 러닝겸 산책 번개",
    content: "반려견 컨디션 맞춰 조깅과 걷기를 섞어 진행할 예정입니다. 리드 컨트롤 자신 있으신 분만 참여 부탁드립니다.",
    type: PostType.MEETUP,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("부산", "수영구", "광안동"),
    viewCount: 24,
    likeCount: 3,
    meetup: {
      meetupDate: nowMinusHours(-30),
      location: "광안리 해변 시계탑 앞",
      maxParticipants: 5,
      currentCount: 1,
      status: MeetupStatus.OPEN,
    },
  },
  {
    authorEmail: "multi.pet.family@townpet.dev",
    title: "초보 보호자 소규모 정보교류 모임 모집",
    content: "사료, 병원, 장난감, 기본 예절 등 초보 보호자가 궁금해하는 내용을 중심으로 이야기해보려 합니다.",
    type: PostType.MEETUP,
    scope: PostScope.LOCAL,
    communitySlug: "dogs",
    neighborhoodIdKey: neighborhoodKey("대전", "서구", "탄방동"),
    viewCount: 17,
    likeCount: 2,
    meetup: {
      meetupDate: nowMinusHours(-54),
      location: "탄방동 커뮤니티룸",
      maxParticipants: 10,
      currentCount: 4,
      status: MeetupStatus.OPEN,
    },
  },
  {
    authorEmail: "lostfound.alert@townpet.dev",
    title: "수영동 검정 하네스 착용한 소형견 목격",
    content: "오늘 오후 5시쯤 수영초등학교 근처에서 검정 하네스를 한 작은 강아지를 봤습니다. 주인을 찾는 분이 계실까 남깁니다.",
    type: PostType.LOST_FOUND,
    scope: PostScope.GLOBAL,
    animalTags: ["강아지"],
    viewCount: 44,
    likeCount: 2,
  },
  {
    authorEmail: "cat.parent@townpet.dev",
    title: "망원동 회색 줄무늬 고양이 찾는 전단 보신 분 있나요",
    content: "어제부터 게시판에 전단이 붙어 있는데 실제 목격 제보가 있었는지 궁금합니다. 밤 시간대에 보신 분 있으면 알려주세요.",
    type: PostType.LOST_FOUND,
    scope: PostScope.GLOBAL,
    animalTags: ["고양이"],
    viewCount: 37,
    likeCount: 3,
  },
  {
    authorEmail: "dog.parent@townpet.dev",
    title: "정자동 탄천 부근 유실물함 앞에서 반려견 보호 중이라는 안내 봤어요",
    content: "상세 사진은 없었지만 관리실에서 임시 보호 중이라는 내용을 봤습니다. 찾는 분 계시면 관리실 먼저 문의해보세요.",
    type: PostType.LOST_FOUND,
    scope: PostScope.GLOBAL,
    animalTags: ["강아지"],
    viewCount: 28,
    likeCount: 1,
  },
  {
    authorEmail: "qa.helper@townpet.dev",
    title: "대전 탄방동 갈색 토끼 목격 제보",
    content: "반려토끼로 보이는 아이가 공원 가장자리 풀숲에 있었습니다. 가까이 가면 피해서 사진은 못 남겼습니다.",
    type: PostType.LOST_FOUND,
    scope: PostScope.GLOBAL,
    animalTags: ["토끼"],
    viewCount: 26,
    likeCount: 1,
  },
  {
    authorEmail: "mod.local@townpet.dev",
    title: "광안동 주말 보호소 산책 봉사 모집",
    content: "기본 교육 후 산책 봉사 중심으로 진행합니다. 처음 참여하시는 분도 가능하며, 장갑과 배변봉투는 현장에서 제공합니다.",
    type: PostType.SHELTER_VOLUNTEER,
    scope: PostScope.GLOBAL,
    viewCount: 52,
    likeCount: 6,
    volunteerRecruitment: {
      shelterName: "광안 바다빛 보호소",
      region: "부산 수영구",
      volunteerDate: nowMinusHours(-36),
      volunteerType: "산책 봉사",
      capacity: 8,
      status: VolunteerRecruitmentStatus.OPEN,
    },
  },
  {
    authorEmail: "mod.content@townpet.dev",
    title: "연남동 고양이 방 청소 봉사 신청 받습니다",
    content: "오전 10시부터 2시간 정도 진행 예정이며, 알레르기 여부만 사전 확인하겠습니다. 초보자도 참여 가능합니다.",
    type: PostType.SHELTER_VOLUNTEER,
    scope: PostScope.GLOBAL,
    viewCount: 47,
    likeCount: 5,
    volunteerRecruitment: {
      shelterName: "연남 냥이쉼터",
      region: "서울 마포구",
      volunteerDate: nowMinusHours(-60),
      volunteerType: "청소 및 급식",
      capacity: 6,
      status: VolunteerRecruitmentStatus.OPEN,
    },
  },
  {
    authorEmail: "admin.ops@townpet.dev",
    title: "분당 보호소 주중 오후 사진 촬영 봉사",
    content: "입양 홍보용 사진 촬영과 간단한 프로필 기록을 도와주실 분을 찾습니다. 스마트폰 촬영도 가능합니다.",
    type: PostType.SHELTER_VOLUNTEER,
    scope: PostScope.GLOBAL,
    viewCount: 41,
    likeCount: 4,
    volunteerRecruitment: {
      shelterName: "분당 온기 보호센터",
      region: "성남 분당구",
      volunteerDate: nowMinusHours(-84),
      volunteerType: "사진 촬영",
      capacity: 4,
      status: VolunteerRecruitmentStatus.OPEN,
    },
  },
  {
    authorEmail: "mod.trust@townpet.dev",
    title: "대전 소동물 임시케어 보조 봉사 모집",
    content: "토끼와 햄스터 위주로 케이지 정리와 급여 보조를 담당합니다. 작은 동물 경험이 있으면 더 좋습니다.",
    type: PostType.SHELTER_VOLUNTEER,
    scope: PostScope.GLOBAL,
    viewCount: 33,
    likeCount: 3,
    volunteerRecruitment: {
      shelterName: "대전 작은숨 보호소",
      region: "대전 서구",
      volunteerDate: nowMinusHours(-96),
      volunteerType: "케이지 관리",
      capacity: 5,
      status: VolunteerRecruitmentStatus.OPEN,
    },
  },
  {
    authorEmail: "admin.platform@townpet.dev",
    title: "산책을 좋아하는 2살 믹스견 보리",
    content: "사람에게 친화적이고 산책 리듬이 안정적인 아이입니다. 기본 하네스 착용과 간단한 기다려 교육이 되어 있습니다.",
    type: PostType.ADOPTION_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["강아지"],
    imageUrls: imageAt(4),
    viewCount: 88,
    likeCount: 12,
    adoptionListing: {
      shelterName: "서초 함께걷개 보호소",
      region: "서울 서초구",
      animalType: "강아지",
      breed: "믹스견",
      ageLabel: "2살 추정",
      sex: AnimalSex.MALE,
      isNeutered: true,
      isVaccinated: true,
      sizeLabel: "중형",
      status: AdoptionStatus.OPEN,
    },
  },
  {
    authorEmail: "admin.ops@townpet.dev",
    title: "조용한 성격의 4개월령 고양이 구름",
    content: "낯가림은 조금 있지만 익숙해지면 스스로 다가오는 편입니다. 단독 가정이나 차분한 환경에 특히 잘 맞습니다.",
    type: PostType.ADOPTION_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["고양이"],
    imageUrls: imageAt(5),
    viewCount: 76,
    likeCount: 11,
    adoptionListing: {
      shelterName: "연남 포근쉼터",
      region: "서울 마포구",
      animalType: "고양이",
      breed: "코리안숏헤어",
      ageLabel: "4개월 추정",
      sex: AnimalSex.FEMALE,
      isNeutered: false,
      isVaccinated: true,
      sizeLabel: "소형",
      status: AdoptionStatus.OPEN,
    },
  },
  {
    authorEmail: "mod.trust@townpet.dev",
    title: "사람 손길을 좋아하는 1살 푸들 믹스 라떼",
    content: "기본 미용과 목욕에 큰 거부감이 없고, 실내 적응이 빠른 편입니다. 다른 개와의 합사는 천천히 보는 것이 좋습니다.",
    type: PostType.ADOPTION_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["강아지"],
    imageUrls: imageAt(6),
    viewCount: 69,
    likeCount: 10,
    adoptionListing: {
      shelterName: "분당 새봄 보호소",
      region: "성남 분당구",
      animalType: "강아지",
      breed: "푸들 믹스",
      ageLabel: "1살 추정",
      sex: AnimalSex.FEMALE,
      isNeutered: true,
      isVaccinated: true,
      sizeLabel: "소형",
      status: AdoptionStatus.RESERVED,
    },
  },
  {
    authorEmail: "admin.platform@townpet.dev",
    title: "햇살 좋아하는 치즈냥 호두 가족 찾습니다",
    content: "창가 자리를 좋아하고 낚싯대 장난감 반응이 매우 좋습니다. 초반 적응 기간만 지나면 사람 곁에서 쉬는 편입니다.",
    type: PostType.ADOPTION_LISTING,
    scope: PostScope.GLOBAL,
    animalTags: ["고양이"],
    imageUrls: imageAt(7),
    viewCount: 64,
    likeCount: 9,
    adoptionListing: {
      shelterName: "망원 다정묘 쉼터",
      region: "서울 마포구",
      animalType: "고양이",
      breed: "코리안숏헤어",
      ageLabel: "2살 추정",
      sex: AnimalSex.MALE,
      isNeutered: true,
      isVaccinated: true,
      sizeLabel: "소형",
      status: AdoptionStatus.OPEN,
    },
  },
];

async function ensureNeighborhoods() {
  const map = new Map<string, string>();

  for (const neighborhood of neighborhoods) {
    const item = await prisma.neighborhood.upsert({
      where: {
        name_city_district: {
          name: neighborhood.name,
          city: neighborhood.city,
          district: neighborhood.district,
        },
      },
      update: {},
      create: neighborhood,
      select: { id: true, city: true, district: true, name: true },
    });
    map.set(neighborhoodKey(item.city, item.district, item.name), item.id);
  }

  return map;
}

async function ensureCommunities() {
  const categoryIdBySlug = new Map<string, string>();

  for (const category of communityCategories) {
    const item = await prisma.communityCategory.upsert({
      where: { slug: category.slug },
      update: {
        labelKo: category.labelKo,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        slug: category.slug,
        labelKo: category.labelKo,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      select: { id: true, slug: true },
    });
    categoryIdBySlug.set(item.slug, item.id);
  }

  const communityIdBySlug = new Map<string, string>();

  for (const community of communities) {
    const categoryId = categoryIdBySlug.get(community.categorySlug);
    if (!categoryId) {
      continue;
    }

    const item = await prisma.community.upsert({
      where: { slug: community.slug },
      update: {
        categoryId,
        labelKo: community.labelKo,
        sortOrder: community.sortOrder,
        isActive: true,
        tags: [...community.tags],
        defaultPostTypes: [...community.defaultPostTypes],
      },
      create: {
        slug: community.slug,
        categoryId,
        labelKo: community.labelKo,
        sortOrder: community.sortOrder,
        isActive: true,
        tags: [...community.tags],
        defaultPostTypes: [...community.defaultPostTypes],
      },
      select: { id: true, slug: true },
    });
    communityIdBySlug.set(item.slug, item.id);
  }

  return communityIdBySlug;
}

async function ensureAuthors() {
  const map = new Map<string, string>();

  for (const author of authors) {
    const user = await prisma.user.upsert({
      where: { email: author.email },
      update: {
        nickname: author.nickname,
        role: author.role,
        emailVerified: new Date(),
      },
      create: {
        email: author.email,
        nickname: author.nickname,
        role: author.role,
        emailVerified: new Date(),
      },
      select: { id: true, email: true },
    });
    map.set(user.email, user.id);
  }

  return map;
}

function resolveCommunityId(seedPost: SeedPost, communityIdBySlug: Map<string, string>) {
  if (!seedPost.communitySlug) {
    return null;
  }
  return communityIdBySlug.get(seedPost.communitySlug) ?? null;
}

function resolveNeighborhoodId(seedPost: SeedPost, neighborhoodIdByKey: Map<string, string>) {
  if (seedPost.scope !== PostScope.LOCAL || !seedPost.neighborhoodIdKey) {
    return null;
  }
  return neighborhoodIdByKey.get(seedPost.neighborhoodIdKey) ?? null;
}

async function createSeedPost(seedPost: SeedPost, lookupMaps: LookupMaps, index: number) {
  const authorId = lookupMaps.authorIdByEmail.get(seedPost.authorEmail);
  if (!authorId) {
    throw new Error(`author not found for seed post: ${seedPost.authorEmail}`);
  }

  const existing = await prisma.post.findFirst({
    where: {
      authorId,
      type: seedPost.type,
      title: seedPost.title,
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  const board = resolveBoardByPostType(seedPost.type);
  const createdAt = nowMinusHours(4 + index * 3);
  const petTypeId =
    board.boardScope === "COMMUNITY"
      ? resolveCommunityId(seedPost, lookupMaps.communityIdBySlug)
      : null;
  const neighborhoodId = resolveNeighborhoodId(seedPost, lookupMaps.neighborhoodIdByKey);
  const commonBoardType =
    board.commonBoardType === null ? undefined : board.commonBoardType;

  await prisma.post.create({
    data: {
      title: seedPost.title,
      content: seedPost.content,
      type: seedPost.type,
      scope: seedPost.scope,
      boardScope: board.boardScope,
      commonBoardType,
      petTypeId,
      neighborhoodId,
      authorId,
      animalTags: seedPost.animalTags ?? [],
      reviewCategory: seedPost.reviewCategory,
      viewCount: seedPost.viewCount,
      likeCount: seedPost.likeCount,
      commentCount: 0,
      createdAt,
      updatedAt: createdAt,
      ...(seedPost.imageUrls && seedPost.imageUrls.length > 0
        ? {
            images: {
              create: seedPost.imageUrls.map((url, imageIndex) => ({
                url,
                order: imageIndex,
              })),
            },
          }
        : {}),
      ...(seedPost.hospitalReview
        ? {
            hospitalReview: {
              create: seedPost.hospitalReview,
            },
          }
        : {}),
      ...(seedPost.placeReview
        ? {
            placeReview: {
              create: seedPost.placeReview,
            },
          }
        : {}),
      ...(seedPost.walkRoute
        ? {
            walkRoute: {
              create: seedPost.walkRoute,
            },
          }
        : {}),
      ...(seedPost.marketListing
        ? {
            marketListing: {
              create: seedPost.marketListing,
            },
          }
        : {}),
      ...(seedPost.adoptionListing
        ? {
            adoptionListing: {
              create: seedPost.adoptionListing,
            },
          }
        : {}),
      ...(seedPost.volunteerRecruitment
        ? {
            volunteerRecruitment: {
              create: seedPost.volunteerRecruitment,
            },
          }
        : {}),
      ...(seedPost.meetup
        ? {
            meetup: {
              create: seedPost.meetup,
            },
          }
        : {}),
      ...(seedPost.qaQuestion
        ? {
            qaQuestion: {
              create: seedPost.qaQuestion,
            },
          }
        : {}),
    },
  });

  return true;
}

async function main() {
  const [authorIdByEmail, neighborhoodIdByKey, communityIdBySlug] = await Promise.all([
    ensureAuthors(),
    ensureNeighborhoods(),
    ensureCommunities(),
  ]);

  const lookupMaps: LookupMaps = {
    authorIdByEmail,
    neighborhoodIdByKey,
    communityIdBySlug,
  };

  const createdCountByType = new Map<PostType, number>();
  let createdCount = 0;

  for (const [index, seedPost] of seedPosts.entries()) {
    const created = await createSeedPost(seedPost, lookupMaps, index);
    if (!created) {
      continue;
    }

    createdCount += 1;
    createdCountByType.set(
      seedPost.type,
      (createdCountByType.get(seedPost.type) ?? 0) + 1,
    );
  }

  console.log(
    JSON.stringify(
      {
        createdCount,
        createdCountByType: Object.fromEntries(createdCountByType.entries()),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("seed board posts failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
