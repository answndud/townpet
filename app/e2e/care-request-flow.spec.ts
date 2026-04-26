import { expect, test } from "@playwright/test";
import {
  CareApplicationStatus,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  CareRequestStatus,
  PostStatus,
  PostType,
  UserRole,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  DEFAULT_E2E_PASSWORD,
  ensureCredentialUser,
  ensureModeratorUser,
  loginWithCredentialsApi,
} from "./support/auth-helpers";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

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
    select: { id: true },
  });
}

async function makeEstablishedLocalUser(params: {
  email: string;
  nicknamePrefix: string;
  neighborhoodId: string;
}) {
  const user = await ensureCredentialUser({
    email: params.email,
    nicknamePrefix: params.nicknamePrefix,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      emailVerified: new Date("2025-01-01T00:00:00.000Z"),
    },
  });
  await prisma.userNeighborhood.deleteMany({ where: { userId: user.id } });
  await prisma.userNeighborhood.create({
    data: {
      userId: user.id,
      neighborhoodId: params.neighborhoodId,
      isPrimary: true,
    },
  });
  await prisma.userBlock.deleteMany({
    where: {
      OR: [{ blockerId: user.id }, { blockedId: user.id }],
    },
  });
  await prisma.userMute.deleteMany({
    where: {
      OR: [{ userId: user.id }, { mutedUserId: user.id }],
    },
  });

  return user;
}

