import type { Metadata } from "next";
import CityExplorer from "@/components/city/CityExplorer";
import { toMapFeatures } from "@/data";
import { listAllEvidence, listIssues } from "@/lib/issue-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "City Explorer · CityTrace",
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

  const issues = listIssues();
  const evidence = listAllEvidence();
  const features = toMapFeatures(issues);

  return (
    <CityExplorer
      initialFeatureId={initialFeatureId}
      features={features}
      issues={issues}
      evidence={evidence}
    />
  );
}
