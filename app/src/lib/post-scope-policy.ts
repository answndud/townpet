import { PostType } from "@prisma/client";

const LOCAL_REQUIRED_POST_TYPES: ReadonlyArray<PostType> = [
  PostType.WALK_ROUTE,
  PostType.MEETUP,
  PostType.CARE_REQUEST,
];

export function isLocalRequiredPostType(type: PostType | null | undefined) {
  if (!type) {
    return false;
  }

  return LOCAL_REQUIRED_POST_TYPES.includes(type);
}
