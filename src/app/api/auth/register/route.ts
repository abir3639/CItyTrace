import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SECTORS } from "@/data";
import {
  REGISTERED_USERS_COOKIE,
  SESSION_COOKIE,
  buildRegisteredUsersCookie,
  cookieOptionsForRequest,
  createSession,
  noStoreHeaders,
  registerUser,
  registeredUsersCookieOptions,
} from "@/lib/auth-store";
import type { UserRole } from "@/types/citytrace";

export const dynamic = "force-dynamic";

const VALID_ROLES: readonly UserRole[] = ["citizen", "verifier", "official"];

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  sectorId?: unknown;
  departmentId?: unknown;
}

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const name = typeof body.name === "string" ? body.name : "";
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role: UserRole =
    typeof body.role === "string" && VALID_ROLES.includes(body.role as UserRole)
      ? (body.role as UserRole)
      : "citizen";
  const sectorId =
    typeof body.sectorId === "string" && SECTORS.some((s) => s.id === body.sectorId)
      ? body.sectorId
      : SECTORS[0].id;
  const departmentId =
    typeof body.departmentId === "string" ? body.departmentId : undefined;

  const result = registerUser({ name, email, password, role, sectorId, departmentId });
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.field ? { fields: { [result.field]: result.error } } : {}),
      },
      { status: result.status, headers: noStoreHeaders() }
    );
  }

  const cookieStore = await cookies();
  const existingRegCookie = cookieStore.get(REGISTERED_USERS_COOKIE)?.value;
  const regToken = buildRegisteredUsersCookie(existingRegCookie, result.storedUser);

  const token = createSession(result.user);
  const response = NextResponse.json(
    { user: result.user },
    { status: 201, headers: noStoreHeaders() }
  );
  response.cookies.set(SESSION_COOKIE, token, cookieOptionsForRequest(request));
  response.cookies.set(
    REGISTERED_USERS_COOKIE,
    regToken,
    registeredUsersCookieOptions(request)
  );
  return response;
}
