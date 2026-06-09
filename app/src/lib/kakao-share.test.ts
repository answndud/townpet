import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildKakaoLostFoundFeedTemplate,
  getKakaoJavascriptKey,
  isKakaoShareConfigured,
  loadKakaoSdk,
  sendKakaoLostFoundShare,
} from "@/lib/kakao-share";

describe("kakao share helper", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is disabled without an explicit public JavaScript key", () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY", "");

    expect(getKakaoJavascriptKey()).toBe("");
    expect(isKakaoShareConfigured()).toBe(false);
  });

  it("uses only the public JavaScript key for client SDK initialization", () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY", " public-js-key ");

    expect(getKakaoJavascriptKey()).toBe("public-js-key");
    expect(isKakaoShareConfigured()).toBe(true);
  });

  it("builds a default feed template without private contact prompts", () => {
    const template = buildKakaoLostFoundFeedTemplate({
      title: "[TownPet] 우리 동네 실종 강아지 제보 요청",
      description: "실종 · 제보 접수 중 · 강아지 · 망원시장 근처",
      imageUrl: "https://townpet.vercel.app/api/posts/post-1/lost-found-share.svg?format=png",
      url: "https://townpet.vercel.app/posts/post-1/guest",
    });

    expect(template).toEqual({
      objectType: "feed",
      content: {
        title: "[TownPet] 우리 동네 실종 강아지 제보 요청",
        description: "실종 · 제보 접수 중 · 강아지 · 망원시장 근처",
        imageUrl: "https://townpet.vercel.app/api/posts/post-1/lost-found-share.svg?format=png",
        link: {
          mobileWebUrl: "https://townpet.vercel.app/posts/post-1/guest",
          webUrl: "https://townpet.vercel.app/posts/post-1/guest",
        },
      },
      buttons: [
        {
          title: "제보 보기",
          link: {
            mobileWebUrl: "https://townpet.vercel.app/posts/post-1/guest",
            webUrl: "https://townpet.vercel.app/posts/post-1/guest",
          },
        },
      ],
    });
    expect(JSON.stringify(template)).not.toContain("오픈채팅");
    expect(JSON.stringify(template)).not.toContain("전화번호");
  });

  it("initializes an already available Kakao SDK", async () => {
    const init = vi.fn();
    const kakao = {
      init,
      isInitialized: vi.fn(() => false),
      Share: {
        sendDefault: vi.fn(),
      },
    };
    vi.stubGlobal("window", { Kakao: kakao });
    vi.stubGlobal("document", {});

    const loadedKakao = await loadKakaoSdk("public-js-key");

    expect(loadedKakao).toBe(kakao);
    expect(init).toHaveBeenCalledWith("public-js-key");
  });

  it("rejects when the JavaScript key is missing", async () => {
    await expect(loadKakaoSdk("")).rejects.toThrow("카카오 JavaScript 키가 설정되지 않았습니다.");
  });

  it("sends the lost-found default feed template through Kakao Share", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY", "public-js-key");
    const sendDefault = vi.fn();
    vi.stubGlobal("window", {
      Kakao: {
        init: vi.fn(),
        isInitialized: vi.fn(() => true),
        Share: { sendDefault },
      },
    });
    vi.stubGlobal("document", {});

    await sendKakaoLostFoundShare({
      title: "[TownPet] 제보 요청",
      description: "실종 · 강아지",
      imageUrl: "https://townpet.vercel.app/api/posts/post-1/lost-found-share.svg?format=png",
      url: "https://townpet.vercel.app/posts/post-1/guest",
    });

    expect(sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        objectType: "feed",
        content: expect.objectContaining({
          title: "[TownPet] 제보 요청",
        }),
      }),
    );
  });
});
