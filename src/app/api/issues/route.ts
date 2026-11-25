import { NextResponse } from "next/server";
import { SECTORS } from "@/data";
import { createIssue } from "@/lib/issue-store";
import { ISSUE_CATEGORIES, type IssueCategory } from "@/types/citytrace";

const MAX_PHOTO_CHARS = 2_500_000; // ~1.8 MB of image data as base64

interface Body {
  title?: unknown;
  category?: unknown;
  description?: unknown;
  location?: unknown;
  sectorId?: unknown;
  locationKey?: unknown;
  photoDataUrl?: unknown;
}

function asTrimmedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
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

  let photoDataUrl: string | undefined;
  if (typeof body.photoDataUrl === "string" && body.photoDataUrl.length > 0) {
    if (!body.photoDataUrl.startsWith("data:image/")) {
      errors.photo = "The attachment must be an image file.";
    } else if (body.photoDataUrl.length > MAX_PHOTO_CHARS) {
      errors.photo = "That image is too large — please use a file under 1.5 MB.";
    } else {
      photoDataUrl = body.photoDataUrl;
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed.", fields: errors }, { status: 422 });
  }

  const issue = createIssue({
    title,
    category,
    description,
    location,
    sectorId,
    ...(locationKey ? { locationKey } : {}),
    photoDataUrl,
  });

  return NextResponse.json({ issue }, { status: 201 });
}
