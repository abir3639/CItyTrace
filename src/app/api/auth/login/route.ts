import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  REGISTERED_USERS_COOKIE,
  SESSION_COOKIE,
  authenticateUser,
  cookieOptionsForRequest,
  createSession,
  noStoreHeaders,
} from "@/lib/auth-store";

export const dynamic = "force-dynamic";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter both email and password." },
      { status: 422, headers: noStoreHeaders() }
    );
  }

  const cookieStore = await cookies();
  const regCookie = cookieStore.get(REGISTERED_USERS_COOKIE)?.value;
  const user = authenticateUser(email, password, regCookie);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  const token = createSession(user);
  const response = NextResponse.json(
    { user },
    { status: 200, headers: noStoreHeaders() }
  );
  response.cookies.set(SESSION_COOKIE, token, cookieOptionsForRequest(request));
  return response;
}
