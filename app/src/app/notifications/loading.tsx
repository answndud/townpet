import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-24 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-20 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-20 w-full border border-[#d6e2f3]" />
        <Skeleton className="h-20 w-full border border-[#d6e2f3]" />
      </main>
    </div>
  );
}
