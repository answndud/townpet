import { redirect } from "next/navigation";

// TownPet opens on the public feed so visitors can read real community content immediately.
// Keep /feed/guest as the canonical, addressable guest-feed URL for sharing and legacy links.
export const dynamic = "force-dynamic";

export default function HomePage() {
  redirect("/feed/guest");
}
