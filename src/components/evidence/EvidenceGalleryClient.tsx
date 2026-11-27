"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileText,
  Flag,
  Loader2,
  Radio,
  Ruler,
  Satellite,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import {
  EVIDENCE_CATEGORY_LABELS,
  type Evidence,
  type EvidenceKind,
  type PublicUser,
} from "@/types/citytrace";
import { canUserPerform } from "@/lib/permissions";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import { formatDate } from "@/utils/formatters";

const KIND_META: Record<
  EvidenceKind,
  { label: string; icon: typeof Camera; hue: number }
> = {
  photo: { label: "Photograph", icon: Camera, hue: 211 },
  document: { label: "Document", icon: FileText, hue: 36 },
  measurement: { label: "Measurement", icon: Ruler, hue: 145 },
  satellite: { label: "Satellite tile", icon: Satellite, hue: 224 },
  sensor: { label: "Sensor log", icon: Radio, hue: 262 },
};

function hashOf(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100_000;
  }
  return hash;
}

const STATUS_PILL = {
  verified: "border-[#34C759]/30 bg-white/92 text-[#1A7F37]",
  flagged: "border-[#FF3B30]/35 bg-white/94 text-[#C9241B]",
  unverified: "border-[#FF9500]/30 bg-white/92 text-[#B25000]",
} as const;

const STATUS_LABEL = {
  verified: "Verified",
  flagged: "Flagged",
  unverified: "Unverified",
} as const;

