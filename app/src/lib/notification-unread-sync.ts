type NotificationUnreadSyncPayload = {
  delta?: number;
  resetTo?: number;
  markReadIds?: string[];
  archiveIds?: string[];
};

const NOTIFICATION_UNREAD_SYNC_EVENT = "townpet:notification-unread-sync";
const NOTIFICATION_UNREAD_SYNC_STORAGE_KEY = "townpet:notification-unread-sync";

export function emitNotificationUnreadSync(payload: NotificationUnreadSyncPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<NotificationUnreadSyncPayload>(NOTIFICATION_UNREAD_SYNC_EVENT, {
      detail: payload,
    }),
  );

  try {
    globalThis.localStorage?.setItem(
      NOTIFICATION_UNREAD_SYNC_STORAGE_KEY,
      JSON.stringify({
        ...payload,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore storage sync failures and keep local event delivery.
  }
}

export function subscribeNotificationUnreadSync(
  listener: (payload: NotificationUnreadSyncPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<NotificationUnreadSyncPayload>;
    listener(custom.detail ?? {});
  };

  window.addEventListener(NOTIFICATION_UNREAD_SYNC_EVENT, handler as EventListener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== NOTIFICATION_UNREAD_SYNC_STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as NotificationUnreadSyncPayload;
      listener(payload);
    } catch {
      // Ignore invalid storage payloads.
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(NOTIFICATION_UNREAD_SYNC_EVENT, handler as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
}
