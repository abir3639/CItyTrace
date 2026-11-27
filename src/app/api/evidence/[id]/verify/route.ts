import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-store";
import { moderateEvidence } from "@/lib/issue-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in as a Civic Verifier to moderate evidence." },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  let body: { action?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const action =
    body.action === "verified" || body.action === "flagged" || body.action === "revoked"
      ? body.action
      : null;
  if (!action) {
    return NextResponse.json(
      { error: 'action must be "verified", "flagged", or "revoked".' },
      { status: 422 }
    );
  }

  const reason = typeof body.reason === "string" ? body.reason : "";
  const result = moderateEvidence(id, user, { action, reason });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ evidence: result.evidence }, { status: 200 });
}
