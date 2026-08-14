import { redirect } from "next/navigation";

export const metadata = { title: "동물 게시판", description: "전체 동물 게시판으로 이동합니다.", alternates: { canonical: "/animals" } };

export default function AnimalsIndexPage() {
  redirect("/animals/all");
}
