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
import { buildPostStructuredSearchText } from "../src/lib/post-structured-search";
import {
  buildDemoAccountEmail,
  resolveDemoContentSeedConfig,
  type DemoContentSeedMode,
} from "../src/server/demo-content-seeding";

const prisma = new PrismaClient();

const DEMO_AUTHOR_SPECS = [
  {
    key: "center",
    localPart: "sample-center",
    nickname: "샘플·입양센터",
    role: UserRole.ADMIN,
    avatarSeed: "sample-center",
    bio: "TownPet 공개 화면 예시용 샘플 운영 계정입니다.",
  },
  {
    key: "maru",
    localPart: "sample-maru",
    nickname: "샘플·마루집사",
    role: UserRole.USER,
    avatarSeed: "sample-maru",
    bio: "TownPet 공개 화면 예시용 샘플 계정입니다.",
  },
  {
    key: "bori",
    localPart: "sample-bori",
    nickname: "샘플·보리보호자",
    role: UserRole.USER,
    avatarSeed: "sample-bori",
    bio: "TownPet 공개 화면 예시용 샘플 계정입니다.",
  },
  {
    key: "nabi",
    localPart: "sample-nabi",
    nickname: "샘플·나비메모",
    role: UserRole.USER,
    avatarSeed: "sample-nabi",
    bio: "TownPet 공개 화면 예시용 샘플 계정입니다.",
  },
  {
    key: "coco",
    localPart: "sample-coco",
    nickname: "샘플·코코랑산책",
    role: UserRole.USER,
    avatarSeed: "sample-coco",
    bio: "TownPet 공개 화면 예시용 샘플 계정입니다.",
  },
  {
    key: "hari",
    localPart: "sample-hari",
    nickname: "샘플·하리후기",
    role: UserRole.USER,
    avatarSeed: "sample-hari",
    bio: "TownPet 공개 화면 예시용 샘플 계정입니다.",
  },
  {
    key: "dori",
    localPart: "sample-dori",
    nickname: "샘플·도리장터",
    role: UserRole.USER,
    avatarSeed: "sample-dori",
    bio: "TownPet 공개 화면 예시용 샘플 계정입니다.",
  },
] as const;

type DemoAuthorKey = (typeof DEMO_AUTHOR_SPECS)[number]["key"];

const DEMO_COMMUNITY_SPECS = [
  {
    key: "dogs",
    categorySlug: "companion",
    categoryLabelKo: "반려동물",
    slug: "dogs",
    labelKo: "강아지",
    sortOrder: 1,
    tags: ["산책", "건강", "일상"],
    defaultPostTypes: [
      PostType.FREE_BOARD,
      PostType.FREE_POST,
      PostType.DAILY_SHARE,
      PostType.PET_SHOWCASE,
      PostType.PRODUCT_REVIEW,
      PostType.QA_QUESTION,
      PostType.MEETUP,
    ],
  },
  {
    key: "cats",
    categorySlug: "companion",
    categoryLabelKo: "반려동물",
    slug: "cats",
    labelKo: "고양이",
    sortOrder: 2,
    tags: ["장난감", "병원", "돌봄"],
    defaultPostTypes: [
      PostType.FREE_BOARD,
      PostType.FREE_POST,
      PostType.DAILY_SHARE,
      PostType.PET_SHOWCASE,
      PostType.PRODUCT_REVIEW,
      PostType.QA_QUESTION,
    ],
  },
] as const;

type DemoCommunityKey = (typeof DEMO_COMMUNITY_SPECS)[number]["key"];

const DEMO_NEIGHBORHOODS = [
  { key: "mangwon", city: "서울특별시", district: "마포구", name: "망원동" },
  { key: "seocho", city: "서울특별시", district: "서초구", name: "서초동" },
  { key: "bundang", city: "경기도", district: "성남시 분당구", name: "정자동" },
] as const;

type DemoNeighborhoodKey = (typeof DEMO_NEIGHBORHOODS)[number]["key"];

type DemoReactionSpec = {
  likeBy?: DemoAuthorKey[];
  dislikeBy?: DemoAuthorKey[];
};

type DemoCommentSpec = {
  author: DemoAuthorKey;
  content: string;
  minutesAfter: number;
  reactions?: DemoReactionSpec;
  replies?: DemoCommentSpec[];
};

