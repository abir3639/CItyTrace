import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-store";
import {
  confirmIssue,
  extendIssueDeadline,
  findIssue,
  inspectRepairSubmission,
  reviewIssue,
  reviewRecurrenceRequest,
  startOfficialRepair,
  submitRecurrenceRequest,
  submitRepairCompletion,
  unconfirmIssue,
} from "@/lib/issue-store";

const MAX_PHOTO_CHARS = 2_500_000;

function validPhoto(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  if (!raw.startsWith("data:image/") || raw.length > MAX_PHOTO_CHARS) return undefined;
  return raw;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to perform this action.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  if (!(await findIssue(id))) {
    return NextResponse.json({ error: `Unknown issue "${id}".` }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const note = typeof body.note === "string" ? body.note.slice(0, 600) : "";
  const expectedVersion =
    typeof body.expectedVersion === "number" ? body.expectedVersion : undefined;

  if (action === "confirm") {
    const result = await confirmIssue(id, user, note);
    if (!result) {
      return NextResponse.json({ error: "Could not confirm the issue." }, { status: 500 });
    }
    if (result.forbidden) {
      return NextResponse.json({ error: result.forbidden }, { status: 403 });
    }
    if (result.alreadyVoted) {
      return NextResponse.json(
        { error: "You have already confirmed this issue.", issue: result.issue },
        { status: 409 }
      );
    }
    return NextResponse.json({ issue: result.issue });
  }

  if (action === "unconfirm") {
    const updated = await unconfirmIssue(id, user);
    if (!updated) {
      return NextResponse.json({ error: "Could not withdraw confirmation." }, { status: 500 });
    }
    return NextResponse.json({ issue: updated });
  }

  if (action === "review") {
    const result = await reviewIssue(id, user, note, expectedVersion);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ issue: result.issue });
  }

  if (action === "start_repair") {
    const result = await startOfficialRepair(id, user, {
      departmentId: typeof body.departmentId === "string" ? body.departmentId : "",
      assignedTeam: typeof body.assignedTeam === "string" ? body.assignedTeam : undefined,
      officialResponse:
        typeof body.officialResponse === "string" ? body.officialResponse : "",
      workOrderRef: typeof body.workOrderRef === "string" ? body.workOrderRef : undefined,
      projectId: typeof body.projectId === "string" ? body.projectId : undefined,
      estimatedRepairDate:
        typeof body.estimatedRepairDate === "string" ? body.estimatedRepairDate : "",
      expectedVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ issue: result.issue });
  }

  if (action === "extend_deadline") {
    const result = await extendIssueDeadline(id, user, {
      newDate: typeof body.newDate === "string" ? body.newDate : "",
      reason: typeof body.reason === "string" ? body.reason : "",
      expectedVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ issue: result.issue });
  }

  if (action === "submit_repair") {
    const result = await submitRepairCompletion(id, user, {
      resolutionNotes:
        typeof body.resolutionNotes === "string" ? body.resolutionNotes : "",
      completionDate: typeof body.completionDate === "string" ? body.completionDate : "",
      workOrderRef: typeof body.workOrderRef === "string" ? body.workOrderRef : undefined,
      evidenceTitle: typeof body.evidenceTitle === "string" ? body.evidenceTitle : "",
      evidenceDescription:
        typeof body.evidenceDescription === "string" ? body.evidenceDescription : undefined,
      photoDataUrl: validPhoto(body.photoDataUrl),
      expectedVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ issue: result.issue });
  }

  if (action === "inspect_repair") {
    const decision =
      body.decision === "approved" || body.decision === "rejected"
        ? body.decision
        : null;
    if (!decision) {
      return NextResponse.json(
        { error: 'decision must be "approved" or "rejected".' },
        { status: 422 }
      );
    }
    const result = await inspectRepairSubmission(id, user, {
      decision,
      notes: typeof body.notes === "string" ? body.notes : "",
      evidenceTitle: typeof body.evidenceTitle === "string" ? body.evidenceTitle : undefined,
      photoDataUrl: validPhoto(body.photoDataUrl),
      expectedVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ issue: result.issue });
  }

  if (action === "submit_recurrence") {
    const result = await submitRecurrenceRequest(id, user, {
      reason: typeof body.reason === "string" ? body.reason : "",
      photoDataUrl: validPhoto(body.photoDataUrl),
      expectedVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ issue: result.issue });
  }

  if (action === "review_recurrence") {
    const decision =
      body.decision === "approved" || body.decision === "rejected"
        ? body.decision
        : null;
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!decision || !requestId) {
      return NextResponse.json(
        { error: "requestId and decision (approved|rejected) are required." },
        { status: 422 }
      );
    }
    const result = await reviewRecurrenceRequest(id, requestId, user, {
      decision,
      reviewNotes: typeof body.reviewNotes === "string" ? body.reviewNotes : "",
      expectedVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ issue: result.issue });
  }

  return NextResponse.json(
    {
      error:
        "Unsupported workflow action. Direct unattributed status mutations are not permitted.",
    },
    { status: 422 }
  );
}
