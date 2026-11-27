import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-store";
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/governance-store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ notifications: [] });
  }
  return NextResponse.json({ notifications: getUserNotifications(user.id) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { notificationId?: unknown; all?: unknown };
  try {
    body = (await request.json()) as { notificationId?: unknown; all?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (body.all === true) {
    return NextResponse.json({ notifications: markAllNotificationsRead(user.id) });
  }

  const notificationId =
    typeof body.notificationId === "string" ? body.notificationId.trim() : "";
  if (!notificationId) {
    return NextResponse.json(
      { error: "Provide notificationId or all: true." },
      { status: 422 }
    );
  }

  return NextResponse.json({
    notifications: markNotificationRead(user.id, notificationId),
  });
}
