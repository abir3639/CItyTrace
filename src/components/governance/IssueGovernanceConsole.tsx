"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { PROJECTS } from "@/data";
import { DEPARTMENTS, getDepartmentForIssue } from "@/lib/departments";
import { canUserPerform } from "@/lib/permissions";
import { deriveIssueSla } from "@/lib/sla";
import { DEMO_NOW } from "@/lib/stats";
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
  type Issue,
  type PublicUser,
} from "@/types/citytrace";
import { Badge } from "@/components/ui/Badge";
import PermissionLockBanner from "./PermissionLockBanner";
import { formatDate } from "@/utils/formatters";

export default function IssueGovernanceConsole({
  issue,
  currentUser,
  demoEnabled = true,
}: {
  issue: Issue;
  currentUser: PublicUser | null;
  demoEnabled?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dept = getDepartmentForIssue(issue);
  const sla = deriveIssueSla(issue);
  const latestAttempt = issue.repairAttempts?.[issue.repairAttempts.length - 1];
  const pendingRecurrence = issue.recurrenceRequests?.find(
    (req) => req.status === "pending"
  );

  // Shared workflow state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verifier intake review
  const [reviewNote, setReviewNote] = useState("");

  // Official Start Repair
  const [selectedDept, setSelectedDept] = useState(issue.departmentId ?? dept.id);
  const [assignedTeam, setAssignedTeam] = useState(
    issue.assignedTeam ?? `${dept.shortName} Field Crew`
  );
  const [officialResponse, setOfficialResponse] = useState("");
  const [workOrderRef, setWorkOrderRef] = useState(issue.workOrderRef ?? "WO-2025-0722");
  const [projectId, setProjectId] = useState(issue.projectId ?? "");
  const [estimatedDate, setEstimatedDate] = useState("2025-07-30");

  // Extend Deadline toggle + form
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [nextDeadline, setNextDeadline] = useState(
    issue.estimatedRepairDate ?? "2025-08-05"
  );
  const [deadlineReason, setDeadlineReason] = useState("");

  // Official Submit Repair
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [completionDate, setCompletionDate] = useState(DEMO_NOW);
  const [evidenceTitle, setEvidenceTitle] = useState(
    "Post-repair completion photograph"
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);

  // Verifier Inspection
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [inspectionEvidenceTitle, setInspectionEvidenceTitle] = useState(
    "Independent verification site inspection"
  );

  // Citizen Recurrence Request
  const [recurrenceReason, setRecurrenceReason] = useState("");
  const [recurrenceReviewNote, setRecurrenceReviewNote] = useState("");

  const sendPatch = async (body: Record<string, unknown>, okMessage: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedVersion: issue.version }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? `Action failed with HTTP ${response.status}.`);
        return;
      }
      setSuccess(okMessage);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const onPickPhoto = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("That photo is larger than 1.5 MB. Choose a smaller file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const fieldCls =
    "w-full rounded-[12px] border border-black/[0.08] bg-[#F5F5F7] px-3 py-2 text-[12.5px] text-[#1D1D1F] placeholder:text-[#86868B] focus:border-[#007AFF] focus:bg-white focus:outline-none";

  const reviewPerm = canUserPerform(currentUser, "review_issue", { issue });
  const startPerm = canUserPerform(currentUser, "start_repair", {
    issue,
    targetDepartmentId: selectedDept,
  });
  const submitPerm = canUserPerform(currentUser, "submit_repair", { issue });
  const deadlinePerm = canUserPerform(currentUser, "update_deadline", { issue });
  const inspectPerm = canUserPerform(currentUser, "inspect_repair", { issue });
  const recurrenceSubmitPerm = canUserPerform(currentUser, "submit_recurrence", {
    issue,
  });
  const recurrenceReviewPerm = canUserPerform(currentUser, "review_recurrence", {
    issue,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Lifecycle step indicator & SLA pill */}
      <div className="rounded-[14px] bg-[#F5F5F7] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] font-semibold text-[#6E6E73]">
            Governance Stage · {dept.shortName}
          </span>
          <Badge tone={sla.tone}>{sla.label}</Badge>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {ISSUE_STATUS_ORDER.map((st) => {
            const active = issue.status === st;
            return (
              <div
                key={st}
                className={`rounded-lg px-2 py-1.5 text-center text-[10.5px] font-semibold transition-colors ${
                  active
                    ? "bg-[#007AFF] text-white shadow-2xs"
                    : "bg-white/75 text-[#6E6E73]"
                }`}
              >
                {ISSUE_STATUS_LABELS[st]}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deadline History summary if any */}
      {issue.deadlineHistory && issue.deadlineHistory.length > 0 ? (
        <div className="rounded-[12px] border border-black/[0.06] bg-[#F9FAFB] p-3 text-[11.5px]">
          <p className="flex items-center gap-1.5 font-semibold text-[#1D1D1F]">
            <CalendarClock className="h-3.5 w-3.5 text-[#007AFF]" />
            SLA Deadline Log ({issue.deadlineHistory.length})
            {sla.hasHistoricalBreach ? (
              <span className="rounded-full bg-[#FF3B30]/[0.1] px-2 py-0.5 text-[10px] font-semibold text-[#C9241B]">
                Prior SLA breach preserved
              </span>
            ) : null}
          </p>
          <ul className="mt-1.5 space-y-1 text-[#48484A]">
            {issue.deadlineHistory.map((d) => (
              <li key={d.id}>
                <span className="font-medium text-[#1D1D1F] tabular-nums">
                  {d.previousDate ? `${formatDate(d.previousDate)} → ` : ""}
                  {formatDate(d.newDate)}
                </span>{" "}
                · {d.changedBy.name} — “{d.reason}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Feedback alerts */}
      {error ? (
        <p className="flex items-start gap-2 rounded-[12px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.08] px-3 py-2 text-[12px] text-[#C9241B]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="flex items-start gap-2 rounded-[12px] border border-[#34C759]/25 bg-[#34C759]/[0.1] px-3 py-2 text-[12px] text-[#1A7F37]">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {success}
        </p>
      ) : null}

      {/* ---------------- STAGE 1: REPORTED -> UNDER REVIEW (Verifier) ---------------- */}
      {issue.status === "reported" ? (
        reviewPerm.allowed ? (
          <div className="flex flex-col gap-2.5 rounded-[14px] border border-[#AF52DE]/25 bg-[#AF52DE]/[0.06] p-3.5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7C3AED]">
              <ShieldCheck className="h-4 w-4" />
              Verifier Intake Review
            </p>
            <textarea
              rows={2}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional intake observation or evidence check note…"
              className={fieldCls}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void sendPatch(
                  { action: "review", note: reviewNote },
                  "Moved to Under Review and routed to department."
                )
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#AF52DE] px-4 py-2 text-[12.5px] font-semibold text-white shadow-xs hover:bg-[#9333EA] disabled:opacity-60 cursor-pointer"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Move to Under Review
            </button>
          </div>
        ) : (
          <PermissionLockBanner
            title="Civic Verifier Intake Required"
            reason={reviewPerm.reason ?? "Verifier must review incoming report first."}
            requiredRole="verifier"
            demoEnabled={demoEnabled}
            isGuest={!currentUser}
            loginNext={`/civic-issues/${issue.id}`}
          />
        )
      ) : null}

      {/* ---------------- STAGE 2: UNDER REVIEW / REOPENED -> IN PROGRESS (Official) ---------------- */}
      {issue.status === "under_review" || issue.status === "reopened" ? (
        startPerm.allowed ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendPatch(
                {
                  action: "start_repair",
                  departmentId: selectedDept,
                  assignedTeam,
                  officialResponse,
                  workOrderRef,
                  projectId: projectId || undefined,
                  estimatedRepairDate: estimatedDate,
                },
                "Official response published and repair moved to In Progress."
              );
            }}
            className="flex flex-col gap-2.5 rounded-[14px] border border-[#007AFF]/20 bg-[#007AFF]/[0.05] p-3.5"
          >
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0055CC]">
              <Wrench className="h-4 w-4" />
              Assign Team &amp; Publish Official Response
            </p>

            <label className="text-[11.5px] font-medium text-[#6E6E73]">
              Responsible department
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className={`${fieldCls} mt-1`}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.shortName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-[11.5px] font-medium text-[#6E6E73]">
                Assigned team
                <input
                  value={assignedTeam}
                  onChange={(e) => setAssignedTeam(e.target.value)}
                  className={`${fieldCls} mt-1`}
                />
              </label>
              <label className="text-[11.5px] font-medium text-[#6E6E73]">
                Work-order ref
                <input
                  value={workOrderRef}
                  onChange={(e) => setWorkOrderRef(e.target.value)}
                  placeholder="WO-2025-0722"
                  className={`${fieldCls} mt-1`}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-[11.5px] font-medium text-[#6E6E73]">
                Estimated repair date *
                <input
                  type="date"
                  required
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                  className={`${fieldCls} mt-1`}
                />
              </label>
              <label className="text-[11.5px] font-medium text-[#6E6E73]">
                Linked project (optional)
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={`${fieldCls} mt-1`}
                >
                  <option value="">Routine maintenance (unlinked)</option>
                  {PROJECTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name.slice(0, 26)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="text-[11.5px] font-medium text-[#6E6E73]">
              Official response *
              <textarea
                required
                rows={2}
                value={officialResponse}
                onChange={(e) => setOfficialResponse(e.target.value)}
                placeholder="Explain corrective scope, crew mobilization, and SLA plan…"
                className={`${fieldCls} mt-1`}
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[12.5px] font-semibold text-white shadow-xs hover:bg-[#0066D6] disabled:opacity-60 cursor-pointer"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Move to In Progress
            </button>
          </form>
        ) : (
          <PermissionLockBanner
            title="Authorized Department Action Required"
            reason={startPerm.reason ?? "Assigned department official must mobilize repair."}
            requiredRole="official"
            requiredDepartmentId={dept.id}
            demoEnabled={demoEnabled}
            isGuest={!currentUser}
            loginNext={`/civic-issues/${issue.id}`}
          />
        )
      ) : null}

      {/* ---------------- STAGE 3: IN PROGRESS -> SUBMIT REPAIR / EXTEND DEADLINE (Official) ---------------- */}
      {issue.status === "in_progress" ? (
        submitPerm.allowed ? (
          <div className="flex flex-col gap-3">
            {/* Deadline extension toggle */}
            {deadlinePerm.allowed ? (
              <div className="rounded-[12px] border border-black/[0.08] bg-white p-3">
                <button
                  type="button"
                  onClick={() => setDeadlineOpen((o) => !o)}
                  className="flex w-full items-center justify-between text-[12px] font-semibold text-[#1D1D1F] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-[#FF9500]" />
                    Revise Repair Deadline
                  </span>
                  <span className="text-[#007AFF]">{deadlineOpen ? "Hide" : "Edit SLA"}</span>
                </button>
                {deadlineOpen ? (
                  <div className="mt-2.5 flex flex-col gap-2">
                    <input
                      type="date"
                      value={nextDeadline}
                      onChange={(e) => setNextDeadline(e.target.value)}
                      className={fieldCls}
                    />
                    <input
                      type="text"
                      value={deadlineReason}
                      onChange={(e) => setDeadlineReason(e.target.value)}
                      placeholder="Mandatory reason (prior breaches remain on record)…"
                      className={fieldCls}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void sendPatch(
                          {
                            action: "extend_deadline",
                            newDate: nextDeadline,
                            reason: deadlineReason,
                          },
                          "Repair deadline updated and logged in SLA history."
                        )
                      }
                      className="rounded-full bg-[#FF9500] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#E08600] cursor-pointer"
                    >
                      Save deadline change
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Submit completed repair */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendPatch(
                  {
                    action: "submit_repair",
                    resolutionNotes,
                    completionDate,
                    workOrderRef,
                    evidenceTitle,
                    photoDataUrl,
                  },
                  "Repair completion submitted for independent verification."
                );
              }}
              className="flex flex-col gap-2.5 rounded-[14px] border border-[#007AFF]/20 bg-[#007AFF]/[0.05] p-3.5"
            >
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0055CC]">
                <ClipboardCheck className="h-4 w-4" />
                Submit Completed Repair for Verification
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[11.5px] font-medium text-[#6E6E73]">
                  Completion date *
                  <input
                    type="date"
                    required
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className={`${fieldCls} mt-1`}
                  />
                </label>
                <label className="text-[11.5px] font-medium text-[#6E6E73]">
                  Work-order ref
                  <input
                    value={workOrderRef}
                    onChange={(e) => setWorkOrderRef(e.target.value)}
                    className={`${fieldCls} mt-1`}
                  />
                </label>
              </div>

              <label className="text-[11.5px] font-medium text-[#6E6E73]">
                Resolution notes *
                <textarea
                  required
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe work executed, materials used, and measurements…"
                  className={`${fieldCls} mt-1`}
                />
              </label>

              <label className="text-[11.5px] font-medium text-[#6E6E73]">
                Supporting repair evidence title *
                <input
                  required
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className={`${fieldCls} mt-1`}
                />
              </label>

              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-black/[0.15] bg-white/75 px-3 py-2 text-[11.5px] font-medium text-[#6E6E73] hover:text-[#007AFF]">
                <Camera className="h-3.5 w-3.5" />
                {photoDataUrl ? "Photo attached" : "Attach repair photo (optional)"}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[12.5px] font-semibold text-white shadow-xs hover:bg-[#0066D6] disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Submit for Independent Verification
              </button>
            </form>
          </div>
        ) : (
          <PermissionLockBanner
            title="Repair Submission Restricted"
            reason={submitPerm.reason ?? "Assigned department official submits repair proof."}
            requiredRole="official"
            requiredDepartmentId={dept.id}
            demoEnabled={demoEnabled}
            isGuest={!currentUser}
            loginNext={`/civic-issues/${issue.id}`}
          />
        )
      ) : null}

      {/* ---------------- STAGE 4: AWAITING VERIFICATION (Verifier Approve / Reject) ---------------- */}
      {issue.status === "awaiting_verification" ? (
        inspectPerm.allowed ? (
          <div className="flex flex-col gap-3 rounded-[14px] border border-[#AF52DE]/25 bg-[#AF52DE]/[0.06] p-3.5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7C3AED]">
              <ShieldCheck className="h-4 w-4" />
              Independent Repair Inspection
            </p>
            {latestAttempt ? (
              <div className="rounded-[10px] bg-white/85 p-2.5 text-[11.5px] text-[#48484A]">
                <p className="font-semibold text-[#1D1D1F]">
                  Attempt #{latestAttempt.attemptNumber} by {latestAttempt.submittedBy.name} (
                  {formatDate(latestAttempt.completionDate)})
                </p>
                <p className="mt-0.5">“{latestAttempt.resolutionNotes}”</p>
              </div>
            ) : null}

            <input
              type="text"
              value={inspectionEvidenceTitle}
              onChange={(e) => setInspectionEvidenceTitle(e.target.value)}
              placeholder="Inspection sign-off document title…"
              className={fieldCls}
            />
            <textarea
              rows={2}
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="Mandatory field inspection observations & verification decision…"
              className={fieldCls}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void sendPatch(
                    {
                      action: "inspect_repair",
                      decision: "approved",
                      notes: inspectionNotes,
                      evidenceTitle: inspectionEvidenceTitle,
                    },
                    "Repair certified! Issue marked Verified Resolved."
                  )
                }
                className="inline-flex items-center justify-center gap-1 rounded-full bg-[#34C759] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#28A745] disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve Repair
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void sendPatch(
                    {
                      action: "inspect_repair",
                      decision: "rejected",
                      notes: inspectionNotes,
                      evidenceTitle: inspectionEvidenceTitle,
                    },
                    "Repair rejected — issue reopened and flagged in AI Investigation."
                  )
                }
                className="inline-flex items-center justify-center gap-1 rounded-full bg-[#FF3B30] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#DC2626] disabled:opacity-60 cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject Repair
              </button>
            </div>
          </div>
        ) : (
          <PermissionLockBanner
            title="Independent Verification Required"
            reason={
              inspectPerm.reason ??
              "Only Civic Verifiers can certify municipal repair outcomes."
            }
            requiredRole="verifier"
            demoEnabled={demoEnabled}
            isGuest={!currentUser}
            loginNext={`/civic-issues/${issue.id}`}
          />
        )
      ) : null}

      {/* ---------------- STAGE 5: RESOLVED -> RECURRENCE REQUEST & VERIFIER REVIEW ---------------- */}
      {issue.status === "resolved" ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-[12px] border border-black/[0.06] bg-[#F9FAFB] p-3 text-[12px]">
            <p className="font-semibold text-[#1D1D1F]">
              {issue.resolutionVerification === "verified" ? (
                <span className="inline-flex items-center gap-1 text-[#1A7F37]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Independently Verified Resolution
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#6E6E73]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Legacy Historical Resolution (Unverified)
                </span>
              )}
            </p>
          </div>

          {pendingRecurrence ? (
            <div className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.07] p-3.5 text-[12px]">
              <p className="font-semibold text-[#B25000]">
                Pending Recurrence Request ({pendingRecurrence.requestedBy.name})
              </p>
              <p className="mt-1 text-[#48484A]">“{pendingRecurrence.reason}”</p>
              {recurrenceReviewPerm.allowed ? (
                <div className="mt-2.5 flex flex-col gap-2">
                  <input
                    type="text"
                    value={recurrenceReviewNote}
                    onChange={(e) => setRecurrenceReviewNote(e.target.value)}
                    placeholder="Inspection decision note…"
                    className={fieldCls}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void sendPatch(
                          {
                            action: "review_recurrence",
                            requestId: pendingRecurrence.id,
                            decision: "approved",
                            reviewNotes: recurrenceReviewNote,
                          },
                          "Recurrence substantiated — issue reopened."
                        )
                      }
                      className="rounded-full bg-[#FF3B30] px-3 py-1.5 text-[11.5px] font-semibold text-white cursor-pointer"
                    >
                      Substantiate &amp; Reopen
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void sendPatch(
                          {
                            action: "review_recurrence",
                            requestId: pendingRecurrence.id,
                            decision: "rejected",
                            reviewNotes: recurrenceReviewNote,
                          },
                          "Recurrence request declined."
                        )
                      }
                      className="rounded-full border border-black/[0.1] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#1D1D1F] cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5">
                  <PermissionLockBanner
                    title="Verifier Recurrence Review Pending"
                    reason="A Civic Verifier must confirm recurrence before reopening official status."
                    requiredRole="verifier"
                    demoEnabled={demoEnabled}
                    isGuest={!currentUser}
                    loginNext={`/civic-issues/${issue.id}`}
                  />
                </div>
              )}
            </div>
          ) : null}

          {recurrenceSubmitPerm.allowed ? (
            <div className="rounded-[12px] border border-black/[0.07] bg-white p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
                <RefreshCw className="h-3.5 w-3.5 text-[#FF9500]" />
                Problem Returned? Submit Recurrence Report
              </p>
              <textarea
                rows={2}
                value={recurrenceReason}
                onChange={(e) => setRecurrenceReason(e.target.value)}
                placeholder="Describe how the problem returned after completion…"
                className={`${fieldCls} mt-2`}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void sendPatch(
                    { action: "submit_recurrence", reason: recurrenceReason },
                    "Recurrence request filed for independent Civic Verifier review."
                  )
                }
                className="mt-2 w-full rounded-full border border-[#FF9500]/30 bg-[#FF9500]/[0.08] px-3.5 py-1.5 text-[12px] font-semibold text-[#B25000] hover:bg-[#FF9500]/[0.15] cursor-pointer"
              >
                Submit Recurrence Request
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
