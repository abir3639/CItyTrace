import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import ReportIssueForm from "@/components/issues/ReportIssueForm";

export const metadata: Metadata = {
  title: "Report an issue · CITYTRACE",
};

export default function ReportIssuePage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Civic Issues · New report"
        title="Report a civic problem"
        description="Your report becomes a permanent public record. It carries a status history that survives resolution, so if the same problem returns it is visible to everyone."
      />

      <Panel glow className="p-4 sm:p-5">
        <ReportIssueForm />
      </Panel>

      <p className="font-mono text-[10px] leading-relaxed text-slate-500">
        This is a demonstration environment. Reports are stored locally on the demo
        server — not sent to any municipality — and every existing record you see in
        CITYTRACE is fictional.
      </p>
    </div>
  );
}
