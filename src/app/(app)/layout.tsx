import AppShell from "@/components/layout/AppShell";
import { DEMO_SWITCH_ACCOUNTS, getCurrentUser, isDemoModeEnabled } from "@/lib/auth-store";
import { getUserNotifications } from "@/lib/governance-store";
import { listIssues } from "@/lib/issue-store";
import { toSearchIssue } from "@/lib/search";
import { getActivitySince } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * Layout for every application route. Reads active user session, isolated user
 * notifications, and live issue list so the shell updates immediately.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const issues = listIssues();
  const currentUser = await getCurrentUser();
  const searchIssues = issues.map(toSearchIssue);
  const recentEvents = getActivitySince(14, 8, issues);
  const userNotifications = currentUser ? await getUserNotifications(currentUser.id) : [];
  const demoEnabled = isDemoModeEnabled();

  return (
    <AppShell
      searchIssues={searchIssues}
      recentEvents={recentEvents}
      userNotifications={userNotifications}
      currentUser={currentUser}
      demoAccounts={demoEnabled ? [...DEMO_SWITCH_ACCOUNTS] : []}
    >
      {children}
    </AppShell>
  );
}
