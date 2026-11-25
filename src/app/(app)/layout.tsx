import AppShell from "@/components/layout/AppShell";
import { listIssues } from "@/lib/issue-store";
import { toSearchIssue } from "@/lib/search";
import { getActivitySince } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * Layout for every application route. The root layout owns <html>/<body>;
 * this layer adds the CITYTRACE shell (sidebar, top bar, footer).
 *
 * The issue list is read here so the global search palette and notification
 * menu reflect citizen reports as well as seeded records.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const issues = listIssues();
  const searchIssues = issues.map(toSearchIssue);
  const recentEvents = getActivitySince(14, 8, issues);

  return (
    <AppShell searchIssues={searchIssues} recentEvents={recentEvents}>
      {children}
    </AppShell>
  );
}
