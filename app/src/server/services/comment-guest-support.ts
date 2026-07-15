import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

import { hashGuestIdentityCandidates } from "@/server/services/guest-safety.service";

export function verifyGuestCommentPassword(rawPassword: string, stored: string) {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const actual = scryptSync(rawPassword, salt, 32);
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function hashGuestCommentPassword(rawPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(rawPassword, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export function matchesGuestCommentIdentity(
  params: {
    guestIpHash: string | null;
    guestFingerprintHash: string | null;
  },
  identity: {
    ip: string;
    fingerprint?: string;
  },
) {
  const { ipHashes, fingerprintHashes } = hashGuestIdentityCandidates(identity);
  return Boolean(
    (params.guestIpHash && ipHashes.includes(params.guestIpHash)) ||
      (params.guestFingerprintHash && fingerprintHashes.includes(params.guestFingerprintHash)),
  );
}

export function resolveGuestCommentCredential(params: {
  guestAuthorId?: string | null;
  guestAuthor?: {
    passwordHash: string;
    ipHash: string;
    fingerprintHash: string | null;
  } | null;
}) {
  return {
    passwordHash: params.guestAuthor?.passwordHash ?? null,
    ipHash: params.guestAuthor?.ipHash ?? null,
    fingerprintHash: params.guestAuthor?.fingerprintHash ?? null,
    hasGuestMarker: Boolean(params.guestAuthorId || params.guestAuthor),
  };
}
