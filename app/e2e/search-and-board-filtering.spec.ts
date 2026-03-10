import { expect, test } from "@playwright/test";
import {
  AdoptionStatus,
  CommonBoardType,
  PostScope,
  PostStatus,
  PostType,
  UserRole,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/server/password";
import { loginWithCredentials } from "./support/auth-helpers";

const VIEWER_EMAIL_PREFIX = "e2e.search.viewer.";
const VIEWER_PASSWORD =
  process.env.E2E_LOGIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? "Password123!";

function buildViewerEmail(runId: string) {
  return `${VIEWER_EMAIL_PREFIX}${runId}@townpet.dev`;
}

async function ensureNeighborhood(params: {
  name: string;
  city: string;
  district: string;
}) {
  return prisma.neighborhood.upsert({
    where: {
      name_city_district: {
        name: params.name,
        city: params.city,
        district: params.district,
      },
    },
    update: {},
    create: params,
    select: { id: true, name: true, city: true, district: true },
  });
}

async function ensureUser(params: {
  email: string;
  nicknamePrefix: string;
  role?: UserRole;
  password?: string;
}) {
  const passwordHash = await hashPassword(params.password ?? VIEWER_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      emailVerified: new Date(),
      passwordHash,
      role: params.role ?? UserRole.USER,
      nickname: `${params.nicknamePrefix}-${Date.now().toString().slice(-6)}`,
      nicknameUpdatedAt: null,
    },
    create: {
      email: params.email,
      emailVerified: new Date(),
      passwordHash,
      role: params.role ?? UserRole.USER,
      nickname: `${params.nicknamePrefix}-${Date.now().toString().slice(-6)}`,
    },
    select: { id: true, nickname: true },
  });

  await prisma.userSanction.deleteMany({
    where: { userId: user.id },
  });

  return user;
}

async function ensurePrimaryNeighborhood(userId: string, neighborhoodId: string) {
  await prisma.userNeighborhood.deleteMany({ where: { userId } });
  await prisma.userNeighborhood.create({
    data: {
      userId,
      neighborhoodId,
      isPrimary: true,
    },
  });
}

async function createSearchPost(params: {
  authorId: string;
  title: string;
  content: string;
  scope: PostScope;
  status?: PostStatus;
  neighborhoodId?: string;
}) {
  return prisma.post.create({
    data: {
      authorId: params.authorId,
      title: params.title,
      content: params.content,
      type: PostType.FREE_BOARD,
      scope: params.scope,
      status: params.status ?? PostStatus.ACTIVE,
      neighborhoodId: params.neighborhoodId,
    },
    select: { id: true },
  });
}

async function createAdoptionBoardPost(params: {
  authorId: string;
  title: string;
  queryToken: string;
  region: string;
}) {
  return prisma.post.create({
    data: {
      authorId: params.authorId,
      title: params.title,
      content: `${params.queryToken} 입양 게시판 E2E 본문`,
      type: PostType.ADOPTION_LISTING,
      scope: PostScope.GLOBAL,
      boardScope: "COMMON",
      commonBoardType: CommonBoardType.ADOPTION,
      adoptionListing: {
        create: {
          shelterName: `${params.queryToken} 보호소`,
          region: params.region,
          animalType: "강아지",
          breed: "말티즈",
          ageLabel: "2살",
          status: AdoptionStatus.OPEN,
        },
      },
    },
    select: { id: true },
  });
}

