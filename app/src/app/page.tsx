import { redirect } from "next/navigation";

import { createNoIndexPageMetadata } from "@/lib/page-metadata";

export const metadata = createNoIndexPageMetadata({
  title: "홈",
  description: "TownPet 피드로 이동합니다.",
  path: "/",
});

export default function HomePage() {
  redirect("/feed");
}
