import { describe, expect, it, vi } from "vitest";

import {
  buildProductionBrowserMetricsCommands,
  countBrowserVisits,
  resolveProductionBrowserMetricsConfig,
  runProductionBrowserMetrics,
} from "./run-production-browser-metrics";

describe("production browser metrics routine", () => {
  it("uses a low-impact default of two mobile browser visits", () => {
    const config = resolveProductionBrowserMetricsConfig({}, new Date("2026-06-08T00:00:00.000Z"));

    expect(config.baseUrl).toBe("https://townpet.vercel.app");
    expect(config.targets).toBe("home,guest_feed");
    expect(config.profiles).toBe("mobile");
    expect(config.samples).toBe(1);
    expect(countBrowserVisits(config)).toBe(2);
    expect(config.webVitalsEnabled).toBe(false);
  });

  it("enables remote Web Vitals summary only when an internal token exists", () => {
    const config = resolveProductionBrowserMetricsConfig({
      OPS_BASE_URL: "https://townpet.dev/",
      OPS_HEALTH_INTERNAL_TOKEN: "token",
    });
    const commands = buildProductionBrowserMetricsCommands(config, {
      OPS_HEALTH_INTERNAL_TOKEN: "token",
    });

    expect(config.webVitalsEnabled).toBe(true);
    expect(commands.map((command) => command.id)).toEqual(["browser", "webVitals"]);
    expect(commands[0].env).toMatchObject({
      PERF_BASE_URL: "https://townpet.dev",
      PERF_BROWSER_TARGETS: "home,guest_feed",
      PERF_BROWSER_PROFILES: "mobile",
      PERF_BROWSER_SAMPLES: "1",
    });
    expect(commands[1].env).toMatchObject({
      OPS_BASE_URL: "https://townpet.dev",
      WEB_VITALS_REPORT_DAYS: "7",
      WEB_VITALS_REPORT_LIMIT: "1000",
    });
  });

  it("blocks heavier production browser visits without explicit acknowledgement", () => {
    expect(() =>
      resolveProductionBrowserMetricsConfig({
        PROD_BROWSER_METRICS_TARGETS: "home,login,guest_feed",
        PROD_BROWSER_METRICS_PROFILES: "desktop,mobile",
        PROD_BROWSER_METRICS_SAMPLES: "2",
      }),
    ).toThrow("production browser metric run would visit 12 pages");
  });

  it("allows heavier production browser visits with explicit acknowledgement", () => {
    const config = resolveProductionBrowserMetricsConfig({
      PROD_BROWSER_METRICS_TARGETS: "home,login,guest_feed",
      PROD_BROWSER_METRICS_PROFILES: "desktop,mobile",
      PROD_BROWSER_METRICS_SAMPLES: "2",
      PROD_BROWSER_METRICS_ACK: "ALLOW_PRODUCTION_BROWSER_METRICS_HEAVY_RUN",
    });

    expect(countBrowserVisits(config)).toBe(12);
  });

  it("writes an orchestration summary with injected runner", async () => {
    const runCommand = vi.fn(async (command) => ({
      id: command.id,
      code: 0,
      output: `${command.id} ok\n`,
    }));
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const config = resolveProductionBrowserMetricsConfig({
      PROD_BROWSER_METRICS_SUMMARY_OUT: "/tmp/summary.md",
    });

    const result = await runProductionBrowserMetrics(config, {
      runCommand,
      mkdir: mkdir as never,
      writeFile: writeFile as never,
      generatedAt: new Date("2026-06-08T00:00:00.000Z"),
    });

    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(result.markdown).toContain("browser visits: `2`");
    expect(result.markdown).toContain("Web Vitals summary: `skipped`");
    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/summary.md",
      expect.stringContaining("# production 저강도 browser metric 루틴"),
      "utf8",
    );
  });
});
