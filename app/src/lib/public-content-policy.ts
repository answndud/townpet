import type { Prisma } from "@prisma/client";

const PUBLIC_DEMO_CONTENT_SIGNALS = [
  "테스트",
  "[샘플",
  "[pw",
  "visual smoke",
  "visual-smoke",
  "playwright",
  "e2e",
  "townpet-demo",
  "adoption-demo",
  "test-user",
] as const;

export function buildPublicDemoContentExclusion(): Prisma.PostWhereInput {
  return {
    NOT: PUBLIC_DEMO_CONTENT_SIGNALS.flatMap((signal) => [
      { title: { contains: signal, mode: "insensitive" } },
      { content: { contains: signal, mode: "insensitive" } },
      { structuredSearchText: { contains: signal, mode: "insensitive" } },
      { author: { nickname: { contains: signal, mode: "insensitive" } } },
      { author: { email: { contains: signal, mode: "insensitive" } } },
      { guestAuthor: { displayName: { contains: signal, mode: "insensitive" } } },
    ]),
  };
}