test.describe("search and board filtering", () => {
  test.beforeAll(async () => {
    const seochodong = await ensureNeighborhood({
      name: "서초동",
      city: "서울",
      district: "서초구",
    });
    const jamsildong = await ensureNeighborhood({
      name: "잠실동",
      city: "서울",
      district: "송파구",
    });

    await prisma.userBlock.deleteMany({
      where: {
        blocker: {
          email: {
            startsWith: VIEWER_EMAIL_PREFIX,
          },
        },
      },
    });
    await prisma.userMute.deleteMany({
      where: {
        user: {
          email: {
            startsWith: VIEWER_EMAIL_PREFIX,
          },
        },
      },
    });

    await prisma.post.deleteMany({
      where: {
        title: {
          contains: "[PW SEARCH]",
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "e2e.search.author.global@townpet.dev",
            "e2e.search.author.local@townpet.dev",
            "e2e.search.author.hidden@townpet.dev",
            "e2e.search.author.visible@townpet.dev",
            "e2e.search.adoption.visible@townpet.dev",
            "e2e.search.adoption.blocked@townpet.dev",
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: VIEWER_EMAIL_PREFIX,
        },
      },
    });

    await ensureNeighborhood({
      name: seochodong.name,
      city: seochodong.city,
      district: seochodong.district,
    });
    await ensureNeighborhood({
      name: jamsildong.name,
      city: jamsildong.city,
      district: jamsildong.district,
    });
  });

  test("switches between global and local search results", async ({ page }) => {
    const runId = `scope-${Date.now()}`;
    const queryToken = `PWSEARCHSCOPE${runId}`;
    const viewerEmail = buildViewerEmail(runId);
    const viewer = await ensureUser({
      email: viewerEmail,
      nicknamePrefix: "search-viewer",
    });
    const seochodong = await ensureNeighborhood({
      name: "서초동",
      city: "서울",
      district: "서초구",
    });
    await ensurePrimaryNeighborhood(viewer.id, seochodong.id);

    const globalAuthor = await ensureUser({
      email: "e2e.search.author.global@townpet.dev",
      nicknamePrefix: "search-global",
    });
    const localAuthor = await ensureUser({
      email: "e2e.search.author.local@townpet.dev",
      nicknamePrefix: "search-local",
    });

    const globalTitle = `[PW SEARCH] 전역 검색 ${runId}`;
    const localTitle = `[PW SEARCH] 동네 검색 ${runId}`;

    await createSearchPost({
      authorId: globalAuthor.id,
      title: globalTitle,
      content: `${queryToken} 글로벌 검색 결과`,
      scope: PostScope.GLOBAL,
    });
    await createSearchPost({
      authorId: localAuthor.id,
      title: localTitle,
      content: `${queryToken} 로컬 검색 결과`,
      scope: PostScope.LOCAL,
      neighborhoodId: seochodong.id,
    });

    await loginWithCredentials(page, {
      email: viewerEmail,
      password: VIEWER_PASSWORD,
      next: `/search?q=${queryToken}`,
    });

    await expect(page).toHaveURL(new RegExp(`/search\\?q=${queryToken}`));
    await expect(page.getByRole("link", { name: globalTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: localTitle })).toHaveCount(0);

    await page.getByRole("link", { name: `${seochodong.name} 검색` }).click();
    await expect(page).toHaveURL(/scope=LOCAL/);
    await expect(page.getByRole("link", { name: localTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: globalTitle })).toHaveCount(0);
  });

  test("does not show hidden posts in authenticated search results", async ({ page }) => {
    const runId = `hidden-${Date.now()}`;
    const queryToken = `PWSEARCHHIDDEN${runId}`;
    const viewerEmail = buildViewerEmail(runId);
    const viewer = await ensureUser({
      email: viewerEmail,
      nicknamePrefix: "search-viewer",
    });
    const seochodong = await ensureNeighborhood({
      name: "서초동",
      city: "서울",
      district: "서초구",
    });
    await ensurePrimaryNeighborhood(viewer.id, seochodong.id);

    const activeAuthor = await ensureUser({
      email: "e2e.search.author.visible@townpet.dev",
      nicknamePrefix: "search-visible",
    });
    const hiddenAuthor = await ensureUser({
      email: "e2e.search.author.hidden@townpet.dev",
      nicknamePrefix: "search-hidden",
    });

    const activeTitle = `[PW SEARCH] 노출 검색 ${runId}`;
    const hiddenTitle = `[PW SEARCH] 숨김 검색 ${runId}`;

    await createSearchPost({
      authorId: activeAuthor.id,
      title: activeTitle,
      content: `${queryToken} 활성 결과`,
      scope: PostScope.GLOBAL,
      status: PostStatus.ACTIVE,
    });
    await createSearchPost({
      authorId: hiddenAuthor.id,
      title: hiddenTitle,
      content: `${queryToken} 숨김 결과`,
      scope: PostScope.GLOBAL,
      status: PostStatus.HIDDEN,
    });

    await loginWithCredentials(page, {
      email: viewerEmail,
      password: VIEWER_PASSWORD,
      next: `/search?q=${queryToken}`,
    });

    await expect(page.getByRole("link", { name: activeTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: hiddenTitle })).toHaveCount(0);
  });

  test("hides blocked authors from adoption board results", async ({ page }) => {
    const runId = `adoption-${Date.now()}`;
    const queryToken = `PWSEARCHADOPTION${runId}`;
    const viewerEmail = buildViewerEmail(runId);
    const viewer = await ensureUser({
      email: viewerEmail,
      nicknamePrefix: "search-viewer",
    });
    const visibleAuthor = await ensureUser({
      email: "e2e.search.adoption.visible@townpet.dev",
      nicknamePrefix: "adoption-visible",
      role: UserRole.ADMIN,
    });
    const blockedAuthor = await ensureUser({
      email: "e2e.search.adoption.blocked@townpet.dev",
      nicknamePrefix: "adoption-blocked",
      role: UserRole.ADMIN,
    });

    await prisma.userBlock.deleteMany({
      where: {
        blockerId: viewer.id,
        blockedId: blockedAuthor.id,
      },
    });
    await prisma.userBlock.create({
      data: {
        blockerId: viewer.id,
        blockedId: blockedAuthor.id,
      },
    });

    const visibleTitle = `[PW SEARCH] 입양 공개 ${runId}`;
    const blockedTitle = `[PW SEARCH] 입양 차단 ${runId}`;

    await createAdoptionBoardPost({
      authorId: visibleAuthor.id,
      title: visibleTitle,
      queryToken,
      region: "서울 서초구",
    });
    await createAdoptionBoardPost({
      authorId: blockedAuthor.id,
      title: blockedTitle,
      queryToken,
      region: "서울 송파구",
    });

    await loginWithCredentials(page, {
      email: viewerEmail,
      password: VIEWER_PASSWORD,
      next: `/boards/adoption?q=${queryToken}`,
    });

    await expect(page).toHaveURL(new RegExp(`/boards/adoption\\?q=${queryToken}`));
    await expect(page.getByRole("link", { name: visibleTitle })).toBeVisible();
    await expect(page.getByRole("link", { name: blockedTitle })).toHaveCount(0);
  });
});
