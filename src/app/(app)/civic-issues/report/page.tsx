import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import ReportIssueForm from "@/components/issues/ReportIssueForm";

export const metadata: Metadata = {
  title: "Report an issue · CityTrace",
};

export default function ReportIssuePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Civic Issues · New report"
        title="Report a Civic Problem"
        description="Your report becomes a permanent public record with an immutable status trail, making recurring infrastructure failures easy to track."
      />

      <Panel glow className="p-5 sm:p-6">
        <ReportIssueForm />
      </Panel>

      <p className="text-[12px] leading-relaxed text-[#6E6E73]">
        Demonstration environment: submitted reports are stored locally on the demo server and
        are not transmitted to any government agency.
      </p>
    </div>
  );
}
