import type { Metadata } from "next";
import CityExplorer from "@/components/city/CityExplorer";
import { CITY_MAPS, type CityMapId, type CityRenderMode } from "@/components/city/cityMapsData";
import { toMapFeatures } from "@/data";
import { getCurrentUser } from "@/lib/auth-store";
import { getUserWatchlist } from "@/lib/governance-store";
import { listAllEvidence, listIssues } from "@/lib/issue-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "City Explorer · CityTrace",
};

const VALID_RENDER_MODES: readonly CityRenderMode[] = ["twin", "heatmap", "xray"];

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
  const initialView = params.view === "real" ? "real" : "twin";
  const rawMap = typeof params.map === "string" ? params.map : undefined;
  const initialMapId: CityMapId = CITY_MAPS.some((m) => m.id === rawMap)
    ? (rawMap as CityMapId)
    : "metro-twin";
  const rawMode = typeof params.mode === "string" ? params.mode : undefined;
  const initialRenderMode: CityRenderMode = VALID_RENDER_MODES.includes(
    rawMode as CityRenderMode
  )
    ? (rawMode as CityRenderMode)
    : "twin";

  const issues = await listIssues();
  const evidence = await listAllEvidence();
  const features = toMapFeatures(issues, evidence);
  const currentUser = await getCurrentUser();
  const watchlist = currentUser
    ? await getUserWatchlist(currentUser.id)
    : { issues: [], sectors: [], projects: [] };

  return (
    <CityExplorer
      initialFeatureId={initialFeatureId}
      initialView={initialView}
      initialMapId={initialMapId}
      initialRenderMode={initialRenderMode}
      features={features}
      issues={issues}
      evidence={evidence}
      followedIssueIds={watchlist.issues}
      followedSectorIds={watchlist.sectors}
      signedIn={Boolean(currentUser)}
    />
  );
}
