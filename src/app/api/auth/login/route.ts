import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authenticateUser,
  cookieOptionsForRequest,
  createSession,
} from "@/lib/auth-store";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter both email and password." },
      { status: 422 }
    );
  }

  const user = authenticateUser(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = createSession(user.id);
  const response = NextResponse.json({ user }, { status: 200 });
  response.cookies.set(SESSION_COOKIE, token, cookieOptionsForRequest(request));
  return response;
}