type DemoPostSpec = {
  author: DemoAuthorKey;
  title: string;
  content: string;
  type: PostType;
  scope: PostScope;
  createdHoursAgo: number;
  viewCount: number;
  communityKey?: DemoCommunityKey;
  neighborhoodKey?: DemoNeighborhoodKey;
  animalTags?: string[];
  reviewCategory?: ReviewCategory;
  imageSeeds?: string[];
  hospitalReview?: Prisma.HospitalReviewCreateWithoutPostInput;
  placeReview?: Prisma.PlaceReviewCreateWithoutPostInput;
  walkRoute?: Prisma.WalkRouteCreateWithoutPostInput;
  marketListing?: Prisma.MarketListingCreateWithoutPostInput;
  adoptionListing?: Prisma.AdoptionListingCreateWithoutPostInput;
  volunteerRecruitment?: Prisma.VolunteerRecruitmentCreateWithoutPostInput;
  meetup?: Prisma.MeetupCreateWithoutPostInput;
  qaQuestion?: Prisma.QaQuestionCreateWithoutPostInput;
};

const DEMO_POST_SPECS: DemoPostSpec[] = [
  {
    author: "maru",
    title: "서초동 아침 산책 같이 다니실 분 있나요",
    content:
      "평일 오전 7시쯤 가볍게 돌 수 있는 산책 메이트를 찾고 있어요. 소형견 기준으로 천천히 걷는 코스로 생각하고 있습니다.",
    type: PostType.FREE_BOARD,
    scope: PostScope.LOCAL,
    createdHoursAgo: 3,
    viewCount: 84,
    neighborhoodKey: "seocho",
    communityKey: "dogs",
    animalTags: ["강아지", "산책"],
  },
  {
    author: "bori",
    title: "고양이 자동급식기 일주일 사용 후기 공유해요",
    content:
      "출근 시간에 맞춰 소량 급여를 여러 번 나눠주고 있는데, 적응이 생각보다 빨랐어요. 소리와 세척 편의성까지 적어봅니다.",
    type: PostType.FREE_POST,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 8,
    viewCount: 118,
    communityKey: "cats",
    animalTags: ["고양이", "자동급식기"],
  },
  {
    author: "nabi",
    title: "망원한강공원 벚꽃 산책 사진 한 장 남기고 가요",
    content:
      "바람이 살짝 있었지만 사람도 강아지도 많지 않아서 걷기 좋았어요. 해 질 무렵 조도가 좋아서 사진도 잘 나왔습니다.",
    type: PostType.DAILY_SHARE,
    scope: PostScope.LOCAL,
    createdHoursAgo: 12,
    viewCount: 72,
    neighborhoodKey: "mangwon",
    communityKey: "dogs",
    animalTags: ["강아지", "산책"],
    imageSeeds: ["daily-share-mangwon"],
  },
  {
    author: "coco",
    title: "첫 목욕 끝내고 포근해진 코코 자랑합니다",
    content:
      "목욕하고 나서 바로 낮잠 들어간 모습이 너무 귀여워서 기록용으로 남겨요. 다음엔 드라이 팁도 정리해볼게요.",
    type: PostType.PET_SHOWCASE,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 18,
    viewCount: 146,
    communityKey: "dogs",
    animalTags: ["강아지", "자랑"],
    imageSeeds: ["pet-showcase-coco"],
  },
  {
    author: "hari",
    title: "흡수형 패드 교체 주기 짧아지는 제품 찾는 분께 추천",
    content:
      "냄새 억제력이 괜찮고 사이즈가 넉넉한 편이라 다견 가정에서 쓰기 좋았습니다. 하루 기준 몇 장 쓰는지도 같이 적어둘게요.",
    type: PostType.PRODUCT_REVIEW,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 26,
    viewCount: 94,
    communityKey: "dogs",
    animalTags: ["강아지", "용품"],
    reviewCategory: ReviewCategory.SUPPLIES,
  },
  {
    author: "bori",
    title: "건강 검진에서 ALT 수치 살짝 높게 나오면 바로 식단 바꿔야 할까요",
    content:
      "큰 이상 소견은 아니라고 들었지만 수치가 처음이라 조금 걱정됩니다. 식단 조정이나 추가로 체크한 항목이 있으면 알려주세요.",
    type: PostType.QA_QUESTION,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 30,
    viewCount: 111,
    communityKey: "cats",
    animalTags: ["고양이", "건강"],
    qaQuestion: {
      tags: ["건강 검진", "혈액 검사", "식단"],
      answerCount: 0,
    },
  },
  {
    author: "hari",
    title: "24시 강동동물의료원 야간 건강 검진 상담은 빨랐어요",
    content:
      "대기 시간이 길지 않았고, 기본 검사 항목 설명이 차분해서 새벽 방문치고는 안정감이 있었습니다. 비용과 대기 시간도 남깁니다.",
    type: PostType.HOSPITAL_REVIEW,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 34,
    viewCount: 132,
    animalTags: ["강아지"],
    hospitalReview: {
      hospitalName: "강동24시동물의료원",
      treatmentType: "건강 검진",
      totalCost: 85000,
      waitTime: 18,
      rating: 5,
    },
  },
  {
    author: "nabi",
    title: "연남동 반려동물 동반 브런치 카페 후기 남겨요",
    content:
      "소형견 동반 좌석이 따로 있었고, 물그릇 요청도 친절하게 응대해주셨어요. 주말 오픈 직후에 가면 조금 더 여유로웠습니다.",
    type: PostType.PLACE_REVIEW,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 40,
    viewCount: 101,
    animalTags: ["강아지"],
    placeReview: {
      placeName: "연남 브런치 하우스",
      placeType: "카페",
      address: "서울특별시 마포구 연남동",
      isPetAllowed: true,
      rating: 4,
    },
  },
  {
    author: "coco",
    title: "분당 탄천 35분 산책 코스, 가로등이 많아 저녁에도 괜찮아요",
    content:
      "초보 보호자도 무리 없이 돌 수 있는 평지 위주 코스예요. 화장실과 편의점이 가까워서 물 챙기기도 편했습니다.",
    type: PostType.WALK_ROUTE,
    scope: PostScope.LOCAL,
    createdHoursAgo: 48,
    viewCount: 128,
    neighborhoodKey: "bundang",
    communityKey: "dogs",
    animalTags: ["강아지", "산책 코스"],
    walkRoute: {
      routeName: "탄천 저녁 산책 루프",
      distance: 2.8,
      duration: 35,
      difficulty: RouteDifficulty.EASY,
      coordinates: [
        { lat: 37.3647, lng: 127.1086 },
        { lat: 37.3658, lng: 127.1112 },
        { lat: 37.3644, lng: 127.1135 },
      ] satisfies Prisma.InputJsonValue,
      hasStreetLights: true,
      hasRestroom: true,
      hasParkingLot: false,
      safetyTags: ["가로등 많음", "유모차 가능"],
    },
  },
  {
    author: "dori",
    title: "펫드라이룸 상태 좋은 중고로 내놓아요",
    content:
      "실사용은 6개월 정도였고 필터 교체 후 보관해뒀습니다. 직거래 선호하고, 사용 영상은 요청 주시면 보내드릴게요.",
    type: PostType.MARKET_LISTING,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 54,
    viewCount: 97,
    animalTags: ["강아지", "용품"],
    marketListing: {
      listingType: MarketType.SELL,
      price: 120000,
      condition: ItemCondition.GOOD,
      status: MarketStatus.AVAILABLE,
    },
  },
  {
    author: "dori",
    title: "이동가방 하루 대여 필요하신 분 계실까요",
    content:
      "병원 이동용으로 잠깐 필요하신 분께 하루 단위로 공유 가능합니다. 분당/서초 쪽이면 일정 맞춰 전달드릴게요.",
    type: PostType.MARKET_LISTING,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 60,
    viewCount: 64,
    animalTags: ["고양이", "이동가방"],
    marketListing: {
      listingType: MarketType.RENT,
      price: 15000,
      depositAmount: 30000,
      rentalPeriod: "1일",
      condition: ItemCondition.LIKE_NEW,
      status: MarketStatus.AVAILABLE,
    },
  },
  {
    author: "maru",
    title: "이번 토요일 서초동 반려인 소규모 모임 열어요",
    content:
      "산책 후 커피 한 잔 하면서 동네 병원·카페 정보 나누는 가벼운 모임입니다. 처음 오셔도 부담 없는 소규모로 진행할게요.",
    type: PostType.MEETUP,
    scope: PostScope.LOCAL,
    createdHoursAgo: 66,
    viewCount: 88,
    neighborhoodKey: "seocho",
    communityKey: "dogs",
    animalTags: ["강아지", "모임"],
    meetup: {
      meetupDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      location: "서울특별시 서초구 서리풀공원 입구",
      maxParticipants: 8,
      currentCount: 4,
      status: MeetupStatus.OPEN,
    },
  },
  {
    author: "center",
    title: "사람을 잘 따르는 2살 믹스견 코코 가족을 찾고 있어요",
    content:
      "실내 적응이 빠르고 산책 리드 훈련도 순하게 따라오는 아이입니다. 첫 만남 이후 보호소 상담 일정도 빠르게 잡아드릴 수 있어요.",
    type: PostType.ADOPTION_LISTING,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 72,
    viewCount: 162,
    animalTags: ["강아지"],
    imageSeeds: ["adoption-coco"],
    adoptionListing: {
      shelterName: "강동 해피테일 보호소",
      region: "서울특별시 강동구",
      animalType: "강아지",
      breed: "믹스견",
      ageLabel: "2살 추정",
      sex: AnimalSex.FEMALE,
      isNeutered: true,
      isVaccinated: true,
      sizeLabel: "중형",
      status: AdoptionStatus.OPEN,
    },
  },
  {
    author: "center",
    title: "차분한 성격의 치즈 고양이 마루, 1묘 가정에 잘 맞아요",
    content:
      "낯가림은 조금 있지만 익숙해지면 손을 먼저 내미는 아이입니다. 소란한 환경보다 안정적인 가정에서 더 편안해합니다.",
    type: PostType.ADOPTION_LISTING,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 78,
    viewCount: 149,
    animalTags: ["고양이"],
    imageSeeds: ["adoption-maru"],
    adoptionListing: {
      shelterName: "마포 냥이쉼터",
      region: "서울특별시 마포구",
      animalType: "고양이",
      breed: "코리안숏헤어",
      ageLabel: "3살 추정",
      sex: AnimalSex.MALE,
      isNeutered: true,
      isVaccinated: true,
      sizeLabel: "소형",
      status: AdoptionStatus.OPEN,
    },
  },
  {
    author: "center",
    title: "활동량 많은 1살 진도 믹스 모카, 산책 좋아하는 보호자 찾습니다",
    content:
      "사람을 무서워하지 않고 에너지가 좋아 활동량 있는 보호자와 잘 맞습니다. 산책 예절 훈련도 꾸준히 배우는 중입니다.",
    type: PostType.ADOPTION_LISTING,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 84,
    viewCount: 121,
    animalTags: ["강아지"],
    imageSeeds: ["adoption-moka"],
    adoptionListing: {
      shelterName: "수영 온기동물보호센터",
      region: "부산광역시 수영구",
      animalType: "강아지",
      breed: "진도 믹스",
      ageLabel: "1살 추정",
      sex: AnimalSex.MALE,
      isNeutered: false,
      isVaccinated: true,
      sizeLabel: "중대형",
      status: AdoptionStatus.RESERVED,
    },
  },
  {
    author: "center",
    title: "주말 산책 봉사자 모집, 2시간만 함께해도 큰 도움이 됩니다",
    content:
      "입소 초기 아이들 산책과 케이지 정리 위주로 진행합니다. 처음 오시는 분도 바로 참여할 수 있게 현장에서 안내드려요.",
    type: PostType.SHELTER_VOLUNTEER,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 92,
    viewCount: 106,
    animalTags: ["강아지", "봉사"],
    volunteerRecruitment: {
      shelterName: "서초 포포 보호센터",
      region: "서울특별시 서초구",
      volunteerDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      volunteerType: "산책",
      capacity: 8,
      status: VolunteerRecruitmentStatus.OPEN,
    },
  },
  {
    author: "center",
    title: "사진 촬영 봉사 모집, 입양 공고용 프로필 사진이 필요해요",
    content:
      "아이들 입양 공고에 사용할 기본 프로필 사진을 찍는 일정입니다. 휴대폰 촬영도 가능하고, 현장 코디는 보호소에서 준비합니다.",
    type: PostType.SHELTER_VOLUNTEER,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 98,
    viewCount: 93,
    animalTags: ["고양이", "봉사"],
    volunteerRecruitment: {
      shelterName: "연남 포포 보호실",
      region: "서울특별시 마포구",
      volunteerDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      volunteerType: "사진 촬영",
      capacity: 5,
      status: VolunteerRecruitmentStatus.OPEN,
    },
  },
];

