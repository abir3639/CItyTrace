import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-store";
import { getUserWatchlist, toggleWatchlistItem } from "@/lib/governance-store";
import type { WatchlistEntityType } from "@/types/citytrace";

const VALID_TYPES: readonly WatchlistEntityType[] = ["issue", "sector", "project"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ watchlist: { issues: [], sectors: [], projects: [] } });
  }
  return NextResponse.json({ watchlist: await getUserWatchlist(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to follow civic issues, sectors, or projects." },
      { status: 401 }
    );
  }

  let body: { entityType?: unknown; entityId?: unknown };
  try {
    body = (await request.json()) as { entityType?: unknown; entityId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const entityType =
    typeof body.entityType === "string" &&
    VALID_TYPES.includes(body.entityType as WatchlistEntityType)
      ? (body.entityType as WatchlistEntityType)
      : null;
  const entityId = typeof body.entityId === "string" ? body.entityId.trim() : "";

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType (issue|sector|project) and entityId are required." },
      { status: 422 }
    );
  }

  const result = await toggleWatchlistItem(user.id, entityType, entityId);
  return NextResponse.json(result, { status: 200 });
}
