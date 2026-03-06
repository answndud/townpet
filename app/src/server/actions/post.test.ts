import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";

import {
  createPostAction,
  deletePostAction,
  togglePostReactionAction,
  updatePostAction,
} from "@/server/actions/post";
import { requireCurrentUser } from "@/server/auth";
import {
  createPost,
  deletePost,
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
  updatePost: vi.fn(),
  togglePostReaction: vi.fn(),
}));

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockCreatePost = vi.mocked(createPost);
const mockDeletePost = vi.mocked(deletePost);
const mockUpdatePost = vi.mocked(updatePost);
const mockTogglePostReaction = vi.mocked(togglePostReaction);

describe("post actions", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
    mockRequireCurrentUser.mockReset();
    mockCreatePost.mockReset();
    mockDeletePost.mockReset();
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

  it("maps service errors without revalidating paths", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-4" } as never);
    mockDeletePost.mockRejectedValue(new ServiceError("forbidden", "FORBIDDEN", 403));

    const result = await deletePostAction("post-4");

    expect(result).toEqual({ ok: false, code: "FORBIDDEN", message: "forbidden" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