function buildLostFoundSpec(): DemoPostSpec {
  return {
    author: "center",
    title: "[샘플 안내] 실종/목격 게시판은 실제 제보만 등록해 주세요",
    content:
      "이 게시글은 화면 구성 확인을 위한 예시입니다. 실제 운영에서는 실종/목격 게시판에 검증되지 않은 샘플 제보를 올리지 않습니다.",
    type: PostType.LOST_FOUND,
    scope: PostScope.GLOBAL,
    createdHoursAgo: 6,
    viewCount: 38,
    animalTags: ["안내"],
  };
}

type CleanupResult = {
  deletedPosts: number;
  deletedUsers: number;
};

type SeedResult = CleanupResult & {
  upsertedUsers: number;
  createdPosts: number;
  skippedPosts: number;
  createdComments: number;
  createdPostReactions: number;
  createdCommentReactions: number;
};

function buildAvatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
}

function buildPostImageUrl(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function toStringArray(
  value:
    | readonly string[]
    | {
        set?: readonly string[] | null;
      }
    | null
    | undefined,
) {
  return Array.isArray(value) ? [...value] : [];
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function minutesAfter(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function rotate<T>(items: readonly T[], offset: number) {
  if (items.length === 0) {
    return [];
  }

  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return items.slice(normalizedOffset).concat(items.slice(0, normalizedOffset));
}

function pickParticipantKeys(
  excludedKeys: Iterable<DemoAuthorKey>,
  offset: number,
  count: number,
) {
  const excluded = new Set(excludedKeys);
  return rotate(
    DEMO_AUTHOR_SPECS.map((author) => author.key),
    offset,
  ).filter((key) => !excluded.has(key)).slice(0, count);
}

function buildCommonComments(
  post: DemoPostSpec,
  index: number,
): DemoCommentSpec[] {
  const participants = pickParticipantKeys([post.author], index * 2, 3);
  const [primary, secondary, tertiary] = participants;
  if (!primary || !secondary || !tertiary) {
    return [];
  }

  const rootLead = (() => {
    switch (post.type) {
      case PostType.QA_QUESTION:
        return "같은 항목으로 상담받았던 경험 기준으로 보면";
      case PostType.HOSPITAL_REVIEW:
        return "병원 대응 속도만 보면";
      case PostType.PLACE_REVIEW:
        return "실내 동반 좌석 기준으로 보면";
      case PostType.WALK_ROUTE:
        return "저녁 산책 기준으로는";
      case PostType.MARKET_LISTING:
        return "거래 조건만 보면";
      case PostType.ADOPTION_LISTING:
        return "아이 성격 설명을 읽어보니";
      case PostType.SHELTER_VOLUNTEER:
        return "봉사 일정 기준으로 보면";
      case PostType.MEETUP:
        return "첫 참여자 입장에서는";
      case PostType.PET_SHOWCASE:
        return "표정이 정말 안정적이라";
      default:
        return "글 정리 방식 기준으로 보면";
    }
  })();

  return [
    {
      author: primary,
      content: `${rootLead} 도움이 되는 정보가 많네요. ${post.title.slice(0, 18)} 관련 경험 있는 분이 더 모이면 좋겠어요.`,
      minutesAfter: 26,
      reactions: {
        likeBy: pickParticipantKeys([post.author, primary], index + 1, 2),
      },
      replies: [
        {
          author: tertiary,
          content:
            "저도 비슷한 조건에서 확인했는데 큰 차이 없이 괜찮았습니다. 추가 후기 올라오면 같이 참고해볼게요.",
          minutesAfter: 54,
          reactions: {
            likeBy: pickParticipantKeys([post.author, primary, tertiary], index + 4, 1),
          },
        },
      ],
    },
    {
      author: secondary,
      content:
        post.type === PostType.QA_QUESTION
          ? "수치 변화만 보고 바로 식단을 바꾸기보다, 재검 시점과 다른 검사 항목을 같이 보는 편이 마음이 편했습니다."
          : "실제로 써본 분 후기까지 이어지면 더 도움될 것 같아요. 정리 감사합니다.",
      minutesAfter: 73,
      reactions: {
        likeBy: pickParticipantKeys([post.author, secondary], index + 7, 1),
      },
    },
    {
      author: tertiary,
      content:
        post.type === PostType.ADOPTION_LISTING
          ? "상담 일정 잡히면 아이 적응 환경과 산책 루틴 정도까지 같이 물어보시면 좋을 것 같아요."
          : "동네/상황이 비슷한 분들 기준으로 참고하기 좋은 글이네요.",
      minutesAfter: 118,
    },
  ];
}

async function ensureCommunities() {
  const communityIdByKey = new Map<DemoCommunityKey, string>();

  for (const spec of DEMO_COMMUNITY_SPECS) {
    const category = await prisma.communityCategory.upsert({
      where: { slug: spec.categorySlug },
      update: {
        labelKo: spec.categoryLabelKo,
        isActive: true,
      },
      create: {
        slug: spec.categorySlug,
        labelKo: spec.categoryLabelKo,
        sortOrder: 1,
        isActive: true,
      },
      select: { id: true },
    });

    const community = await prisma.community.upsert({
      where: { slug: spec.slug },
      update: {
        categoryId: category.id,
        labelKo: spec.labelKo,
        isActive: true,
        sortOrder: spec.sortOrder,
        tags: [...spec.tags],
        defaultPostTypes: [...spec.defaultPostTypes],
      },
      create: {
        categoryId: category.id,
        slug: spec.slug,
        labelKo: spec.labelKo,
        isActive: true,
        sortOrder: spec.sortOrder,
        tags: [...spec.tags],
        defaultPostTypes: [...spec.defaultPostTypes],
      },
      select: { id: true },
    });

    communityIdByKey.set(spec.key, community.id);
  }

  return communityIdByKey;
}

async function ensureNeighborhoods() {
  const neighborhoodIdByKey = new Map<DemoNeighborhoodKey, string>();

  for (const spec of DEMO_NEIGHBORHOODS) {
    const neighborhood = await prisma.neighborhood.upsert({
      where: {
        name_city_district: {
          name: spec.name,
          city: spec.city,
          district: spec.district,
        },
      },
      update: {},
      create: {
        name: spec.name,
        city: spec.city,
        district: spec.district,
      },
      select: { id: true },
    });

    neighborhoodIdByKey.set(spec.key, neighborhood.id);
  }

  return neighborhoodIdByKey;
}

async function upsertDemoUsers(emailDomain: string) {
  const authorIdByKey = new Map<DemoAuthorKey, string>();

  for (const author of DEMO_AUTHOR_SPECS) {
    const email = buildDemoAccountEmail(author.localPart, emailDomain);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        nickname: author.nickname,
        role: author.role,
        bio: author.bio,
        image: buildAvatarUrl(author.avatarSeed),
        passwordHash: null,
        emailVerified: new Date(),
        showPublicPosts: true,
        showPublicComments: true,
        showPublicPets: false,
        nicknameUpdatedAt: null,
      },
      create: {
        email,
        nickname: author.nickname,
        role: author.role,
        bio: author.bio,
        image: buildAvatarUrl(author.avatarSeed),
        passwordHash: null,
        emailVerified: new Date(),
        showPublicPosts: true,
        showPublicComments: true,
        showPublicPets: false,
      },
      select: { id: true },
    });

    authorIdByKey.set(author.key, user.id);
  }

  return authorIdByKey;
}