test.describe("care request local hot path", () => {
  test("connects create, apply, complete feedback, and admin issue queue", async ({
    browser,
  }) => {
    test.slow();

    const runId = `${Date.now()}`;
    const title = `[PW CARE] 산책 돌봄 ${runId}`;
    const issueComment = `PW CARE issue signal ${runId}`;
    const requesterEmail = `e2e.care.requester.${runId}@townpet.dev`;
    const caregiverEmail = `e2e.care.caregiver.${runId}@townpet.dev`;
    const adminEmail = `e2e.care.admin.${runId}@townpet.dev`;
    const neighborhood = await ensureNeighborhood({
      name: "케어검증동",
      city: "서울",
      district: "강남구",
    });
    const requester = await makeEstablishedLocalUser({
      email: requesterEmail,
      nicknamePrefix: "care-requester",
      neighborhoodId: neighborhood.id,
    });
    const caregiver = await makeEstablishedLocalUser({
      email: caregiverEmail,
      nicknamePrefix: "care-caregiver",
      neighborhoodId: neighborhood.id,
    });
    await ensureModeratorUser({
      email: adminEmail,
      role: UserRole.ADMIN,
      nicknamePrefix: "care-admin",
    });

    await prisma.post.deleteMany({
      where: { title: { contains: `[PW CARE] 산책 돌봄 ${runId}` } },
    });

    const requesterContext = await browser.newContext({ baseURL: BASE_URL });
    const requesterPage = await requesterContext.newPage();
    await loginWithCredentialsApi(requesterPage, {
      email: requesterEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: "/posts/new",
    });
    await requesterPage.evaluate(() => window.localStorage.clear());
    await requesterPage.goto("/posts/new");
    await requesterPage.getByLabel("제목").fill(title);
    await requesterPage.getByLabel("분류").selectOption(PostType.CARE_REQUEST);
    await requesterPage
      .getByRole("combobox", { name: "동네" })
      .selectOption({ label: "서울 케어검증동" });
    await requesterPage.getByTestId("post-body-editor").fill("산책 돌봄 요청 본문입니다.");
    await requesterPage.getByLabel("시작 시간").fill("2026-05-01T10:00");
    await requesterPage.getByLabel("종료 시간").fill("2026-05-01T11:00");
    await requesterPage.getByLabel("보상(원)").fill("15000");
    await requesterPage.getByLabel("위치 힌트").fill("케어검증동 공원 앞");
    await requesterPage.getByLabel("반려동물 정보").fill("5kg 소형견");
    await requesterPage.getByLabel("요청사항").fill("천천히 산책해 주세요.");
    await requesterPage.getByRole("button", { name: "등록" }).click();
    await requesterPage.waitForURL("**/feed", { timeout: 15_000 });

    await expect
      .poll(
        () =>
          prisma.post.findFirst({
            where: { title, authorId: requester.id },
            select: {
              id: true,
              type: true,
              status: true,
              careRequest: { select: { id: true, status: true } },
            },
          }),
        { timeout: 10_000 },
      )
      .toMatchObject({
        type: PostType.CARE_REQUEST,
        status: PostStatus.ACTIVE,
        careRequest: { status: CareRequestStatus.OPEN },
      });
    const post = await prisma.post.findFirstOrThrow({
      where: { title, authorId: requester.id },
      select: { id: true, careRequest: { select: { id: true } } },
    });
    await requesterContext.close();

    const caregiverContext = await browser.newContext({ baseURL: BASE_URL });
    const caregiverPage = await caregiverContext.newPage();
    await loginWithCredentialsApi(caregiverPage, {
      email: caregiverEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: `/posts/${post.id}`,
    });
    await expect(caregiverPage.getByText("돌봄 요청 정보")).toBeVisible();
    await caregiverPage
      .getByPlaceholder("요청자에게 전달할 메시지를 입력하세요.")
      .fill("지원합니다. 시간 맞춰 방문할게요.");
    await caregiverPage.getByRole("button", { name: "지원하기" }).click();
    await expect
      .poll(
        () =>
          prisma.careApplication.findFirst({
            where: {
              careRequestId: post.careRequest?.id,
              applicantId: caregiver.id,
            },
            select: { id: true, status: true },
          }),
        { timeout: 10_000 },
      )
      .toMatchObject({ status: CareApplicationStatus.PENDING });
    const application = await prisma.careApplication.findFirstOrThrow({
      where: {
        careRequestId: post.careRequest?.id,
        applicantId: caregiver.id,
      },
      select: { id: true },
    });
    await caregiverContext.close();

    const requesterManageContext = await browser.newContext({ baseURL: BASE_URL });
    const requesterManagePage = await requesterManageContext.newPage();
    await loginWithCredentialsApi(requesterManagePage, {
      email: requesterEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: `/posts/${post.id}`,
    });
    await requesterManagePage.getByRole("button", { name: "수락" }).click();
    await expect
      .poll(
        () =>
          prisma.careApplication.findUnique({
            where: { id: application.id },
            select: { status: true },
          }),
        { timeout: 10_000 },
      )
      .toMatchObject({ status: CareApplicationStatus.ACCEPTED });
    await expect(requesterManagePage.getByRole("button", { name: "진행 중" })).toBeVisible();

    await requesterManagePage.getByRole("button", { name: "진행 중" }).click();
    await expect(requesterManagePage.getByText("돌봄 요청 상태가 변경되었습니다.")).toBeVisible();
    await expect
      .poll(
        () =>
          prisma.careRequest.findUnique({
            where: { id: post.careRequest?.id },
            select: { status: true },
          }),
        { timeout: 10_000 },
      )
      .toMatchObject({ status: CareRequestStatus.IN_PROGRESS });

    await requesterManagePage.getByRole("button", { name: "완료" }).click();
    await expect
      .poll(
        () =>
          prisma.careRequest.findUnique({
            where: { id: post.careRequest?.id },
            select: { status: true },
          }),
        { timeout: 10_000 },
      )
      .toMatchObject({ status: CareRequestStatus.COMPLETED });

    await requesterManagePage.getByLabel("결과").selectOption(CareFeedbackOutcome.ISSUE);
    await requesterManagePage.getByLabel("이슈 유형").selectOption(CareFeedbackIssueType.SAFETY);
    await requesterManagePage
      .getByPlaceholder("운영 확인이 필요한 내용이나 간단한 메모를 남겨주세요.")
      .fill(issueComment);
    await requesterManagePage.getByRole("main").getByRole("button", { name: "저장" }).click();
    await expect
      .poll(
        () =>
          prisma.careCompletionFeedback.findFirst({
            where: {
              careRequestId: post.careRequest?.id,
              authorId: requester.id,
            },
            select: { outcome: true, issueType: true, comment: true },
          }),
        { timeout: 10_000 },
      )
      .toMatchObject({
        outcome: CareFeedbackOutcome.ISSUE,
        issueType: CareFeedbackIssueType.SAFETY,
        comment: issueComment,
      });
    await requesterManageContext.close();

    const adminContext = await browser.newContext({ baseURL: BASE_URL });
    const adminPage = await adminContext.newPage();
    await loginWithCredentialsApi(adminPage, {
      email: adminEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: "/admin/care-feedbacks",
    });
    await expect(adminPage.getByRole("heading", { name: "돌봄 이슈 신호" })).toBeVisible();
    await expect(adminPage.getByRole("link", { name: title })).toBeVisible();
    await expect(adminPage.getByText(issueComment)).toBeVisible();
    await adminPage.goto("/admin/ops");
    await expect(adminPage.getByRole("link", { name: "돌봄 이슈 신호", exact: true })).toBeVisible();
    await adminContext.close();

  });
});
