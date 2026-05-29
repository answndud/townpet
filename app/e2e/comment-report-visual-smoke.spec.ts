import { expect, test } from "@playwright/test";
import { PostScope, PostType } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  DEFAULT_E2E_PASSWORD,
  ensureCredentialUser,
  loginWithCredentialsApi,
} from "./support/auth-helpers";
import { expectNoHorizontalOverflow, expectTouchTarget } from "./support/visual-smoke-helpers";

const authorEmail = "e2e-comment-report-visual-author@townpet.dev";
const viewerEmail = "e2e-comment-report-visual-viewer@townpet.dev";

let postId: string | null = null;
let viewerCommentId: string | null = null;
let reportableCommentId: string | null = null;

test.use({ viewport: { width: 390, height: 844 } });

test.describe("comment/report mobile visual smoke", () => {
  test.beforeEach(async () => {
    const runId = Date.now().toString(36);
    const [author, viewer] = await Promise.all([
      ensureCredentialUser({
        email: authorEmail,
        password: DEFAULT_E2E_PASSWORD,
        nicknamePrefix: "comment-visual-author",
      }),
      ensureCredentialUser({
        email: viewerEmail,
        password: DEFAULT_E2E_PASSWORD,
        nicknamePrefix: "comment-visual-viewer",
      }),
    ]);

    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        type: PostType.FREE_BOARD,
        scope: PostScope.GLOBAL,
        title: `[PW] 댓글 신고 모바일 ${runId}`,
        content: `댓글 신고 모바일 smoke 본문 ${runId}`,
        structuredSearchText: `댓글 신고 모바일 smoke 본문 ${runId}`,
      },
      select: { id: true },
    });
    postId = post.id;

    const [viewerComment, reportableComment] = await Promise.all([
      prisma.comment.create({
        data: {
          postId: post.id,
          authorId: viewer.id,
          content: `내 댓글 메뉴 smoke ${runId}`,
        },
        select: { id: true },
      }),
      prisma.comment.create({
        data: {
          postId: post.id,
          authorId: author.id,
          content: `신고 가능한 댓글 smoke ${runId}`,
        },
        select: { id: true },
      }),
    ]);

    viewerCommentId = viewerComment.id;
    reportableCommentId = reportableComment.id;

    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: 2 },
    });
  });

  test.afterEach(async () => {
    const targetIds = [postId, viewerCommentId, reportableCommentId].filter(
      (value): value is string => Boolean(value),
    );

    if (targetIds.length > 0) {
      await prisma.report.deleteMany({
        where: { targetId: { in: targetIds } },
      });
    }
    if (postId) {
      await prisma.comment.deleteMany({ where: { postId } });
      await prisma.post.deleteMany({ where: { id: postId } });
    }

    postId = null;
    viewerCommentId = null;
    reportableCommentId = null;
  });

  test("keeps comment controls and report form usable on mobile", async ({ page }) => {
    if (!postId || !viewerCommentId || !reportableCommentId) {
      throw new Error("Comment/report visual fixture was not created.");
    }

    await loginWithCredentialsApi(page, {
      email: viewerEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: `/posts/${postId}`,
    });

    await expect(page.getByRole("heading", { name: /\[PW\] 댓글 신고 모바일/ })).toBeVisible({
      timeout: 15_000,
    });

    await expectTouchTarget(page.getByTestId("post-comment-root-input"), "root comment input", 64);
    await expectTouchTarget(page.getByTestId("post-comment-root-submit"), "root comment submit");
    await expectNoHorizontalOverflow(page);

    const ownComment = page.getByTestId(`post-comment-item-${viewerCommentId}`);
    await expect(ownComment).toBeVisible({ timeout: 15_000 });
    const ownCommentMenu = ownComment.locator("summary").first();
    await expectTouchTarget(ownCommentMenu, "own comment menu", 32);
    await ownCommentMenu.click();
    await expectTouchTarget(
      ownComment.getByRole("button", { name: "수정", exact: true }),
      "own comment edit button",
    );
    await expectTouchTarget(
      ownComment.getByRole("button", { name: "삭제", exact: true }),
      "own comment delete button",
    );
    await expectNoHorizontalOverflow(page);

    const reportableComment = page.getByTestId(`post-comment-item-${reportableCommentId}`);
    await expect(reportableComment).toBeVisible({ timeout: 15_000 });
    await expect(reportableComment).not.toHaveAttribute("role", "button");
    await expect(
      reportableComment.getByRole("button", { name: "댓글에 답글 작성", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await expectTouchTarget(reportableComment, "reportable comment reply panel", 64);
    await reportableComment.getByText(/신고 가능한 댓글 smoke/).click();
    await expect(reportableComment).toHaveAttribute("data-reply-open", "true");
    await expect(
      reportableComment.getByRole("button", { name: "댓글에 답글 작성", exact: true }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(reportableComment.getByPlaceholder("답글을 입력하세요")).toBeVisible();
    await reportableComment.getByRole("button", { name: "취소", exact: true }).click();
    await reportableComment.locator("summary").first().click();
    const reportToggle = reportableComment.getByRole("button", { name: "신고", exact: true });
    await expectTouchTarget(reportToggle, "reportable comment report button");
    await reportToggle.click();

    await expectTouchTarget(
      page.getByTestId(`report-reason-comment-${reportableCommentId}`),
      "comment report reason select",
    );
    await expectTouchTarget(
      page.getByTestId(`report-description-comment-${reportableCommentId}`),
      "comment report description textarea",
      72,
    );
    await expectTouchTarget(
      page.getByTestId(`report-submit-comment-${reportableCommentId}`),
      "comment report submit button",
    );
    await expectNoHorizontalOverflow(page);
  });
});
