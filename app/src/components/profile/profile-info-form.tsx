"use client";

import { useState, useTransition } from "react";

import { updateProfileAction } from "@/server/actions/user";

type ProfileInfoFormProps = {
  initialNickname: string | null;
  initialBio: string | null;
  initialShowPublicPosts: boolean;
  initialShowPublicComments: boolean;
  initialShowPublicPets: boolean;
};

export function ProfileInfoForm({
  initialNickname,
  initialBio,
  initialShowPublicPosts,
  initialShowPublicComments,
  initialShowPublicPets,
}: ProfileInfoFormProps) {
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [showPublicPosts, setShowPublicPosts] = useState(initialShowPublicPosts);
  const [showPublicComments, setShowPublicComments] = useState(initialShowPublicComments);
  const [showPublicPets, setShowPublicPets] = useState(initialShowPublicPets);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      const result = await updateProfileAction({
        nickname,
        bio,
        showPublicPosts,
        showPublicComments,
        showPublicPets,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("프로필 정보가 저장되었습니다.");
    });
  };

  return (
    <section className="tp-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#153a6a]">프로필 정보 수정</h2>
      <div className="mt-4 grid gap-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          닉네임
          <input
            className="tp-input-soft px-3 py-2 text-sm"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={20}
          />
          <span className="text-[11px] text-[#5a7398]">
            닉네임은 설정/변경 후 30일 동안 다시 변경할 수 없습니다.
          </span>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          소개
          <textarea
            className="tp-input-soft min-h-[100px] px-3 py-2 text-sm"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={240}
            placeholder="나와 반려동물을 간단히 소개해 주세요."
          />
          <span className="text-[11px] text-[#5a7398]">{bio.length}/240</span>
        </label>
        <div className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] p-4">
          <p className="text-sm font-semibold text-[#1f3f71]">공개 범위</p>
          <p className="mt-1 text-[11px] text-[#5a7398]">
            공개 프로필은 로그인한 사용자에게만 보입니다. 아래 항목별로 상대방에게 노출할 범위를
            선택할 수 있습니다.
          </p>
          <div className="mt-3 grid gap-2">
            <label className="flex items-start gap-3 rounded-lg border border-[#dbe6f6] bg-white px-3 py-2 text-sm text-[#355988]">
              <input
                type="checkbox"
                checked={showPublicPosts}
                onChange={(event) => setShowPublicPosts(event.target.checked)}
                className="mt-0.5 h-4 w-4 border-[#bcd0ed]"
              />
              <span>
                <span className="block font-medium text-[#1f3f71]">내 게시글 공개</span>
                <span className="block text-[11px] text-[#5a7398]">
                  공개 프로필에서 내가 작성한 게시글 목록과 게시글 수를 보여줍니다.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-[#dbe6f6] bg-white px-3 py-2 text-sm text-[#355988]">
              <input
                type="checkbox"
                checked={showPublicComments}
                onChange={(event) => setShowPublicComments(event.target.checked)}
                className="mt-0.5 h-4 w-4 border-[#bcd0ed]"
              />
              <span>
                <span className="block font-medium text-[#1f3f71]">내 댓글 공개</span>
                <span className="block text-[11px] text-[#5a7398]">
                  공개 프로필에서 댓글 활동 목록과 댓글 수를 보여줍니다.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-[#dbe6f6] bg-white px-3 py-2 text-sm text-[#355988]">
              <input
                type="checkbox"
                checked={showPublicPets}
                onChange={(event) => setShowPublicPets(event.target.checked)}
                className="mt-0.5 h-4 w-4 border-[#bcd0ed]"
              />
              <span>
                <span className="block font-medium text-[#1f3f71]">반려동물 프로필 공개</span>
                <span className="block text-[11px] text-[#5a7398]">
                  공개 프로필에서 반려동물 사진과 품종/체급/생애단계 정보를 보여줍니다.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="tp-btn-primary inline-flex h-9 items-center justify-center px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "프로필 저장"}
        </button>
        {message ? <span className="text-xs text-[#4f678d]">{message}</span> : null}
      </div>
    </section>
  );
}
