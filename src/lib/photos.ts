import crypto from "node:crypto";
import { supabase } from "./db";

/**
 * Citizen and repair photo handling.
 *
 * Photos arrive from the browser as `data:image/...;base64,...` URLs. With
 * Supabase configured, they are uploaded to the public `issue-photos` Storage
 * bucket under a random file name (nothing links the file to the uploader) and
 * only the public URL is kept in the issue store. Without Supabase (offline dev,
 * laptop demo backup) the validated data URL is kept as before.
 *
 * Every photo is checked by its actual file signature, not the label the
 * browser sent, so only real JPEG, PNG and WebP images are accepted — never SVG
 * or other types that can carry scripts.
 *
 * Server-only — never import this from a client component.
 */

export const PHOTO_BUCKET = "issue-photos";

/** Largest accepted photo, in bytes (the forms tell users 1.5 MB; this leaves headroom). */
export const MAX_PHOTO_BYTES = 1_800_000;

/** Base64 length of a MAX_PHOTO_BYTES file plus the data URL header. */
const MAX_DATA_URL_CHARS = Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 64;

type PhotoType = "image/jpeg" | "image/png" | "image/webp";

const EXTENSIONS: Record<PhotoType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** A photo that cannot be accepted; `message` is safe to show to the user. */
export class PhotoError extends Error {}

interface ParsedPhoto {
  type: PhotoType;
  bytes: Buffer;
}

function detectType(bytes: Buffer): PhotoType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Validates a data URL from the browser. Throws PhotoError with a
 * user-facing message if it is not a JPEG, PNG or WebP within the size limit.
 */
export function parsePhoto(raw: string): ParsedPhoto {
  if (raw.length > MAX_DATA_URL_CHARS) {
    throw new PhotoError("That image is too large — please use a file under 1.5 MB.");
  }
  const match = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]+={0,2})$/i.exec(raw);
  if (!match) {
    throw new PhotoError("The attachment must be a JPEG, PNG or WebP photo.");
  }
  const bytes = Buffer.from(match[1], "base64");
  const type = detectType(bytes);
  if (!type) {
    throw new PhotoError("The attachment must be a JPEG, PNG or WebP photo.");
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    throw new PhotoError("That image is too large — please use a file under 1.5 MB.");
  }
  return { type, bytes };
}

/**
 * Validates a photo and stores it. Returns the value to keep in the evidence
 * record's `dataUrl` field: a public Storage URL, or (without Supabase) the
 * data URL re-labelled with the detected type.
 *
 * Throws PhotoError for an unacceptable photo, or a plain Error if the upload
 * itself fails.
 */
export async function storePhoto(raw: string): Promise<string> {
  const { type, bytes } = parsePhoto(raw);

  if (!supabase) {
    return `data:${type};base64,${bytes.toString("base64")}`;
  }

  const fileName = `${crypto.randomUUID()}.${EXTENSIONS[type]}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(fileName, bytes, { contentType: type, upsert: false });
  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(fileName).data.publicUrl;
}

/**
 * For API routes: reads an optional photo field from a request body.
 * Returns `{ value }` (undefined when no photo was sent) or `{ error, status }`.
 */
export async function photoFromBody(
  raw: unknown
): Promise<{ value: string | undefined } | { error: string; status: number }> {
  if (typeof raw !== "string" || raw.length === 0) return { value: undefined };
  try {
    return { value: await storePhoto(raw) };
  } catch (error) {
    if (error instanceof PhotoError) return { error: error.message, status: 422 };
    console.error(error);
    return { error: "The photo could not be saved. Please try again.", status: 502 };
  }
}
