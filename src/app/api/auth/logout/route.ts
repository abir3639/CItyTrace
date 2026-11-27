import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  cookieOptionsForRequest,
  deleteSession,
  noStoreHeaders,
} from "@/lib/auth-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: noStoreHeaders() }
  );
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptionsForRequest(request),
    maxAge: 0,
  });
  return response;
}
