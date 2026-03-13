type GuestAuthorLike = {
  displayName?: string | null;
  ipDisplay?: string | null;
  ipLabel?: string | null;
};

type GuestIdentityLike = Record<string, unknown> & {
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  guestAuthor?: GuestAuthorLike | null;
};

export function resolvePublicGuestDisplayName(displayName?: string | null) {
  const trimmed = typeof displayName === "string" ? displayName.trim() : "";
  return trimmed.length > 0 ? trimmed : "익명";
}

export function sanitizePublicGuestIdentity<T extends GuestIdentityLike>(value: T) {
  const publicValue = {
    ...value,
  } as T & {
    guestDisplayName?: string | null;
    guestIpDisplay?: string | null;
    guestIpLabel?: string | null;
    guestAuthor?: GuestAuthorLike | null;
  };

  delete publicValue.guestIpDisplay;
  delete publicValue.guestIpLabel;

  const guestAuthor = publicValue.guestAuthor;
  const sanitizedGuestAuthor =
    guestAuthor && typeof guestAuthor === "object"
      ? (() => {
          const nextGuestAuthor = { ...guestAuthor };
          delete nextGuestAuthor.ipDisplay;
          delete nextGuestAuthor.ipLabel;
          return nextGuestAuthor;
        })()
      : guestAuthor;
  const nestedDisplayName =
    sanitizedGuestAuthor &&
    typeof sanitizedGuestAuthor === "object" &&
    "displayName" in sanitizedGuestAuthor &&
    typeof sanitizedGuestAuthor.displayName === "string" &&
    sanitizedGuestAuthor.displayName.trim().length > 0
      ? sanitizedGuestAuthor.displayName
      : null;
  const safeGuestDisplayName =
    typeof publicValue.guestDisplayName === "string" && publicValue.guestDisplayName.trim().length > 0
      ? publicValue.guestDisplayName
      : nestedDisplayName;

  publicValue.guestDisplayName = safeGuestDisplayName;
  if (sanitizedGuestAuthor !== undefined) {
    publicValue.guestAuthor = sanitizedGuestAuthor;
  } else {
    delete publicValue.guestAuthor;
  }

  return publicValue as Omit<T, "guestIpDisplay" | "guestIpLabel"> & {
    guestDisplayName?: string | null;
    guestAuthor?: Omit<NonNullable<T["guestAuthor"]>, "ipDisplay" | "ipLabel"> | null;
  };
}

export function sanitizePublicGuestIdentityList<T extends GuestIdentityLike>(items: T[]) {
  return items.map((item) => sanitizePublicGuestIdentity(item));
}
