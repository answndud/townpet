import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientJsonError, fetchJson, isAbortError } from "@/lib/client-json";

describe("client json helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns response and typed payload for json responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }),
      ),
    );

    const result = await fetchJson<{ ok: boolean }>("/api/example");

    expect(result.response.status).toBe(200);
    expect(result.payload).toEqual({ ok: true });
  });

  it("rejects non-json responses with status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html></html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    await expect(fetchJson("/api/example")).rejects.toMatchObject({
      name: "ClientJsonError",
      status: 502,
    });
  });

  it("rejects invalid json responses with status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(fetchJson("/api/example")).rejects.toBeInstanceOf(ClientJsonError);
  });

  it("detects abort errors without assuming DOMException availability", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError(new Error("other"))).toBe(false);
  });
});
