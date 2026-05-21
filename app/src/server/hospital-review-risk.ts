const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const HOSPITAL_REVIEW_RISK_SIGNALS = {
  NEW_ACCOUNT: "NEW_ACCOUNT",
  SAME_HOSPITAL_REPEAT: "SAME_HOSPITAL_REPEAT",
  REVIEW_BURST: "REVIEW_BURST",
  RISKY_CLAIM_TERMS: "RISKY_CLAIM_TERMS",
} as const;

const RISKY_CLAIM_TERMS = ["과잉진료", "사기", "최악", "돌팔이", "고소"] as const;

export type HospitalReviewRiskSignal =
  (typeof HOSPITAL_REVIEW_RISK_SIGNALS)[keyof typeof HOSPITAL_REVIEW_RISK_SIGNALS];

export function buildHospitalReviewRiskSignals(params: {
  accountCreatedAt: Date;
  sameHospitalReviewCount30d: number;
  recentHospitalReviewCount7d: number;
  text?: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const signals: HospitalReviewRiskSignal[] = [];

  if (now.getTime() - params.accountCreatedAt.getTime() < NEW_ACCOUNT_WINDOW_MS) {
    signals.push(HOSPITAL_REVIEW_RISK_SIGNALS.NEW_ACCOUNT);
  }

  if (params.sameHospitalReviewCount30d >= 1) {
    signals.push(HOSPITAL_REVIEW_RISK_SIGNALS.SAME_HOSPITAL_REPEAT);
  }

  if (params.recentHospitalReviewCount7d >= 3) {
    signals.push(HOSPITAL_REVIEW_RISK_SIGNALS.REVIEW_BURST);
  }

  const matchedTerms = RISKY_CLAIM_TERMS.filter((term) => params.text?.includes(term));
  if (matchedTerms.length > 0) {
    signals.push(HOSPITAL_REVIEW_RISK_SIGNALS.RISKY_CLAIM_TERMS);
  }

  return {
    signals,
    matchedTerms,
    flagged: signals.length > 0,
  };
}
