type RouteTimings = Record<string, number>;

export type RouteTimingTracker = {
  measure<T>(name: string, callback: () => Promise<T>): Promise<T>;
  mark(name: string, durationMs: number): void;
  summary(): {
    totalMs: number;
    phases: RouteTimings;
  };
  serverTimingHeader(): string;
};

function formatDuration(value: number) {
  return Math.max(0, value).toFixed(1);
}

export function buildServerTimingHeader(phases: RouteTimings, totalMs: number) {
  const entries = Object.entries(phases).map(
    ([name, durationMs]) => `${name};dur=${formatDuration(durationMs)}`,
  );
  entries.push(`total;dur=${formatDuration(totalMs)}`);
  return entries.join(", ");
}

export function createRouteTimingTracker(now = () => performance.now()): RouteTimingTracker {
  const startedAt = now();
  const phases: RouteTimings = {};

  return {
    async measure(name, callback) {
      const phaseStartedAt = now();
      try {
        return await callback();
      } finally {
        phases[name] = now() - phaseStartedAt;
      }
    },
    mark(name, durationMs) {
      phases[name] = durationMs;
    },
    summary() {
      return {
        totalMs: now() - startedAt,
        phases: { ...phases },
      };
    },
    serverTimingHeader() {
      const summary = this.summary();
      return buildServerTimingHeader(summary.phases, summary.totalMs);
    },
  };
}
