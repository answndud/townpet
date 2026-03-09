import { Skeleton } from "@/components/ui/skeleton";

export default function BreedLoungeLoading() {
  return (
    <main className="mx-auto w-full max-w-[1160px] px-4 py-5 sm:px-6">
      <Skeleton className="h-28 w-full border border-[#d6e2f3]" />
      <Skeleton className="mt-3 h-40 w-full border border-[#d6e2f3]" />
      <div className="mt-3 border border-[#d6e2f3] bg-white p-4">
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </main>
  );
}
