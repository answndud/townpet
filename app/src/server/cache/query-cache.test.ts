import { afterEach, describe, expect, it, vi } from "vitest";

function stubCacheEnv() {
  vi.stubEnv("QUERY_CACHE_ENABLED", "1");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://cache.example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
}

async function loadQueryCacheModule() {
  vi.resetModules();
  return import("@/server/cache/query-cache");
}

describe("query cache build/runtime behavior", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("skips Upstash fetches during production build phase", async () => {
    stubCacheEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { createQueryCacheKey } = await loadQueryCacheModule();
    const key = await createQueryCacheKey("feed", { page: 1 });

    expect(key).toBe("cache:feed:v1:page=1");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses Upstash fetches at runtime when configured", async () => {
    stubCacheEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: "3" }],
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { createQueryCacheKey } = await loadQueryCacheModule();
    const key = await createQueryCacheKey("feed", { page: 1 });

    expect(key).toBe("cache:feed:v3:page=1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
