import { getDepartment, getDepartmentForIssue } from "./departments";
import type {
  Evidence,
  Issue,
  IssueStatus,
  PublicUser,
  UserRole,
} from "@/types/citytrace";

/**
 * Centralized role-based permission system & formal issue state machine.
 * Shared across API route handlers, server store mutations, and UI controls.
 */

export type PermissionAction =
  | "report_issue"
  | "vote_issue"
  | "follow_entity"
  | "submit_recurrence"
  | "review_issue"
  | "start_repair"
  | "update_deadline"
  | "submit_repair"
  | "inspect_repair"
  | "review_recurrence"
  | "verify_evidence"
  | "flag_evidence"
  | "revoke_evidence";

export interface PermissionContext {
  issue?: Issue;
  evidence?: Evidence;
  targetDepartmentId?: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredDepartmentId?: string;
}

/**
 * Formal authorized issue lifecycle transitions.
 */
export const ALLOWED_TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  reported: ["under_review"],
  under_review: ["in_progress"],
  in_progress: ["awaiting_verification"],
  awaiting_verification: ["resolved", "reopened"],
  resolved: ["reopened"],
  reopened: ["in_progress"],
};

export function isValidTransition(from: IssueStatus, to: IssueStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Normalizes legacy hyphenated statuses ("under-review", "in-progress") to canonical snake_case.
 */
export function normalizeIssueStatus(raw: string | undefined): IssueStatus | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === "under-review" || cleaned === "under_review") return "under_review";
  if (cleaned === "in-progress" || cleaned === "in_progress") return "in_progress";
  if (
    cleaned === "reported" ||
    cleaned === "awaiting_verification" ||
    cleaned === "resolved" ||
    cleaned === "reopened"
  ) {
    return cleaned;
  }
  return undefined;
}

export function canUserPerform(
  user: PublicUser | null,
  action: PermissionAction,
  ctx: PermissionContext = {}
): PermissionResult {
  if (!user) {
    return {
      allowed: false,
      reason: "Sign in to perform civic actions.",
    };
  }

  switch (action) {
    case "follow_entity":
      return { allowed: true };

    case "report_issue":
      if (user.role === "official") {
        return {
          allowed: false,
          requiredRole: "citizen",
          reason:
            "Municipal Officials cannot file citizen complaints under official credentials. Switch to Citizen mode to report a resident issue.",
        };
      }
      return { allowed: true };

    case "vote_issue":
      if (user.role === "official") {
        return {
          allowed: false,
          requiredRole: "citizen",
          reason:
            "Citizen confirmation voting is disabled for Municipal Official accounts to prevent self-endorsement of departmental issues.",
        };
      }
      return { allowed: true };

    case "submit_recurrence":
      if (user.role === "official") {
        return {
          allowed: false,
          requiredRole: "citizen",
          reason:
            "Only Citizens or independent Verifiers can submit a post-resolution recurrence report.",
        };
      }
      if (ctx.issue && ctx.issue.status !== "resolved") {
        return {
          allowed: false,
          reason: "Recurrence requests can only be submitted against resolved issues.",
        };
      }
      return { allowed: true };

    case "review_issue":
      if (user.role !== "verifier") {
        return {
          allowed: false,
          requiredRole: "verifier",
          reason:
            "Only Civic Verifiers can review incoming reports and move them to Under Review.",
        };
      }
      if (ctx.issue && ctx.issue.status !== "reported") {
        return {
          allowed: false,
          reason: "Only newly reported issues can be moved to Under Review.",
        };
      }
      return { allowed: true };

    case "start_repair":
    case "update_deadline":
    case "submit_repair": {
      if (user.role !== "official") {
        return {
          allowed: false,
          requiredRole: "official",
          reason:
            "Only authorized Municipal Officials can assign teams, manage repair deadlines, and submit completed work.",
        };
      }
      const requiredDept =
        ctx.targetDepartmentId
          ? getDepartment(ctx.targetDepartmentId)
          : ctx.issue
            ? getDepartmentForIssue(ctx.issue)
            : getDepartment(user.departmentId);

      if (requiredDept && user.departmentId !== requiredDept.id) {
        return {
          allowed: false,
          requiredRole: "official",
          requiredDepartmentId: requiredDept.id,
          reason: `Department authorization required: this work belongs to ${requiredDept.shortName} (${requiredDept.code}).`,
        };
      }

      if (action === "start_repair" && ctx.issue) {
        if (ctx.issue.status !== "under_review" && ctx.issue.status !== "reopened") {
          return {
            allowed: false,
            reason:
              "Repairs can only begin after a Civic Verifier moves the issue to Under Review (or when Reopened).",
          };
        }
      }

      if (action === "submit_repair" && ctx.issue) {
        if (ctx.issue.status !== "in_progress") {
          return {
            allowed: false,
            reason: "Only In Progress repairs can be submitted for independent verification.",
          };
        }
      }

      if (action === "update_deadline" && ctx.issue) {
        if (ctx.issue.status !== "in_progress" && ctx.issue.status !== "reopened") {
          return {
            allowed: false,
            reason: "Deadlines can only be updated while a repair is In Progress or Reopened.",
          };
        }
      }

      return { allowed: true };
    }

    case "inspect_repair": {
      if (user.role !== "verifier") {
        return {
          allowed: false,
          requiredRole: "verifier",
          reason:
            "Independent Verification Required: only Civic Verifiers can approve or reject submitted municipal repairs.",
        };
      }
      if (ctx.issue) {
        if (ctx.issue.status !== "awaiting_verification") {
          return {
            allowed: false,
            reason: "This issue is not currently awaiting independent repair verification.",
          };
        }
        const latestAttempt = ctx.issue.repairAttempts?.[ctx.issue.repairAttempts.length - 1];
        if (latestAttempt && latestAttempt.submittedBy.id === user.id) {
          return {
            allowed: false,
            reason: "Conflict of interest: you cannot certify a repair you submitted.",
          };
        }
      }
      return { allowed: true };
    }

    case "review_recurrence":
      if (user.role !== "verifier") {
        return {
          allowed: false,
          requiredRole: "verifier",
          reason:
            "Only Civic Verifiers can review citizen recurrence requests and reopen resolved issues.",
        };
      }
      if (ctx.issue && ctx.issue.status !== "resolved") {
        return {
          allowed: false,
          reason: "Recurrence reviews only apply to resolved issues.",
        };
      }
      return { allowed: true };

    case "verify_evidence":
    case "flag_evidence":
    case "revoke_evidence":
      if (user.role !== "verifier") {
        return {
          allowed: false,
          requiredRole: "verifier",
          reason:
            "Only Civic Verifiers can verify, flag, or revoke verification on evidence items.",
        };
      }
      if (ctx.evidence?.uploadedBy?.id && ctx.evidence.uploadedBy.id === user.id) {
        return {
          allowed: false,
          reason:
            "Self-verification blocked: a Verifier cannot verify or moderate their own uploaded evidence.",
        };
      }
      return { allowed: true };
  }
}
