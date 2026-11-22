import type { Issue, IssueCategory, IssueStatus } from "@/types/citytrace";

/**
 * Minimal, serialisable issue shape handed to the client-side global search.
 *
 * Only the fields the palette needs are sent, so the search index can include
 * citizen reports without shipping the whole dataset to the browser.
 */
export interface SearchIssue {
  id: string;
  code: string;
  title: string;
  location: string;
  status: IssueStatus;
  category: IssueCategory;
  sectorId: string;
}

export function toSearchIssue(issue: Issue): SearchIssue {
  return {
    id: issue.id,
    code: issue.code,
    title: issue.title,
    location: issue.location,
    status: issue.status,
    category: issue.category,
    sectorId: issue.sectorId,
  };
}
