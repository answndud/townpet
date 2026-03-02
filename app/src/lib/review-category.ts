export const REVIEW_CATEGORY_VALUES = [
  "SUPPLIES",
  "FEED",
  "SNACK",
  "TOY",
  "PLACE",
  "ETC",
] as const;

export type ReviewCategory = (typeof REVIEW_CATEGORY_VALUES)[number];

export const REVIEW_CATEGORY = {
  SUPPLIES: "SUPPLIES",
  FEED: "FEED",
  SNACK: "SNACK",
  TOY: "TOY",
  PLACE: "PLACE",
  ETC: "ETC",
} as const satisfies Record<ReviewCategory, ReviewCategory>;
