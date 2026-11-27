import type { Issue, SlaState } from "@/types/citytrace";
import { SLA_STATE_LABELS } from "@/types/citytrace";
import { daysBetween, type Tone } from "@/utils/formatters";
import { DEMO_NOW } from "./stats";

export const DEFAULT_DUE_SOON_HOURS = 72;
export const OFFICIAL_RESPONSE_TARGET_DAYS = 7;
export const VERIFICATION_TARGET_DAYS = 3;

export interface SlaSummary {
  state: SlaState;
  label: string;
  tone: Tone;
  daysRemaining?: number;
  daysOverdue?: number;
  verificationWaitDays?: number;
  responseDelayDays?: number;
  hasHistoricalBreach: boolean;
  extensionCount: number;
}

export function deriveIssueSla(
  issue: Issue,
  now: string = DEMO_NOW,
  dueSoonHours: number = DEFAULT_DUE_SOON_HOURS
): SlaSummary {
  const extensionCount = issue.deadlineHistory?.length ?? 0;
  const hasHistoricalBreach =
    Boolean(issue.slaBreachedAt) ||
    Boolean(issue.deadlineHistory?.some((d) => d.breachedPriorDeadline));

  if (issue.status === "resolved") {
    const resolvedDate = issue.resolvedAt ?? issue.updatedAt;
    const missedDeadline =
      hasHistoricalBreach ||
      Boolean(issue.estimatedRepairDate && resolvedDate > issue.estimatedRepairDate);
    const state: SlaState = missedDeadline
      ? "resolved_after_deadline"
      : "resolved_within_deadline";
    return {
      state,
      label: SLA_STATE_LABELS[state],
      tone: missedDeadline ? "warn" : "ok",
      hasHistoricalBreach: missedDeadline,
      extensionCount,
    };
  }

  if (issue.status === "awaiting_verification") {
    const latestAttempt =
      issue.repairAttempts?.[issue.repairAttempts.length - 1];
    const submittedAt = latestAttempt?.submittedAt ?? issue.updatedAt;
    const waitDays = Math.max(0, daysBetween(submittedAt, now));
    const delayed = waitDays > VERIFICATION_TARGET_DAYS;
    const state: SlaState = delayed ? "verification_pending" : "repair_submitted";
    return {
      state,
      label: delayed
        ? `Verification Pending (${waitDays}d)`
        : SLA_STATE_LABELS[state],
      tone: delayed ? "warn" : "info",
      verificationWaitDays: waitDays,
      hasHistoricalBreach,
      extensionCount,
    };
  }

  if (
    issue.status === "reported" ||
    issue.status === "under_review" ||
    (issue.status === "reopened" && !issue.estimatedRepairDate)
  ) {
    const daysSinceUpdate = Math.max(0, daysBetween(issue.reportedAt, now));
    return {
      state: "awaiting_official_response",
      label:
        daysSinceUpdate > OFFICIAL_RESPONSE_TARGET_DAYS
          ? `Awaiting Response (${daysSinceUpdate}d)`
          : SLA_STATE_LABELS.awaiting_official_response,
      tone: daysSinceUpdate > OFFICIAL_RESPONSE_TARGET_DAYS ? "warn" : "neutral",
      responseDelayDays: daysSinceUpdate,
      hasHistoricalBreach,
      extensionCount,
    };
  }

  if (issue.estimatedRepairDate) {
    const remainingDays = daysBetween(now, issue.estimatedRepairDate);
    const dueSoonDays = Math.ceil(dueSoonHours / 24);
    if (remainingDays < 0) {
      return {
        state: "overdue",
        label: `Overdue (${Math.abs(remainingDays)}d)`,
        tone: "danger",
        daysOverdue: Math.abs(remainingDays),
        hasHistoricalBreach: true,
        extensionCount,
      };
    }
    if (remainingDays <= dueSoonDays) {
      return {
        state: "due_soon",
        label:
          remainingDays === 0 ? "Due Today" : `Due Soon (${remainingDays}d left)`,
        tone: "warn",
        daysRemaining: remainingDays,
        hasHistoricalBreach,
        extensionCount,
      };
    }
    return {
      state: "on_track",
      label: `On Track (${remainingDays}d left)`,
      tone: "ok",
      daysRemaining: remainingDays,
      hasHistoricalBreach,
      extensionCount,
    };
  }

  return {
    state: "awaiting_official_response",
    label: SLA_STATE_LABELS.awaiting_official_response,
    tone: "neutral",
    hasHistoricalBreach,
    extensionCount,
  };
}
