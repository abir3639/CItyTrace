import { NextResponse } from "next/server";
import { getCurrentUser, noStoreHeaders } from "@/lib/auth-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user }, { status: 200, headers: noStoreHeaders() });
}