async function cleanupDemoContent(
  emailDomain: string,
  options: { deleteUsers: boolean },
): Promise<CleanupResult> {
  const emails = DEMO_AUTHOR_SPECS.map((author) => buildDemoAccountEmail(author.localPart, emailDomain));
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });

  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    return { deletedPosts: 0, deletedUsers: 0 };
  }

  const deletedPosts = await prisma.post.deleteMany({
    where: { authorId: { in: userIds } },
  });

  let deletedUsers = { count: 0 };
  if (options.deleteUsers) {
    deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  return {
    deletedPosts: deletedPosts.count,
    deletedUsers: deletedUsers.count,
  };
}

async function createCommentTree(params: {
  postId: string;
  postCreatedAt: Date;
  comments: DemoCommentSpec[];
  authorIdByKey: Map<DemoAuthorKey, string>;
  counters: Pick<SeedResult, "createdComments" | "createdCommentReactions">;
}) {
  const createOne = async (comment: DemoCommentSpec, parentId?: string) => {
    const authorId = params.authorIdByKey.get(comment.author);
    if (!authorId) {
      throw new Error(`Missing demo author for comment: ${comment.author}`);
    }

    const createdAt = minutesAfter(params.postCreatedAt, comment.minutesAfter);
    const created = await prisma.comment.create({
      data: {
        postId: params.postId,
        authorId,
        parentId,
        content: comment.content,
        createdAt,
        updatedAt: createdAt,
        likeCount: 0,
        dislikeCount: 0,
      },
      select: { id: true },
    });
    params.counters.createdComments += 1;

    const likeBy = (comment.reactions?.likeBy ?? []).filter((key) => key !== comment.author);
    const dislikeBy = (comment.reactions?.dislikeBy ?? []).filter(
      (key) => key !== comment.author && !likeBy.includes(key),
    );

    if (likeBy.length > 0) {
      await prisma.commentReaction.createMany({
        data: likeBy.map((key) => {
          const userId = params.authorIdByKey.get(key);
          if (!userId) {
            throw new Error(`Missing demo author for comment reaction: ${key}`);
          }

          return {
            commentId: created.id,
            userId,
            type: "LIKE" as const,
          };
        }),
      });
      params.counters.createdCommentReactions += likeBy.length;
    }

    if (dislikeBy.length > 0) {
      await prisma.commentReaction.createMany({
        data: dislikeBy.map((key) => {
          const userId = params.authorIdByKey.get(key);
          if (!userId) {
            throw new Error(`Missing demo author for comment reaction: ${key}`);
          }

          return {
            commentId: created.id,
            userId,
            type: "DISLIKE" as const,
          };
        }),
      });
      params.counters.createdCommentReactions += dislikeBy.length;
    }

    if (likeBy.length > 0 || dislikeBy.length > 0) {
      await prisma.comment.update({
        where: { id: created.id },
        data: {
          likeCount: likeBy.length,
          dislikeCount: dislikeBy.length,
        },
      });
    }

    for (const reply of comment.replies ?? []) {
      await createOne(reply, created.id);
    }
  };

  for (const comment of params.comments) {
    await createOne(comment);
  }
}

