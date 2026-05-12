type GuestMetaFields = {
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  guestPasswordHash?: string | null;
  guestIpHash?: string | null;
  guestFingerprintHash?: string | null;
};

export function withEmptyGuestPostMetaOne<T extends object>(
  item: T | null,
): (T & GuestMetaFields) | null {
  if (!item) {
    return null;
  }
  return {
    ...item,
    guestDisplayName: null,
    guestIpDisplay: null,
    guestIpLabel: null,
    guestPasswordHash: null,
    guestIpHash: null,
    guestFingerprintHash: null,
  };
}

export function withEmptyGuestPostMeta<T extends object>(items: T[]): Array<T & GuestMetaFields> {
  return items.map((item) => ({
    ...item,
    guestDisplayName: null,
    guestIpDisplay: null,
    guestIpLabel: null,
    guestPasswordHash: null,
    guestIpHash: null,
    guestFingerprintHash: null,
  }));
}
