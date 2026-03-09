import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";

import {
  createPostAction,
  deletePostAction,
  togglePostBookmarkAction,
  togglePostReactionAction,
  updatePostAction,
} from "@/server/actions/post";
import { requireCurrentUser } from "@/server/auth";
import {
  createPost,
  deletePost,
  togglePostBookmark,
  togglePostReaction,
  updatePost,
} from "@/server/services/post.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/server/services/post.service", () => ({
  createPost: vi.fn(),
  deletePost: vi.fn(),
  togglePostBookmark: vi.fn(),
  updatePost: vi.fn(),
  togglePostReaction: vi.fn(),
}));

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockCreatePost = vi.mocked(createPost);
const mockDeletePost = vi.mocked(deletePost);
const mockTogglePostBookmark = vi.mocked(togglePostBookmark);
const mockUpdatePost = vi.mocked(updatePost);
const mockTogglePostReaction = vi.mocked(togglePostReaction);

describe("post actions", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
    mockRequireCurrentUser.mockReset();
    mockCreatePost.mockReset();
    mockDeletePost.mockReset();
    mockTogglePostBookmark.mockReset();
    mockUpdatePost.mockReset();
    mockTogglePostReaction.mockReset();
  });

  it("creates a post and only revalidates the feed page", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);

    const result = await createPostAction({ title: "새 글" });

    expect(result).toEqual({ ok: true });
    expect(mockCreatePost).toHaveBeenCalledWith({
      authorId: "user-1",
      input: { title: "새 글" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/feed");
  });

  it("updates a post and revalidates feed plus detail", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-2" } as never);

    const result = await updatePostAction("post-1", { title: "수정" });

    expect(result).toEqual({ ok: true });
    expect(mockUpdatePost).toHaveBeenCalledWith({
      postId: "post-1",
      authorId: "user-2",
      input: { title: "수정" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/feed");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts/post-1");
  });

  it("revalidates only the detail page after toggling a reaction", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-3" } as never);
    mockTogglePostReaction.mockResolvedValue({
      likeCount: 5,
      dislikeCount: 1,
      reaction: "LIKE",
      previousReaction: null,
    } as never);

    const result = await togglePostReactionAction("post-9", "LIKE");

    expect(result).toEqual({
      ok: true,
      likeCount: 5,
      dislikeCount: 1,
      reaction: "LIKE",
    });
    expect(mockTogglePostReaction).toHaveBeenCalledWith({
      postId: "post-9",
      userId: "user-3",
      type: "LIKE",
    });
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts/post-9");
  });

  it("revalidates feed, detail, and bookmarks page after toggling a bookmark", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-8" } as never);
    mockTogglePostBookmark.mockResolvedValue({
      bookmarked: true,
    } as never);

    const result = await togglePostBookmarkAction("post-12", true);

    expect(result).toEqual({
      ok: true,
      bookmarked: true,
    });
    expect(mockTogglePostBookmark).toHaveBeenCalledWith({
      postId: "post-12",
      userId: "user-8",
      bookmarked: true,
    });
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/feed");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts/post-12");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
  });

  it("rejects invalid bookmark input before calling the service", async () => {
    const result = await togglePostBookmarkAction("post-13", "1" as never);

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      message: "북마크 값이 올바르지 않습니다.",
    });
    expect(mockRequireCurrentUser).not.toHaveBeenCalled();
    expect(mockTogglePostBookmark).not.toHaveBeenCalled();
  });

  it("maps service errors without revalidating paths", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-4" } as never);
    mockDeletePost.mockRejectedValue(new ServiceError("forbidden", "FORBIDDEN", 403));

    const result = await deletePostAction("post-4");

    expect(result).toEqual({ ok: false, code: "FORBIDDEN", message: "forbidden" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
