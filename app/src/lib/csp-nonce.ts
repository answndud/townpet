import { headers } from "next/headers";

export async function getCspNonce() {
  const requestHeaders = await headers();
  const rawNonce = requestHeaders.get("x-nonce") ?? requestHeaders.get("x-csp-nonce");
  const nonce = rawNonce?.trim();
  return nonce ? nonce : undefined;
}
