/**
 * Resolves a record id to the page that shows it.
 *
 * AI findings and citations carry record ids so every claim can be followed
 * back to the underlying project, issue or evidence item.
 */
export function recordHref(id: string): string | null {
  if (id.startsWith("P-")) return `/public-projects/${id}`;
  if (id.startsWith("ISS-")) return `/civic-issues/${id}`;
  return null;
}

export function isRecordLinkable(id: string): boolean {
  return recordHref(id) !== null;
}
