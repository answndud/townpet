export function getLostFoundAlertTypeLabel(alertType?: string | null) {
  return alertType === "FOUND" ? "목격/보호" : "실종";
}

export function getLostFoundStatusLabel(status?: string | null) {
  if (status === "RESOLVED") {
    return "해결됨";
  }

  if (status === "CLOSED") {
    return "종료";
  }

  return "제보 접수 중";
}
