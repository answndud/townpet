"use client";

const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const KAKAO_SDK_SCRIPT_ID = "townpet-kakao-js-sdk";

type KakaoShareLink = {
  mobileWebUrl: string;
  webUrl: string;
};

type KakaoDefaultFeedTemplate = {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: KakaoShareLink;
  };
  buttons: Array<{
    title: string;
    link: KakaoShareLink;
  }>;
};

type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (template: KakaoDefaultFeedTemplate) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let kakaoSdkLoadPromise: Promise<KakaoSdk> | null = null;

export type KakaoLostFoundShareInput = {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
};

export function getKakaoJavascriptKey() {
  return process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim() ?? "";
}

export function isKakaoShareConfigured() {
  return getKakaoJavascriptKey().length > 0;
}

function assertBrowserRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Kakao JavaScript SDK는 브라우저에서만 사용할 수 있습니다.");
  }
}

function resolveExistingKakaoSdk(key: string) {
  const kakao = window.Kakao;
  if (!kakao) {
    return null;
  }

  if (!kakao.isInitialized()) {
    kakao.init(key);
  }

  return kakao;
}

export async function loadKakaoSdk(key = getKakaoJavascriptKey()) {
  const javascriptKey = key.trim();
  if (!javascriptKey) {
    throw new Error("카카오 JavaScript 키가 설정되지 않았습니다.");
  }

  assertBrowserRuntime();

  const existingKakao = resolveExistingKakaoSdk(javascriptKey);
  if (existingKakao) {
    return existingKakao;
  }

  if (!kakaoSdkLoadPromise) {
    kakaoSdkLoadPromise = new Promise<KakaoSdk>((resolve, reject) => {
      const existingScript = document.getElementById(KAKAO_SDK_SCRIPT_ID) as HTMLScriptElement | null;
      const script = existingScript ?? document.createElement("script");

      const handleLoad = () => {
        script.dataset.townpetKakaoLoaded = "true";
        const kakao = resolveExistingKakaoSdk(javascriptKey);
        if (!kakao) {
          reject(new Error("카카오 JavaScript SDK를 초기화하지 못했습니다."));
          return;
        }
        resolve(kakao);
      };

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error("카카오 JavaScript SDK를 불러오지 못했습니다.")),
        { once: true },
      );

      if (!existingScript) {
        script.id = KAKAO_SDK_SCRIPT_ID;
        script.async = true;
        script.src = KAKAO_SDK_SRC;
        document.head.appendChild(script);
      } else if (script.dataset.townpetKakaoLoaded === "true") {
        queueMicrotask(handleLoad);
      }
    }).catch((error) => {
      kakaoSdkLoadPromise = null;
      throw error;
    });
  }

  return kakaoSdkLoadPromise;
}

export function buildKakaoLostFoundFeedTemplate(input: KakaoLostFoundShareInput): KakaoDefaultFeedTemplate {
  return {
    objectType: "feed",
    content: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      link: {
        mobileWebUrl: input.url,
        webUrl: input.url,
      },
    },
    buttons: [
      {
        title: "제보 보기",
        link: {
          mobileWebUrl: input.url,
          webUrl: input.url,
        },
      },
    ],
  };
}

export async function sendKakaoLostFoundShare(input: KakaoLostFoundShareInput) {
  const kakao = await loadKakaoSdk();
  kakao.Share.sendDefault(buildKakaoLostFoundFeedTemplate(input));
}
