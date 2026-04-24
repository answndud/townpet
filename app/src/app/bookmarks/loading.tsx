import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksLoading() {
  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <section className="tp-hero p-5 sm:p-6" aria-label="북마크 화면 로딩 중">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="mt-4 h-8 w-56 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-full max-w-[440px] rounded-full" />
        </section>

        <section className="tp-card p-4 sm:p-5" aria-hidden="true">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-full rounded-lg bg-[#e4ecf8]" />
            <Skeleton className="h-10 w-full rounded-lg bg-[#d3e0f3] sm:w-[72px]" />
          </div>
          <div className="tp-soft-card mt-3 p-3">
            <Skeleton className="h-3 w-24 rounded-full" />
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={`bookmark-filter-loading-${index}`}
                  className="h-8 w-20 rounded-full bg-[#e4ecf8]"
                />
              ))}
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-36 rounded-full bg-[#e4ecf8]" />
        </section>

        <section className="tp-card overflow-hidden" aria-hidden="true">
          <div className="divide-y divide-[#e1e9f5]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`bookmark-row-loading-${index}`}
                className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_196px]"
              >
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-20 rounded-full bg-[#e4ecf8]" />
                    <Skeleton className="h-6 w-28 rounded-full bg-[#e4ecf8]" />
                  </div>
                  <Skeleton className="mt-3 h-5 w-3/4 rounded-lg bg-[#d3e0f3]" />
                  <Skeleton className="mt-2 h-4 w-full rounded-full bg-[#e4ecf8]" />
                </div>
                <div className="space-y-2 md:text-right">
                  <Skeleton className="h-4 w-28 rounded-full bg-[#e4ecf8] md:ml-auto" />
                  <Skeleton className="h-3 w-36 rounded-full bg-[#e4ecf8] md:ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
