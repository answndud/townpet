import { describe, expect, it, vi } from "vitest";

import { resolveFeedPageSlice } from "@/server/services/posts/feed-page-query.service";

describe("resolveFeedPageSlice", () => {
  it("reuses the requested page result when the page is within range", async () => {
    const countItems = vi.fn().mockResolvedValue(45);
    const listPage = vi.fn().mockImplementation(async (page: number) => ({
      items: [`page-${page}`],
      nextCursor: page === 1 ? "cursor-2" : null,
    }));

    const result = await resolveFeedPageSlice({
      currentPage: 1,
      limit: 20,
      countItems,
      listPage,
    });

    expect(result).toEqual({
      totalItemCount: 45,
      totalPages: 3,
      resolvedPage: 1,
      page: {
        items: ["page-1"],
        nextCursor: "cursor-2",
      },
    });
    expect(listPage).toHaveBeenCalledTimes(1);
    expect(listPage).toHaveBeenCalledWith(1);
  });

  it("refetches the resolved page when the requested page overflows", async () => {
    const countItems = vi.fn().mockResolvedValue(12);
    const listPage = vi.fn().mockImplementation(async (page: number) => ({
      items: [`page-${page}`],
      nextCursor: null,
    }));

    const result = await resolveFeedPageSlice({
      currentPage: 4,
      limit: 10,
      countItems,
      listPage,
    });

    expect(result).toEqual({
      totalItemCount: 12,
      totalPages: 2,
      resolvedPage: 2,
      page: {
        items: ["page-2"],
        nextCursor: null,
      },
    });
    expect(listPage).toHaveBeenCalledTimes(2);
    expect(listPage).toHaveBeenNthCalledWith(1, 4);
    expect(listPage).toHaveBeenNthCalledWith(2, 2);
  });
});
