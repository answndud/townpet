export const APP_SHELL_HEADER_CLASS_NAME = [
  "border-b",
  "border-[#d8e4f6]",
  "bg-[#f4f8ffeb]",
  "backdrop-blur-sm",
  "sm:sticky",
  "sm:top-0",
  "sm:z-40",
].join(" ");

export function hasMobileStickyHeader(className: string) {
  const tokens = className.split(/\s+/).filter(Boolean);
  return tokens.includes("sticky") || tokens.includes("top-0");
}
