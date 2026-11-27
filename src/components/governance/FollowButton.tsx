"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import type { WatchlistEntityType } from "@/types/citytrace";

export default function FollowButton({
  entityType,
  entityId,
  initialFollowing,
  signedIn,
  loginNext,
  compact = false,
}: {
  entityType: WatchlistEntityType;
  entityId: string;
  initialFollowing: boolean;
  signedIn: boolean;
  loginNext?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <Link
        href={`/login${loginNext ? `?next=${encodeURIComponent(loginNext)}` : ""}`}
        title="Sign in to follow updates in your watchlist"
        className={`inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white font-medium text-[#6E6E73] shadow-2xs transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F] ${
          compact ? "px-2.5 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]"
        }`}
      >
        <Bookmark className="h-3.5 w-3.5 text-[#007AFF]" />
        Follow
      </Link>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const payload = (await response.json()) as { following?: boolean };
      if (response.ok && typeof payload.following === "boolean") {
        setFollowing(payload.following);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      aria-pressed={following}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
        compact ? "px-2.5 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]"
      } ${
        following
          ? "border-[#007AFF]/30 bg-[#007AFF]/[0.1] font-semibold text-[#0055CC] hover:bg-[#007AFF]/[0.15]"
          : "border-black/[0.08] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]"
      }`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#007AFF]" />
      ) : following ? (
        <BookmarkCheck className="h-3.5 w-3.5 text-[#007AFF]" />
      ) : (
        <Bookmark className="h-3.5 w-3.5 text-[#6E6E73]" />
      )}
      {following ? "Following" : "Follow"}
    </button>
  );
}
