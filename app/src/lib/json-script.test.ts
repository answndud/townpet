import { describe, expect, it } from "vitest";

import { serializeJsonForScriptTag } from "@/lib/json-script";

describe("serializeJsonForScriptTag", () => {
  it("escapes closing script tags so inline JSON cannot break out", () => {
    const serialized = serializeJsonForScriptTag({
      headline: '</script><script>alert("xss")</script>',
    });

    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003C/script\\u003E\\u003Cscript\\u003Ealert(\\\"xss\\\")\\u003C/script\\u003E");
  });

  it("escapes line separator characters that are unsafe in inline scripts", () => {
    const serialized = serializeJsonForScriptTag({
      text: "before\u2028middle\u2029after",
    });

    expect(serialized).toContain("before\\u2028middle\\u2029after");
    expect(serialized).not.toContain("before\u2028middle\u2029after");
  });

  it("falls back to null when JSON.stringify returns undefined", () => {
    expect(serializeJsonForScriptTag(undefined)).toBe("null");
  });
});
