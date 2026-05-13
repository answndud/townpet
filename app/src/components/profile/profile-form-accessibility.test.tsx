import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NeighborhoodPreferenceForm } from "@/components/profile/neighborhood-preference-form";
import { ProfileImageUploader } from "@/components/profile/profile-image-uploader";
import { ProfileInfoForm } from "@/components/profile/profile-info-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server/actions/user", () => ({
  setPrimaryNeighborhoodAction: vi.fn(),
  updateProfileAction: vi.fn(),
  updateProfileImageAction: vi.fn(),
}));

vi.mock("@/components/ui/image-upload-field", () => ({
  ImageUploadField: () => <div data-testid="image-upload-field" />,
}));

describe("profile form accessibility", () => {
  it("keeps profile info submit mobile-safe", () => {
    const html = renderToStaticMarkup(
      <ProfileInfoForm
        initialNickname="타운펫"
        initialBio="반려 생활 기록"
        initialShowPublicPosts
        initialShowPublicComments
        initialShowPublicPets
      />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("프로필 저장");
  });

  it("keeps neighborhood save action mobile-safe", () => {
    const html = renderToStaticMarkup(
      <NeighborhoodPreferenceForm selectedNeighborhoods={[]} primaryNeighborhoodId={null} />,
    );

    expect(html).toContain("min-h-10");
    expect(html).toContain("동네 저장");
  });

  it("keeps profile image save action mobile-safe", () => {
    const html = renderToStaticMarkup(<ProfileImageUploader initialImageUrl={null} />);

    expect(html).toContain("min-h-10");
    expect(html).toContain("프로필 사진 저장");
  });
});
