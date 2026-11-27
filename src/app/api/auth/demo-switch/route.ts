import { NextResponse } from "next/server";
import {
  DEMO_SWITCH_ACCOUNTS,
  SESSION_COOKIE,
  cookieOptionsForRequest,
  createSession,
  isDemoModeEnabled,
  noStoreHeaders,
} from "@/lib/auth-store";

export const dynamic = "force-dynamic";

/**
 * Isolated demonstration role switcher.
 * Only switches into pre-seeded demo accounts when demo mode is enabled.
 */
export async function POST(request: Request) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      { error: "Demo role switching is disabled in this environment." },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  let body: { userId?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const demoUser = DEMO_SWITCH_ACCOUNTS.find((u) => u.id === userId);
  if (!demoUser) {
    return NextResponse.json(
      { error: "Only pre-seeded demonstration identities can be switched to." },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  const token = createSession(demoUser);
  const response = NextResponse.json(
    { user: demoUser },
    { status: 200, headers: noStoreHeaders() }
  );
  response.cookies.set(SESSION_COOKIE, token, cookieOptionsForRequest(request));
  return response;
}
