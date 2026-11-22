import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, ShieldAlert, Wallet } from "lucide-react";
import CityExplorer from "@/components/city/CityExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { toMapFeatures } from "@/data";
import { listIssues } from "@/lib/issue-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "City Explorer · CITYTRACE",
};

export default async function CityExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialFeatureId =
    typeof params.feature === "string" && params.feature.length > 0
      ? params.feature
      : null;

  // Citizen reports are part of the live issue list, so they become red
  // markers on the map the moment they are filed.
  const features = toMapFeatures(listIssues());

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="City Explorer"
        title="Interactive 3D civic sector"
        description="A stylised model of the district. Every glowing beacon is a live record — click one to open its issue or project file without leaving the map."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/civic-issues"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 font-mono text-[11px] text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" /> Issues
            </Link>
            <Link
              href="/money-tracker"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 font-mono text-[11px] text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200"
            >
              <Wallet className="h-3.5 w-3.5 text-cyan-400" /> Money
            </Link>
            <Link
              href="/public-projects"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              <Coins className="h-3.5 w-3.5" /> Projects <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        }
      />
      <CityExplorer initialFeatureId={initialFeatureId} features={features} />
    </div>
  );
}