async function seedPosts(params: {
  resetExisting: boolean;
  includeLostFound: boolean;
  authorIdByKey: Map<DemoAuthorKey, string>;
  communityIdByKey: Map<DemoCommunityKey, string>;
  neighborhoodIdByKey: Map<DemoNeighborhoodKey, string>;
  cleanup: CleanupResult;
}): Promise<SeedResult> {
  const result: SeedResult = {
    ...params.cleanup,
    upsertedUsers: params.authorIdByKey.size,
    createdPosts: 0,
    skippedPosts: 0,
    createdComments: 0,
    createdPostReactions: 0,
    createdCommentReactions: 0,
  };

  const postSpecs = params.includeLostFound
    ? [...DEMO_POST_SPECS, buildLostFoundSpec()]
    : [...DEMO_POST_SPECS];

  for (const [index, spec] of postSpecs.entries()) {
    const authorId = params.authorIdByKey.get(spec.author);
    if (!authorId) {
      throw new Error(`Missing demo author: ${spec.author}`);
    }

    if (!params.resetExisting) {
      const existing = await prisma.post.findFirst({
        where: {
          authorId,
          type: spec.type,
          title: spec.title,
        },
        select: { id: true },
      });

      if (existing) {
        result.skippedPosts += 1;
        continue;
      }
    }

    const board = resolveBoardByPostType(spec.type);
    const createdAt = hoursAgo(spec.createdHoursAgo);
    const neighborhoodId = spec.neighborhoodKey
      ? params.neighborhoodIdByKey.get(spec.neighborhoodKey) ?? null
      : null;
    const petTypeId = spec.communityKey
      ? params.communityIdByKey.get(spec.communityKey) ?? null
      : null;
    const comments = buildCommonComments(spec, index);
    const postLikeBy = pickParticipantKeys([spec.author], index + 1, 3 + (index % 2));
    const postDislikeBy =
      index % 5 === 0
        ? pickParticipantKeys([spec.author, ...postLikeBy], index + 5, 1)
        : [];
    const imageUrls = (spec.imageSeeds ?? []).map((seed) => buildPostImageUrl(seed));

    const post = await prisma.post.create({
      data: {
        authorId,
        neighborhoodId,
        petTypeId,
        boardScope: board.boardScope,
        commonBoardType: board.commonBoardType,
        animalTags: [...(spec.animalTags ?? [])],
        reviewCategory: spec.reviewCategory ?? null,
        type: spec.type,
        scope: spec.scope,
        title: spec.title,
        content: spec.content,
        structuredSearchText: buildPostStructuredSearchText({
          animalTags: spec.animalTags,
          hospitalReview: spec.hospitalReview
            ? {
                hospitalName: spec.hospitalReview.hospitalName ?? null,
                treatmentType: spec.hospitalReview.treatmentType ?? null,
              }
            : null,
          placeReview: spec.placeReview
            ? {
                placeName: spec.placeReview.placeName ?? null,
                placeType: spec.placeReview.placeType ?? null,
                address: spec.placeReview.address ?? null,
              }
            : null,
          walkRoute: spec.walkRoute
            ? {
                routeName: spec.walkRoute.routeName ?? null,
                safetyTags: toStringArray(spec.walkRoute.safetyTags),
              }
            : null,
          adoptionListing: spec.adoptionListing
            ? {
                shelterName: spec.adoptionListing.shelterName ?? null,
                region: spec.adoptionListing.region ?? null,
                animalType: spec.adoptionListing.animalType ?? null,
                breed: spec.adoptionListing.breed ?? null,
                ageLabel: spec.adoptionListing.ageLabel ?? null,
                sizeLabel: spec.adoptionListing.sizeLabel ?? null,
              }
            : null,
          volunteerRecruitment: spec.volunteerRecruitment
            ? {
                shelterName: spec.volunteerRecruitment.shelterName ?? null,
                region: spec.volunteerRecruitment.region ?? null,
                volunteerType: spec.volunteerRecruitment.volunteerType ?? null,
              }
            : null,
        }),
        likeCount: 0,
        dislikeCount: 0,
        commentCount: 0,
        viewCount: spec.viewCount,
        createdAt,
        updatedAt: createdAt,
        images:
          imageUrls.length > 0
            ? {
                create: imageUrls.map((url, imageIndex) => ({
                  url,
                  order: imageIndex,
                })),
              }
            : undefined,
        hospitalReview: spec.hospitalReview ? { create: spec.hospitalReview } : undefined,
        placeReview: spec.placeReview ? { create: spec.placeReview } : undefined,
        walkRoute: spec.walkRoute ? { create: spec.walkRoute } : undefined,
        marketListing: spec.marketListing ? { create: spec.marketListing } : undefined,
        adoptionListing: spec.adoptionListing ? { create: spec.adoptionListing } : undefined,
        volunteerRecruitment: spec.volunteerRecruitment
          ? { create: spec.volunteerRecruitment }
          : undefined,
        meetup: spec.meetup ? { create: spec.meetup } : undefined,
        qaQuestion: spec.qaQuestion ? { create: spec.qaQuestion } : undefined,
      },
      select: { id: true },
    });
    result.createdPosts += 1;

    if (postLikeBy.length > 0) {
      await prisma.postReaction.createMany({
        data: postLikeBy.map((key) => {
          const userId = params.authorIdByKey.get(key);
          if (!userId) {
            throw new Error(`Missing demo author for post reaction: ${key}`);
          }

          return {
            postId: post.id,
            userId,
            type: "LIKE" as const,
          };
        }),
      });
      result.createdPostReactions += postLikeBy.length;
    }

    if (postDislikeBy.length > 0) {
      await prisma.postReaction.createMany({
        data: postDislikeBy.map((key) => {
          const userId = params.authorIdByKey.get(key);
          if (!userId) {
            throw new Error(`Missing demo author for post reaction: ${key}`);
          }

          return {
            postId: post.id,
            userId,
            type: "DISLIKE" as const,
          };
        }),
      });
      result.createdPostReactions += postDislikeBy.length;
    }

    await createCommentTree({
      postId: post.id,
      postCreatedAt: createdAt,
      comments,
      authorIdByKey: params.authorIdByKey,
      counters: result,
    });

    const commentCount = await prisma.comment.count({
      where: { postId: post.id },
    });

    await prisma.post.update({
      where: { id: post.id },
      data: {
        likeCount: postLikeBy.length,
        dislikeCount: postDislikeBy.length,
        commentCount,
      },
    });

    if (spec.type === PostType.QA_QUESTION) {
      await prisma.qaQuestion.update({
        where: { postId: post.id },
        data: {
          answerCount: commentCount,
        },
      });
    }
  }

  return result;
}

