export type LostFoundPrivacySignal =
  | "phone"
  | "email"
  | "open_kakao"
  | "messenger_link"
  | "kakao_id"
  | "detailed_address";

const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const phonePattern = /\b(?:01[016789]|02|0[3-9][0-9])[-.\s]?\d{3,4}[-.\s]?\d{4}\b/;
const openKakaoPattern = /\bhttps?:\/\/open\.kakao\.com\/[^\s)]+/i;
const messengerLinkPattern = /\bhttps?:\/\/(?:t\.me|wa\.me|line\.me)\/[^\s)]+/i;
const kakaoIdPattern = /(카카오톡|카톡)\s*(아이디|id)?\s*[:：]?\s*([A-Za-z0-9._-]{3,20})/i;
const detailedAddressPattern =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s+[가-힣A-Za-z0-9\s.-]{2,40}(?:로|길|번길)\s*\d{1,5}(?:-\d{1,5})?/;

const signalLabel: Record<LostFoundPrivacySignal, string> = {
  phone: "전화번호",
  email: "이메일",
  open_kakao: "오픈채팅 링크",
  messenger_link: "메신저 링크",
  kakao_id: "카카오톡 아이디",
  detailed_address: "상세 주소",
};

export function detectLostFoundPublicPrivacySignals(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) {
    return [] as LostFoundPrivacySignal[];
  }

  const signals = new Set<LostFoundPrivacySignal>();
  if (phonePattern.test(text)) signals.add("phone");
  if (emailPattern.test(text)) signals.add("email");
  if (openKakaoPattern.test(text)) signals.add("open_kakao");
  if (messengerLinkPattern.test(text)) signals.add("messenger_link");
  if (kakaoIdPattern.test(text)) signals.add("kakao_id");
  if (detailedAddressPattern.test(text)) signals.add("detailed_address");

  return Array.from(signals);
}

export function buildLostFoundPublicPrivacyMessage(signals: LostFoundPrivacySignal[]) {
  if (signals.length === 0) {
    return null;
  }

  const labels = signals.map((signal) => signalLabel[signal]).join(", ");
  return `분실동물 공개 정보에는 ${labels}를 직접 적지 말고, 동네·공원·역·상가명처럼 확인 가능한 범위로 줄여 주세요.`;
}
