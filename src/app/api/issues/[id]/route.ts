import { NextResponse } from "next/server";
import { changeIssueStatus, confirmIssue, findIssue } from "@/lib/issue-store";
import { ISSUE_STATUS_ORDER, type IssueStatus } from "@/types/citytrace";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!findIssue(id)) {
    return NextResponse.json({ error: `Unknown issue "${id}".` }, { status: 404 });
  }

  let body: { action?: unknown; status?: unknown; note?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; status?: unknown; note?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  if (body.action === "confirm") {
    const updated = confirmIssue(id, note);
    if (!updated) {
      return NextResponse.json({ error: "Could not confirm the issue." }, { status: 500 });
    }
    return NextResponse.json({ issue: updated });
  }

  const status = typeof body.status === "string" ? (body.status as IssueStatus) : undefined;
  if (!status || !ISSUE_STATUS_ORDER.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ISSUE_STATUS_ORDER.join(", ")}.` },
      { status: 422 }
    );
  }

  const updated = changeIssueStatus(id, status, note);

  if (!updated) {
    return NextResponse.json({ error: "Could not update the issue." }, { status: 500 });
  }

  return NextResponse.json({ issue: updated });
}
