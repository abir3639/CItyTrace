"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, LogIn } from "lucide-react";
import { USER_ROLE_LABELS, type UserRole } from "@/types/citytrace";
import { getDepartment } from "@/lib/departments";

const DEMO_TARGET_BY_ROLE: Record<UserRole, { userId: string; label: string }> = {
  citizen: { userId: "USR-001", label: "Citizen Demo (Farhana Rahman)" },
  verifier: { userId: "USR-003", label: "Verifier Demo (Nusrat Jahan)" },
  official: { userId: "USR-004", label: "Official Demo (Engr. Mahmudul)" },
};

const ROLE_ACCENT: Record<UserRole, string> = {
  citizen: "border-[#007AFF]/20 bg-[#007AFF]/[0.06]",
  verifier: "border-[#AF52DE]/25 bg-[#AF52DE]/[0.07]",
  official: "border-[#FF9500]/25 bg-[#FF9500]/[0.08]",
};

export default function PermissionLockBanner({
  title,
  reason,
  requiredRole,
  requiredDepartmentId,
  demoEnabled = true,
  loginNext,
  isGuest = false,
}: {
  title: string;
  reason: string;
  requiredRole?: UserRole;
  requiredDepartmentId?: string;
  demoEnabled?: boolean;
  loginNext?: string;
  isGuest?: boolean;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dept = getDepartment(requiredDepartmentId);
  const targetDemo =
    requiredRole === "official" && requiredDepartmentId === "DEPT-DRAINAGE"
      ? { userId: "USR-005", label: "Official Demo (Drainage Dept)" }
      : requiredRole
        ? DEMO_TARGET_BY_ROLE[requiredRole]
        : null;

  const handleDemoSwitch = async () => {
    if (!targetDemo) return;
    setSwitching(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetDemo.userId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Demo switch unavailable.");
        return;
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setSwitching(false);
    }
  };

  const accent = requiredRole
    ? ROLE_ACCENT[requiredRole]
    : "border-black/[0.08] bg-[#F5F5F7]";

  return (
    <div
      className={`rounded-[16px] border p-3.5 backdrop-blur-md ${accent}`}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/90 text-[#1D1D1F] shadow-2xs">
          <Lock className="h-3.5 w-3.5 text-[#6E6E73]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-[#1D1D1F]">{title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#48484A]">{reason}</p>
          {requiredRole ? (
            <p className="mt-1 text-[11px] font-medium text-[#6E6E73]">
              Authorized: {USER_ROLE_LABELS[requiredRole]}
              {dept ? ` (${dept.shortName})` : ""}
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {isGuest && loginNext ? (
              <Link
                href={`/login?next=${encodeURIComponent(loginNext)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#0066D6]"
              >
                <LogIn className="h-3 w-3" />
                Sign in
              </Link>
            ) : null}

            {demoEnabled && targetDemo ? (
              <button
                type="button"
                disabled={switching}
                onClick={() => void handleDemoSwitch()}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.1] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1D1D1F] shadow-2xs transition-colors hover:bg-[#F5F5F7] disabled:opacity-60 cursor-pointer"
              >
                {switching ? (
                  <Loader2 className="h-3 w-3 animate-spin text-[#007AFF]" />
                ) : (
                  <ArrowRight className="h-3 w-3 text-[#007AFF]" />
                )}
                Switch to {targetDemo.label}
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="mt-1.5 text-[11.5px] text-[#C9241B]">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
