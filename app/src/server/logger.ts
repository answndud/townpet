type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|passphrase|secret|token|api[-_]?key|access[-_]?key|refresh[-_]?token|connection|string|dsn|private[-_]?key)/i;
const PII_KEY_PATTERN = /^(email|user[-_]?email|ip|ip[-_]?address|client[-_]?ip|user[-_]?agent)$/i;

function redactText(value: string) {
  return value
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:token|code|password|secret|key|authorization)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/\b(?:postgres(?:ql)?|mysql):\/\/[^\s]+/gi, "[REDACTED_CONNECTION_STRING]");
}

export function redactLogValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (key && PII_KEY_PATTERN.test(key)) {
    return "[REDACTED_PII]";
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactLogValue(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message: redactText(message),
    ...(redactLogValue(context ?? {}) as LogContext),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return redactLogValue({
      name: error.name,
      message: error.message,
      stack: error.stack,
    }) as Record<string, unknown>;
  }

  return { value: redactText(String(error)) };
}

export const logger = {
  info(message: string, context?: LogContext) {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    writeLog("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    writeLog("error", message, context);
  },
};
