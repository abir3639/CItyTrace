import { NextResponse } from "next/server";
import { SECTORS } from "@/data";
import { getCurrentUser } from "@/lib/auth-store";
import { createIssue } from "@/lib/issue-store";
import { canUserPerform } from "@/lib/permissions";
import { PhotoError, parsePhoto, storePhoto } from "@/lib/photos";
import { ISSUE_CATEGORIES, type IssueCategory, type MapPosition } from "@/types/citytrace";

interface Body {
  title?: unknown;
  category?: unknown;
  description?: unknown;
  location?: unknown;
  sectorId?: unknown;
  locationKey?: unknown;
  coordinates?: unknown;
  photoDataUrl?: unknown;
}

function asTrimmedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to file a civic report.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }
  const perm = canUserPerform(user, "report_issue");
  if (!perm.allowed) {
    return NextResponse.json(
      { error: perm.reason ?? "Forbidden.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const title = asTrimmedString(body.title, 120);
  const description = asTrimmedString(body.description, 2000);
  const location = asTrimmedString(body.location, 200);
  const sectorId = asTrimmedString(body.sectorId, 16);
  const locationKey = asTrimmedString(body.locationKey, 80);
  const category = asTrimmedString(body.category, 32) as IssueCategory;

  const errors: Record<string, string> = {};
  if (title.length < 4) errors.title = "Give the issue a title of at least 4 characters.";
  if (description.length < 10)
    errors.description = "Describe the problem in at least 10 characters.";
  if (location.length < 3) errors.location = "Add a street or landmark.";
  if (!SECTORS.some((sector) => sector.id === sectorId))
    errors.sectorId = "Choose a valid sector.";
  if (!ISSUE_CATEGORIES.includes(category))
    errors.category = "Choose a valid category.";

  // Validate the photo with the other fields; it is uploaded only once everything passes.
  const rawPhoto =
    typeof body.photoDataUrl === "string" && body.photoDataUrl.length > 0
      ? body.photoDataUrl
      : undefined;
  if (rawPhoto) {
    try {
      parsePhoto(rawPhoto);
    } catch (error) {
      errors.photo =
        error instanceof PhotoError ? error.message : "The attachment could not be read.";
    }
  }

  let coordinates: MapPosition | undefined;
  if (
    Array.isArray(body.coordinates) &&
    body.coordinates.length === 2 &&
    typeof body.coordinates[0] === "number" &&
    typeof body.coordinates[1] === "number" &&
    Number.isFinite(body.coordinates[0]) &&
    Number.isFinite(body.coordinates[1])
  ) {
    coordinates = [
      Math.max(-18, Math.min(18, Number(body.coordinates[0].toFixed(2)))),
      Math.max(-18, Math.min(18, Number(body.coordinates[1].toFixed(2)))),
    ];
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed.", fields: errors }, { status: 422 });
  }

  let photoDataUrl: string | undefined;
  if (rawPhoto) {
    try {
      photoDataUrl = await storePhoto(rawPhoto);
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Your photo could not be saved. Please try again.", fields: { photo: "Upload failed — try again." } },
        { status: 502 }
      );
    }
  }

  const issue = await createIssue(
    {
      title,
      category,
      description,
      location,
      sectorId,
      ...(locationKey ? { locationKey } : {}),
      ...(coordinates ? { coordinates } : {}),
      photoDataUrl,
    },
    user
  );

  return NextResponse.json({ issue }, { status: 201 });
}
