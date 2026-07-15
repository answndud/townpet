import { CareRequestStatus, UserRole } from "@prisma/client";

export const AUTHOR_CARE_STATUS_TRANSITIONS: Record<CareRequestStatus, CareRequestStatus[]> = {
  [CareRequestStatus.OPEN]: [CareRequestStatus.CANCELLED],
  [CareRequestStatus.MATCHED]: [CareRequestStatus.IN_PROGRESS, CareRequestStatus.CANCELLED],
  [CareRequestStatus.IN_PROGRESS]: [CareRequestStatus.COMPLETED],
  [CareRequestStatus.COMPLETED]: [],
  [CareRequestStatus.CANCELLED]: [],
};

export const ACCEPTED_APPLICANT_CARE_STATUS_TRANSITIONS: Record<
  CareRequestStatus,
  CareRequestStatus[]
> = {
  [CareRequestStatus.OPEN]: [],
  [CareRequestStatus.MATCHED]: [CareRequestStatus.IN_PROGRESS],
  [CareRequestStatus.IN_PROGRESS]: [CareRequestStatus.COMPLETED],
  [CareRequestStatus.COMPLETED]: [],
  [CareRequestStatus.CANCELLED]: [],
};

export function canAuthorTransitionCareStatus(
  from: CareRequestStatus,
  to: CareRequestStatus,
) {
  return AUTHOR_CARE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canAcceptedApplicantTransitionCareStatus(
  from: CareRequestStatus,
  to: CareRequestStatus,
) {
  return ACCEPTED_APPLICANT_CARE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canModerateCareStatus(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.MODERATOR;
}
