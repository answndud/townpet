export const APP_SHELL_HEADER_CLASS_NAME = [
  "border-b",
  "border-[#d8e4f6]",
  "bg-[#f4f8ffeb]",
  "backdrop-blur-sm",
  "sm:sticky",
  "sm:top-0",
  "sm:z-40",
].join(" ");

export function isPublicAcquisitionHeaderPath(pathname: string | null | undefined) {
  if (!pathname) {
    return false;
  }

  return (
    pathname === "/" ||
    pathname.startsWith("/guides/") ||
    pathname === "/campaigns/neighborhood-map" ||
    pathname.startsWith("/towns/")
  );
}

export const APP_SHELL_NAV_LINK_CLASS_NAME = [
  "inline-flex",
  "h-9",
  "items-center",
  "rounded-md",
  "px-3",
  "text-[13px]",
  "font-medium",
  "leading-none",
  "text-[#315484]",
  "transition",
  "hover:bg-[#dcecff]",
  "hover:text-[#1f4f8f]",
].join(" ");

export const APP_SHELL_NAV_LINK_ACTIVE_CLASS_NAME = [
  "border",
  "border-[#b8d1f2]",
  "bg-white/95",
  "text-[#173963]",
  "shadow-[inset_0_-2px_0_#3567b5]",
].join(" ");

export function getAppShellNavLinkClassName(active = false, extraClassName = "") {
  return [
    APP_SHELL_NAV_LINK_CLASS_NAME,
    active ? APP_SHELL_NAV_LINK_ACTIVE_CLASS_NAME : "",
    extraClassName,
  ]
    .filter(Boolean)
    .join(" ");
}

export function isHeaderNavActive(
  pathname: string | null | undefined,
  section: "board" | "profile" | "notifications" | "admin" | "login",
) {
  if (!pathname) {
    return false;
  }

  if (section === "board") {
    return (
      pathname === "/feed" ||
      pathname.startsWith("/feed/") ||
      pathname.startsWith("/boards/") ||
      pathname.startsWith("/posts/") ||
      pathname === "/search" ||
      pathname.startsWith("/search/")
    );
  }

  if (section === "profile") {
    return pathname === "/profile" || pathname === "/my-posts" || pathname === "/bookmarks" || pathname === "/saved";
  }

  if (section === "notifications") {
    return pathname === "/notifications" || pathname.startsWith("/notifications/");
  }

  if (section === "admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }

  return pathname === "/login";
}

export const APP_SHELL_DESKTOP_NAV_CLUSTER_CLASS_NAME = [
  "items-center",
  "gap-1.5",
].join(" ");

export const APP_SHELL_DESKTOP_SEARCH_INPUT_CLASS_NAME = [
  "h-9",
  "w-[150px]",
  "rounded-md",
  "border",
  "border-[#dbe6f6]",
  "bg-white/92",
  "px-3",
  "text-[13px]",
  "leading-none",
  "text-[#315484]",
  "outline-none",
  "transition",
  "placeholder:text-[#6a84ab]",
  "focus:border-[#bcd4f4]",
  "focus:bg-white",
  "sm:w-[190px]",
].join(" ");

export const APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME = [
  "inline-flex",
  "min-h-9",
  "items-center",
  "rounded-md",
  "border",
  "border-[#d7e4f8]",
  "bg-white/92",
  "px-2",
  "text-[11px]",
  "font-semibold",
  "leading-none",
  "text-[#315484]",
  "transition",
  "hover:bg-[#eef5ff]",
  "focus-visible:border-[#4e89d8]",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-[#4e89d8]/25",
].join(" ");

export const APP_SHELL_MOBILE_QUICK_LINK_ACTIVE_CLASS_NAME = [
  "border-[#b8d1f2]",
  "bg-white",
  "text-[#173963]",
  "shadow-[inset_0_-2px_0_#3567b5]",
].join(" ");

export function getAppShellMobileQuickLinkClassName(active = false, extraClassName = "") {
  return [
    APP_SHELL_MOBILE_QUICK_LINK_CLASS_NAME,
    active ? APP_SHELL_MOBILE_QUICK_LINK_ACTIVE_CLASS_NAME : "",
    extraClassName,
  ]
    .filter(Boolean)
    .join(" ");
}

export const APP_SHELL_MOBILE_DISCLOSURE_ROW_CLASS_NAME = [
  "flex",
  "flex-wrap",
  "gap-1.5",
].join(" ");

export const APP_SHELL_MOBILE_DISCLOSURE_TRIGGER_CLASS_NAME = [
  "inline-flex",
  "min-h-9",
  "items-center",
  "justify-center",
  "rounded-md",
  "border",
  "border-[#d7e4f8]",
  "bg-white/92",
  "px-2.5",
  "text-[11px]",
  "font-semibold",
  "leading-none",
  "text-[#315484]",
  "transition",
  "hover:bg-[#eef5ff]",
  "focus-visible:border-[#4e89d8]",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-[#4e89d8]/25",
].join(" ");

export function getAppShellMobileDisclosureTriggerClassName(active = false) {
  return [
    APP_SHELL_MOBILE_DISCLOSURE_TRIGGER_CLASS_NAME,
    active ? APP_SHELL_MOBILE_QUICK_LINK_ACTIVE_CLASS_NAME : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const APP_SHELL_MOBILE_PANEL_CLASS_NAME = [
  "overflow-hidden",
  "rounded-xl",
  "border",
  "border-[#dbe6f6]",
  "bg-white/92",
  "shadow-[0_10px_20px_rgba(16,40,74,0.06)]",
].join(" ");

export const APP_SHELL_MOBILE_PANEL_SUMMARY_CLASS_NAME = [
  "flex",
  "cursor-pointer",
  "list-none",
  "items-start",
  "justify-between",
  "gap-3",
  "px-3",
  "py-2.5",
].join(" ");

export const APP_SHELL_MOBILE_PANEL_PILL_CLASS_NAME = [
  "inline-flex",
  "items-center",
  "min-h-8",
  "rounded-md",
  "border",
  "border-[#c9daf4]",
  "bg-white",
  "px-2",
  "py-0.5",
  "text-[11px]",
  "font-semibold",
  "text-[#315b9a]",
  "transition",
  "hover:bg-[#f5f9ff]",
].join(" ");

export function hasMobileStickyHeader(className: string) {
  const tokens = className.split(/\s+/).filter(Boolean);
  return tokens.includes("sticky") || tokens.includes("top-0");
}

export function shouldRefreshViewerShellOnFocus(pathname?: string | null) {
  return !pathname?.startsWith("/feed");
}
