import Link from "next/link";

import {
  ERROR_STATE_PRIMARY_ACTION_CLASS_NAME,
  ErrorState,
} from "@/components/ui/error-state";
import { ErrorStateBackButton } from "@/components/ui/error-state-back-button";

export default function NotFound() {
  return (
    <div className="tp-page-bg min-h-screen px-4 py-16">
      <main>
        <ErrorState
          eyebrow="404"
          title="페이지를 찾을 수 없습니다."
          description="주소를 확인하거나 피드로 이동해 주세요."
          role="status"
          actions={
            <>
              <Link
                href="/feed"
                className={ERROR_STATE_PRIMARY_ACTION_CLASS_NAME}
              >
                피드로 이동
              </Link>
              <ErrorStateBackButton />
            </>
          }
        />
      </main>
    </div>
  );
}
