type ViewerShellSyncPayload = {
  reason?: string;
};

const VIEWER_SHELL_SYNC_EVENT = "townpet:viewer-shell-sync";

export function emitViewerShellSync(payload: ViewerShellSyncPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ViewerShellSyncPayload>(VIEWER_SHELL_SYNC_EVENT, {
      detail: payload,
    }),
  );
}

export function subscribeViewerShellSync(
  listener: (payload: ViewerShellSyncPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<ViewerShellSyncPayload>;
    listener(custom.detail ?? {});
  };

  window.addEventListener(VIEWER_SHELL_SYNC_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(VIEWER_SHELL_SYNC_EVENT, handler as EventListener);
  };
}
