/**
 * Client-safe helpers shared by authentication UI and route handlers.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/"
): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/api")) {
    return fallback;
  }
  return trimmed;
}
