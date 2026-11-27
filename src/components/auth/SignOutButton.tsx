"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

export default function SignOutButton({
  className = "",
  redirectTo,
  label = "Sign out",
  onSignedOut,
}: {
  className?: string;
  redirectTo?: string;
  label?: string;
  onSignedOut?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      onSignedOut?.();
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={busy}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-[#1D1D1F] shadow-xs transition-colors hover:border-[#FF3B30]/30 hover:bg-[#FF3B30]/[0.06] hover:text-[#C9241B] disabled:opacity-60 cursor-pointer"
      }
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
