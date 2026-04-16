import { NextResponse } from "next/server";

type ErrorPayload = {
  code: string;
  message: string;
};

type JsonOkInit = ResponseInit & {
  meta?: Record<string, unknown>;
};

export function jsonOk<T>(data: T, init?: JsonOkInit) {
  const { meta, ...responseInit } = init ?? {};
  const response = NextResponse.json(meta ? { ok: true, data, meta } : { ok: true, data }, responseInit);
  if (responseInit.headers) {
    const headers = new Headers(responseInit.headers);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

export function jsonError(status: number, payload: ErrorPayload) {
  return NextResponse.json({ ok: false, error: payload }, { status });
}
