import AppShell from "@/components/layout/AppShell";
import { listIssues } from "@/lib/issue-store";
import { toSearchIssue } from "@/lib/search";

/**
 * Layout for every application route. The root layout owns <html>/<body>;
 * this layer adds the CITYTRACE shell (sidebar, top bar, footer).
 *
 * The issue list is read here so the global search palette can index citizen
 * reports as well as seeded records.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const searchIssues = listIssues().map(toSearchIssue);

  return <AppShell searchIssues={searchIssues}>{children}</AppShell>;
}
