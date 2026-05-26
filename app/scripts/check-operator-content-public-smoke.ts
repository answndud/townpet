import "dotenv/config";

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_MIN_COUNT = 1;

type FetchLike = typeof fetch;

type GuestFeedItem = {
  id?: string;
  title?: string;
  isOperatorContent?: boolean;
  operatorSourceName?: string | null;
  operatorSourceUrl?: string | null;
  operatorLastVerifiedAt?: string | null;
};

type GuestFeedResponse = {
  ok?: boolean;
  view?: string;
  feed?: {
    items?: GuestFeedItem[];
  };
  data?: {
    view?: string;
    feed?: {
      items?: GuestFeedItem[];
    };
  };
};

type HomeFeedItem = {
  id?: string;
  title?: string;
};

type HomeFeedResponse = {
  ok?: boolean;
  featured?: HomeFeedItem[];
  latest?: HomeFeedItem[];
  data?: {
    featured?: HomeFeedItem[];
    latest?: HomeFeedItem[];
  };
};

export type OperatorContentPublicSmokeResult = {
  status: "PASS" | "BLOCKED";
  baseUrl: string;
  minCount: number;
  operatorItems: Array<{
    id: string;
    title: string;
    sourceName: string | null;
    hasSourceUrl: boolean;
    hasVerifiedAt: boolean;
  }>;
  checks: Array<{
    key: string;
    status: "PASS" | "BLOCKED";
    detail: string;
  }>;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function normalizeMinCount(value: string | undefined) {
  if (!value) {
    return DEFAULT_MIN_COUNT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 20) {
    throw new Error("OPERATOR_CONTENT_SMOKE_MIN_COUNT must be an integer from 1 to 20.");
  }

  return parsed;
}

async function readJson<T>(fetcher: FetchLike, url: string): Promise<T> {
  const response = await fetcher(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

async function readText(fetcher: FetchLike, url: string) {
  const response = await fetcher(url, {
    method: "GET",
    headers: {
      accept: "text/html",
      "cache-control": "no-cache",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.text();
}

function containsAll(value: string, terms: string[]) {
  return terms.every((term) => value.includes(term));
}

function extractOperatorItems(payload: GuestFeedResponse) {
  return ((payload.feed ?? payload.data?.feed)?.items ?? [])
    .filter((item) => item.isOperatorContent && item.id && item.title)
    .map((item) => ({
      id: String(item.id),
      title: String(item.title),
      sourceName: item.operatorSourceName ?? null,
      hasSourceUrl: Boolean(item.operatorSourceUrl),
      hasVerifiedAt: Boolean(item.operatorLastVerifiedAt),
    }));
}

function homeFeedContainsTitle(payload: HomeFeedResponse, title: string) {
  const latest = payload.latest ?? payload.data?.latest ?? [];
  const featured = payload.featured ?? payload.data?.featured ?? [];
  return [...latest, ...featured].some((item) => item.title === title);
}

export async function runOperatorContentPublicSmoke(params: {
  baseUrl?: string;
  minCount?: number;
  fetcher?: FetchLike;
} = {}): Promise<OperatorContentPublicSmokeResult> {
  const baseUrl = normalizeBaseUrl(params.baseUrl ?? DEFAULT_BASE_URL);
  const minCount = params.minCount ?? DEFAULT_MIN_COUNT;
  const fetcher = params.fetcher ?? fetch;
  const checks: OperatorContentPublicSmokeResult["checks"] = [];

  const guestFeed = await readJson<GuestFeedResponse>(
    fetcher,
    `${baseUrl}/api/feed/guest?sort=LATEST&density=ULTRA`,
  );
  const operatorItems = extractOperatorItems(guestFeed);
  checks.push({
    key: "api_feed_guest_operator_items",
    status: operatorItems.length >= minCount ? "PASS" : "BLOCKED",
    detail: `found=${operatorItems.length}, required=${minCount}`,
  });

  const firstItem = operatorItems[0] ?? null;
  if (!firstItem) {
    return {
      status: "BLOCKED",
      baseUrl,
      minCount,
      operatorItems,
      checks,
    };
  }

  const detailHtml = await readText(fetcher, `${baseUrl}/posts/${firstItem.id}/guest`);
  checks.push({
    key: "post_detail_source_panel",
    status: containsAll(
      detailHtml,
      ["운영자 정리", firstItem.title, firstItem.sourceName ?? "출처"],
    )
      ? "PASS"
      : "BLOCKED",
    detail: `post=${firstItem.id}`,
  });

  const feedHtml = await readText(fetcher, `${baseUrl}/feed/guest`);
  checks.push({
    key: "feed_guest_page_reachable",
    status: containsAll(feedHtml, ["TownPet"]) ? "PASS" : "BLOCKED",
    detail: "feed page shell reachable; operator metadata is verified via api_feed_guest_operator_items",
  });

  const searchHtml = await readText(
    fetcher,
    `${baseUrl}/search/guest?q=${encodeURIComponent(firstItem.title)}`,
  );
  checks.push({
    key: "search_guest_result",
    status: searchHtml.includes(firstItem.title) ? "PASS" : "BLOCKED",
    detail: `query=${firstItem.title}`,
  });

  const homeFeed = await readJson<HomeFeedResponse>(fetcher, `${baseUrl}/api/home/feed`);
  checks.push({
    key: "api_home_feed_preview",
    status: homeFeedContainsTitle(homeFeed, firstItem.title) ? "PASS" : "BLOCKED",
    detail: `title=${firstItem.title}`,
  });

  return {
    status: checks.some((check) => check.status === "BLOCKED") ? "BLOCKED" : "PASS",
    baseUrl,
    minCount,
    operatorItems,
    checks,
  };
}

export function formatOperatorContentPublicSmoke(result: OperatorContentPublicSmokeResult) {
  const lines = [
    "Operator content public smoke",
    `- status: ${result.status}`,
    `- baseUrl: ${result.baseUrl}`,
    `- requiredOperatorItems: ${result.minCount}`,
    `- foundOperatorItems: ${result.operatorItems.length}`,
    "- operator items:",
    ...(result.operatorItems.length > 0
      ? result.operatorItems.map(
          (item) =>
            `  - ${item.id} | ${item.title} | source=${item.sourceName ?? "-"} | sourceUrl=${String(item.hasSourceUrl)} | verifiedAt=${String(item.hasVerifiedAt)}`,
        )
      : ["  - none"]),
    "- checks:",
    ...result.checks.map((check) => `  - ${check.key}: ${check.status} (${check.detail})`),
  ];

  return lines.join("\n");
}

async function main() {
  const result = await runOperatorContentPublicSmoke({
    baseUrl: process.env.OPS_BASE_URL?.trim() || DEFAULT_BASE_URL,
    minCount: normalizeMinCount(process.env.OPERATOR_CONTENT_SMOKE_MIN_COUNT),
  });
  console.log(formatOperatorContentPublicSmoke(result));
  if (result.status !== "PASS") {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Operator content public smoke failed");
    console.error(error);
    process.exit(1);
  });
}
