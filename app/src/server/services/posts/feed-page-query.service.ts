export type FeedPageSlice<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ResolveFeedPageSliceParams<T> = {
  currentPage: number;
  limit: number;
  countItems: () => Promise<number>;
  listPage: (page: number) => Promise<FeedPageSlice<T>>;
};

export type ResolveFeedPageSliceResult<T> = {
  totalItemCount: number;
  totalPages: number;
  resolvedPage: number;
  page: FeedPageSlice<T>;
};

export async function resolveFeedPageSlice<T>({
  currentPage,
  limit,
  countItems,
  listPage,
}: ResolveFeedPageSliceParams<T>): Promise<ResolveFeedPageSliceResult<T>> {
  const requestedPage = Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;

  const [totalItemCount, requestedPageResult] = await Promise.all([
    countItems(),
    listPage(requestedPage),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItemCount / limit));
  const resolvedPage = Math.min(requestedPage, totalPages);

  if (resolvedPage === requestedPage) {
    return {
      totalItemCount,
      totalPages,
      resolvedPage,
      page: requestedPageResult,
    };
  }

  return {
    totalItemCount,
    totalPages,
    resolvedPage,
    page: await listPage(resolvedPage),
  };
}
