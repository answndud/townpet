export class ClientJsonError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientJsonError";
    this.status = status;
  }
}

export type ClientJsonResult<T> = {
  response: Response;
  payload: T;
};

const DEFAULT_NON_JSON_MESSAGE =
  "서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.";

export function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ClientJsonResult<T>> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new ClientJsonError(DEFAULT_NON_JSON_MESSAGE, response.status);
  }

  try {
    return {
      response,
      payload: (await response.json()) as T,
    };
  } catch {
    throw new ClientJsonError(DEFAULT_NON_JSON_MESSAGE, response.status);
  }
}
