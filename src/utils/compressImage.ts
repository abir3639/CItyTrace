/**
 * Browser-only photo preparation for upload.
 *
 * Phone camera photos are typically 3–5 MB and often HEIC; the server accepts
 * JPEG/PNG/WebP up to 1.8 MB. This decodes any image the browser can read,
 * applies its EXIF rotation, scales it so the longest side is at most 1600 px,
 * and re-encodes it as a JPEG data URL under ~1.4 MB.
 *
 * Re-encoding through a canvas also strips all metadata — including the GPS
 * location phones embed in photos — so a citizen's report never leaks where
 * they were standing or what device they used.
 */

const MAX_EDGE = 1600;
const TARGET_BYTES = 1_400_000;
/** Refuse absurd inputs before decoding (a 25 MB file is already far beyond any phone photo). */
const MAX_INPUT_BYTES = 25_000_000;

/** Attempts, from best quality down, until the result fits TARGET_BYTES. */
const ATTEMPTS: ReadonlyArray<readonly [maxEdge: number, quality: number]> = [
  [MAX_EDGE, 0.82],
  [MAX_EDGE, 0.7],
  [1280, 0.7],
  [1024, 0.6],
];

/** A photo that can't be used; `message` is safe to show to the user. */
export class ImageCompressionError extends Error {}

type Source = { image: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File): Promise<Source> {
  // Preferred: createImageBitmap applies EXIF orientation and works off the main thread.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which some browsers decode more formats with.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return {
      image: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageCompressionError(
      "This photo format can't be opened in your browser. Try a JPG or PNG."
    );
  }
}

function render(source: Source, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageCompressionError("Your browser couldn't process this photo.");

  // JPEG has no transparency: paint white first so transparent PNGs don't turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(source.image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Decoded size of a base64 data URL, in bytes. */
function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Turns a picked file into a JPEG data URL ready to send to the API.
 * Throws ImageCompressionError with a user-facing message if it can't.
 */
export async function compressImageFile(file: File): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new ImageCompressionError("Choose a photo file.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageCompressionError("That file is too large. Choose a photo under 25 MB.");
  }

  const source = await decode(file);
  try {
    if (!source.width || !source.height) {
      throw new ImageCompressionError("This photo appears to be empty. Try another one.");
    }
    for (const [maxEdge, quality] of ATTEMPTS) {
      const dataUrl = render(source, maxEdge, quality);
      if (dataUrlBytes(dataUrl) <= TARGET_BYTES) return dataUrl;
    }
    throw new ImageCompressionError("This photo couldn't be made small enough. Try another one.");
  } finally {
    source.release();
  }
}