export default function EvidenceGalleryClient({
  items: initialItems,
  currentUser,
}: {
  items: Evidence[];
  currentUser: PublicUser | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Evidence[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [action, setAction] = useState<"verified" | "flagged" | "revoked">("verified");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-[#B25000]">
        No evidence has been filed for this record yet.
      </p>
    );
  }

  const submitModeration = async (evId: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/evidence/${evId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const payload = (await response.json()) as { evidence?: Evidence; error?: string };
      if (!response.ok || !payload.evidence) {
        setError(payload.error ?? `Moderation failed with HTTP ${response.status}.`);
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === evId ? payload.evidence! : item))
      );
      setActiveId(null);
      setReason("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const meta = KIND_META[item.kind];
        const Icon = meta.icon;
        const hash = hashOf(item.id);
        const hue = (meta.hue + (hash % 18) - 9 + 360) % 360;
        const status = item.status ?? (item.verified ? "verified" : "unverified");
        const perm = canUserPerform(currentUser, "verify_evidence", { evidence: item });
        const isOwnUpload =
          Boolean(currentUser && item.uploadedBy?.id === currentUser.id);
        const historyOpen = expandedHistoryId === item.id;
        const moderating = activeId === item.id;

        return (
          <figure
            key={item.id}
            className="flex flex-col overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
          >
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: "16 / 9",
                background: `linear-gradient(135deg var(--in-oklab), hsl(${hue} 45% 94%) 0%, hsl(${(hue + 12) % 360} 38% 89%) 100%)`,
              }}
            >
              {item.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.dataUrl}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}

              <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:20px_20px]" />
              <Icon className="absolute right-2.5 bottom-2.5 h-6 w-6 text-[#1D1D1F]/15" />

              <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-black/[0.07] bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#1D1D1F] backdrop-blur-sm">
                  {item.category ? EVIDENCE_CATEGORY_LABELS[item.category] : meta.label}
                </span>
              </div>

              <span
                className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold backdrop-blur-sm ${STATUS_PILL[status]}`}
                title={item.verificationReason}
              >
                {status === "verified" ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : status === "flagged" ? (
                  <Flag className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {STATUS_LABEL[status]}
              </span>
            </div>

            <figcaption className="flex flex-1 flex-col gap-2 p-3.5">
              <div>
                <p className="text-[13px] font-semibold leading-snug text-[#1D1D1F]">
                  {item.title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#48484A]">
                  {item.description}
                </p>
              </div>

              {/* Uploader & Timestamp */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] pt-2 text-[11px] text-[#6E6E73]">
                {item.uploadedBy ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#1D1D1F]">
                    <UserAvatar
                      initials={item.uploadedBy.initials}
                      color={item.uploadedBy.avatarColor}
                      size="xs"
                      className="h-4 w-4 text-[8px] ring-0"
                    />
                    {item.uploadedBy.name}
                    <RolePill role={item.uploadedBy.role} />
                  </span>
                ) : (
                  <span>{item.source}</span>
                )}
                <span className="tabular-nums">
                  {formatDate(item.uploadedAt ?? item.capturedAt)}
                  {item.ref ? ` · ${item.ref}` : ""}
                </span>
              </div>

              {/* Verification metadata */}
              {item.verifiedBy ? (
                <div
                  className={`rounded-[10px] px-2.5 py-2 text-[11.5px] ${
                    status === "flagged"
                      ? "border border-[#FF3B30]/20 bg-[#FF3B30]/[0.06] text-[#C9241B]"
                      : "border border-[#34C759]/20 bg-[#34C759]/[0.07] text-[#1A7F37]"
                  }`}
                >
                  <p className="font-semibold">
                    {status === "flagged" ? "Flagged" : "Verified"} by {item.verifiedBy.name} (
                    {formatDate(item.verifiedAt ?? item.capturedAt)})
                  </p>
                  {item.verificationReason ? (
                    <p className="mt-0.5 text-[#48484A]">“{item.verificationReason}”</p>
                  ) : null}
                </div>
              ) : null}

              {/* History toggle */}
              {item.verificationHistory && item.verificationHistory.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedHistoryId(historyOpen ? null : item.id)
                  }
                  className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      historyOpen ? "rotate-180" : ""
                    }`}
                  />
                  Verification log ({item.verificationHistory.length})
                </button>
              ) : null}

              {historyOpen && item.verificationHistory ? (
                <ul className="space-y-1.5 rounded-[10px] bg-[#F5F5F7] p-2.5 text-[11px]">
                  {item.verificationHistory.map((ev) => (
                    <li key={ev.id} className="text-[#48484A]">
                      <span className="font-semibold text-[#1D1D1F]">{ev.action}</span> by{" "}
                      {ev.actor.name} · {formatDate(ev.at)} — “{ev.reason}”
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Verifier moderation bar */}
              {currentUser?.role === "verifier" ? (
                isOwnUpload ? (
                  <p className="mt-auto rounded-[10px] border border-black/[0.06] bg-[#F5F5F7] px-2.5 py-1.5 text-[11px] text-[#6E6E73]">
                    Self-verification blocked — you uploaded this item.
                  </p>
                ) : perm.allowed ? (
                  <div className="mt-auto border-t border-black/[0.05] pt-2">
                    {moderating ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              ["verified", "Verify"],
                              ["flagged", "Flag"],
                              ...(status !== "unverified"
                                ? [["revoked", "Revoke"] as const]
                                : []),
                            ] as const
                          ).map(([opt, label]) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAction(opt)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                                action === opt
                                  ? "bg-[#1D1D1F] text-white"
                                  : "bg-[#F0F2F5] text-[#48484A]"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Mandatory verification/flag reason…"
                          className="w-full rounded-[10px] border border-black/[0.08] bg-[#F5F5F7] px-2.5 py-1.5 text-[11.5px] text-[#1D1D1F] focus:border-[#007AFF] focus:bg-white focus:outline-none"
                        />
                        {error ? (
                          <p className="text-[11px] text-[#C9241B]">{error}</p>
                        ) : null}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void submitModeration(item.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#007AFF] px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-[#0066D6] disabled:opacity-60 cursor-pointer"
                          >
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveId(null);
                              setError(null);
                            }}
                            className="rounded-full px-2.5 py-1 text-[11.5px] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId(item.id);
                            setAction("verified");
                            setReason("");
                            setError(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-[#34C759]/25 bg-[#34C759]/[0.08] px-2.5 py-1 text-[11px] font-semibold text-[#1A7F37] hover:bg-[#34C759]/[0.15] cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId(item.id);
                            setAction("flagged");
                            setReason("");
                            setError(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-[#FF3B30]/25 bg-[#FF3B30]/[0.08] px-2.5 py-1 text-[11px] font-semibold text-[#C9241B] hover:bg-[#FF3B30]/[0.15] cursor-pointer"
                        >
                          <Flag className="h-3 w-3" /> Flag
                        </button>
                        {status !== "unverified" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveId(item.id);
                              setAction("revoked");
                              setReason("");
                              setError(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                          >
                            <Undo2 className="h-3 w-3" /> Revoke
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null
              ) : null}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