function printSummary(mode: DemoContentSeedMode, result: SeedResult | CleanupResult) {
  console.log("Production demo content job finished");
  console.log(`- mode: ${mode}`);
  console.log(`- deletedPosts: ${result.deletedPosts}`);
  console.log(`- deletedUsers: ${result.deletedUsers}`);

  if ("upsertedUsers" in result) {
    console.log(`- upsertedUsers: ${result.upsertedUsers}`);
    console.log(`- createdPosts: ${result.createdPosts}`);
    console.log(`- skippedPosts: ${result.skippedPosts}`);
    console.log(`- createdComments: ${result.createdComments}`);
    console.log(`- createdPostReactions: ${result.createdPostReactions}`);
    console.log(`- createdCommentReactions: ${result.createdCommentReactions}`);
  }
}

async function main() {
  const config = resolveDemoContentSeedConfig(process.env);

  if (config.mode === "cleanup") {
    const cleanup = await cleanupDemoContent(config.emailDomain, { deleteUsers: true });
    printSummary(config.mode, cleanup);
    return;
  }

  const cleanup = config.resetExisting
    ? await cleanupDemoContent(config.emailDomain, { deleteUsers: false })
    : { deletedPosts: 0, deletedUsers: 0 };

  const [authorIdByKey, communityIdByKey, neighborhoodIdByKey] = await Promise.all([
    upsertDemoUsers(config.emailDomain),
    ensureCommunities(),
    ensureNeighborhoods(),
  ]);

  const result = await seedPosts({
    resetExisting: config.resetExisting,
    includeLostFound: config.includeLostFound,
    authorIdByKey,
    communityIdByKey,
    neighborhoodIdByKey,
    cleanup,
  });

  printSummary(config.mode, result);
}

main()
  .catch((error) => {
    console.error("Production demo content seed failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
