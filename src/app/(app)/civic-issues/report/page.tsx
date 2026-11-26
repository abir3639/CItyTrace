import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import ReportIssueForm from "@/components/issues/ReportIssueForm";
import { SECTORS } from "@/data";
import type { MapPosition } from "@/types/citytrace";

export const metadata: Metadata = {
  title: "Report an issue · CityTrace",
};

export default async function ReportIssuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawSector = typeof params.sector === "string" ? params.sector : undefined;
  const initialSectorId = SECTORS.some((s) => s.id === rawSector) ? rawSector : undefined;
  const initialLocation =
    typeof params.loc === "string" && params.loc.trim().length > 0
      ? params.loc.trim().slice(0, 200)
      : undefined;

  const rawX = typeof params.x === "string" ? Number(params.x) : Number.NaN;
  const rawZ = typeof params.z === "string" ? Number(params.z) : Number.NaN;
  const initialCoordinates: MapPosition | undefined =
    Number.isFinite(rawX) && Number.isFinite(rawZ)
      ? [Number(rawX.toFixed(2)), Number(rawZ.toFixed(2))]
      : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Civic Issues · New report"
        title="Report a Civic Problem"
        description="Your report becomes a permanent public record with an immutable status trail, making recurring infrastructure failures easy to track."
      />

      <Panel glow className="p-5 sm:p-6">
        <ReportIssueForm
          initialSectorId={initialSectorId}
          initialLocation={initialLocation}
          initialCoordinates={initialCoordinates}
        />
      </Panel>

      <p className="text-[12px] leading-relaxed text-[#6E6E73]">
        Demonstration environment: submitted reports are stored locally on the demo server and
        are not transmitted to any government agency.
      </p>
    </div>
  );
}
