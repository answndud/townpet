import { expect, test, type Page } from "@playwright/test";
import { PostScope, PostType, ReportReason, ReportStatus, ReportTarget } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  DEFAULT_E2E_PASSWORD,
  ensureCredentialUser,
  ensureModeratorUser,
  loginWithCredentialsApi,
} from "./support/auth-helpers";

const authorEmail = "e2e-report-author@townpet.dev";
const reporterEmail = "e2e-report-reporter@townpet.dev";
const adminEmail = "e2e-report-admin@townpet.dev";

let postId: string | null = null;
let commentId: string | null = null;
let createdReportIds: string[] = [];

async function latestReportId(targetType: ReportTarget, targetId: string) {
  const report = await prisma.report.findFirst({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!report) {
    throw new Error(`Report was not created for ${targetType}:${targetId}`);
  }

  return report.id;
}

async function submitPostReport(page: Page, targetPostId: string, description: string) {
  await page.getByRole("button", { name: "신고", exact: true }).first().click();
  await page.getByTestId(`report-reason-post-${targetPostId}`).selectOption(ReportReason.SPAM);
  await page.getByTestId(`report-description-post-${targetPostId}`).fill(description);
  await page.getByTestId(`report-submit-post-${targetPostId}`).click();
  await expect(page.getByTestId(`report-message-post-${targetPostId}`)).toContainText(
    "신고가 접수되었습니다.",
  );
}

async function submitCommentReport(page: Page, targetCommentId: string, description: string) {
  const commentItem = page.getByTestId(`post-comment-item-${targetCommentId}`);
  await commentItem.getByRole("button", { name: "신고", exact: true }).click();
  await page.getByTestId(`report-reason-comment-${targetCommentId}`).selectOption(ReportReason.OTHER);
  await page.getByTestId(`report-description-comment-${targetCommentId}`).fill(description);
  await page.getByTestId(`report-submit-comment-${targetCommentId}`).click();
  await expect(page.getByTestId(`report-message-comment-${targetCommentId}`)).toContainText(
    "신고가 접수되었습니다.",
  );
}

test.describe("report flow", () => {
  test.beforeEach(async () => {
    const runId = Date.now().toString(36);
    const [author] = await Promise.all([
      ensureCredentialUser({
        email: authorEmail,
        password: DEFAULT_E2E_PASSWORD,
        nicknamePrefix: "report-author",
      }),
      ensureCredentialUser({
        email: reporterEmail,
        password: DEFAULT_E2E_PASSWORD,
        nicknamePrefix: "reporter",
      }),
      ensureModeratorUser({
        email: adminEmail,
        password: DEFAULT_E2E_PASSWORD,
        nicknamePrefix: "report-admin",
      }),
    ]);

    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        type: PostType.FREE_BOARD,
        scope: PostScope.GLOBAL,
        title: `[PW] 신고 플로우 ${runId}`,
        content: `신고 플로우 검증 본문 ${runId}`,
        structuredSearchText: `신고 플로우 검증 본문 ${runId}`,
      },
      select: { id: true },
    });
    postId = post.id;

    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: author.id,
        content: `신고 가능한 댓글 ${runId}`,
      },
      select: { id: true },
    });
    commentId = comment.id;

    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: 1 },
    });

    createdReportIds = [];
  });

  test.afterEach(async () => {
    if (createdReportIds.length > 0) {
      await prisma.report.deleteMany({ where: { id: { in: createdReportIds } } });
    }
    if (commentId) {
      await prisma.comment.deleteMany({ where: { id: commentId } });
    }
    if (postId) {
      await prisma.post.deleteMany({ where: { id: postId } });
    }
    postId = null;
    commentId = null;
    createdReportIds = [];
  });

  test("creates post/comment reports and lets admin dismiss a report", async ({ page }) => {
    if (!postId || !commentId) {
      throw new Error("Report flow fixture was not created.");
    }

    await loginWithCredentialsApi(page, {
      email: reporterEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: `/posts/${postId}`,
    });
    await expect(page.getByRole("heading", { name: /\[PW\] 신고 플로우/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId(`post-comment-item-${commentId}`)).toBeVisible({
      timeout: 15_000,
    });

    await submitPostReport(page, postId, "게시글 신고 e2e");
    const postReportId = await latestReportId(ReportTarget.POST, postId);
    createdReportIds.push(postReportId);

    await submitCommentReport(page, commentId, "댓글 신고 e2e");
    const commentReportId = await latestReportId(ReportTarget.COMMENT, commentId);
    createdReportIds.push(commentReportId);

    await loginWithCredentialsApi(page, {
      email: adminEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: `/admin/reports/${postReportId}`,
    });
    await expect(page.getByRole("heading", { name: "신고 상세" })).toBeVisible();
    await expect(page.getByText("게시글 신고 e2e")).toBeVisible();
    await page.getByRole("button", { name: "기각", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reports\?updated=1/, { timeout: 15_000 });

    await expect
      .poll(async () => {
        const report = await prisma.report.findUnique({
          where: { id: postReportId },
          select: { status: true },
        });
        return report?.status;
      })
      .toBe(ReportStatus.DISMISSED);

    const commentReport = await prisma.report.findUnique({
      where: { id: commentReportId },
      select: { status: true },
    });
    expect(commentReport?.status).toBe(ReportStatus.PENDING);
  });
});
