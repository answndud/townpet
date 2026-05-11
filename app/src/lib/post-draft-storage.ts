const HOUR_MS = 60 * 60 * 1000;

export const POST_DRAFT_TTL_MS = 24 * HOUR_MS;

export type StoredPostDraft<T> = {
  savedAt: string;
  expiresAt: string;
  form: T;
};

export type ParsedPostDraft<T> =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "ready"; draft: StoredPostDraft<T> };

function parseDateMs(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function buildPostDraftPayload<T>(
  form: T,
  now = new Date(),
  ttlMs = POST_DRAFT_TTL_MS,
): StoredPostDraft<T> {
  return {
    savedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    form,
  };
}

export function parsePostDraftPayload<T>(
  raw: string | null,
  isDraftForm: (value: unknown) => value is T,
  now = new Date(),
): ParsedPostDraft<T> {
  if (!raw) {
    return { status: "missing" };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPostDraft<T>>;
    if (!isDraftForm(parsed.form)) {
      return { status: "invalid" };
    }

    const savedAt = parseDateMs(parsed.savedAt);
    const expiresAt =
      parseDateMs(parsed.expiresAt) ?? (savedAt === null ? null : savedAt + POST_DRAFT_TTL_MS);
    if (expiresAt === null || expiresAt <= now.getTime()) {
      return { status: "expired" };
    }

    return {
      status: "ready",
      draft: {
        savedAt: parsed.savedAt ?? new Date(expiresAt - POST_DRAFT_TTL_MS).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        form: parsed.form,
      },
    };
  } catch {
    return { status: "invalid" };
  }
}
