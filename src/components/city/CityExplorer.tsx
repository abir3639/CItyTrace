"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Eye,
  FileText,
  Layers,
  Map as MapIcon,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import CityScene from "./CityScene";
import {
  CITY_MAPS,
  CIVIC_LANDMARKS,
  type CityMapId,
  type CityRenderMode,
  type CivicLandmark,
} from "./cityMapsData";
import { EvidenceGallery } from "@/components/evidence/EvidenceTile";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ProgressBar, SpendBar } from "@/components/ui/Data";
import { SECTORS, getProject, getSector } from "@/data";
import {
  CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type Evidence,
  type Issue,
  type MapFeature,
  type MapPosition,
} from "@/types/citytrace";
import {
  TONES,
  formatBdtCompact,
  formatDate,
  formatPercent,
  issueStatusTone,
  projectStatusTone,
  severityTone,
} from "@/utils/formatters";

type FeatureFilter = "all" | "issues" | "active" | "completed" | "delayed";

const FILTER_OPTIONS: { id: FeatureFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "issues", label: "Infrastructure issues" },
  { id: "active", label: "Active projects" },
  { id: "completed", label: "Completed projects" },
  { id: "delayed", label: "Delayed projects" },
];

const RENDER_MODES: { id: CityRenderMode; label: string }[] = [
  { id: "twin", label: "Architectural Twin" },
  { id: "heatmap", label: "Risk Heatmap" },
  { id: "xray", label: "Utility X-Ray" },
];

const QUICK_TARGETS: {
  label: string;
  sub: string;
  preferredIds: string[];
  tone: "danger" | "warn" | "ok";
}[] = [
  {
    label: "Begum Rokeya Link Road",
    sub: "3× repaired",
    preferredIds: ["issue:ISS-003", "project:P-R01"],
    tone: "danger",
  },
  {
    label: "West Canal Culvert",
    sub: "Delayed",
    preferredIds: ["project:P-D02", "issue:ISS-005"],
    tone: "warn",
  },
  {
    label: "Civic Blvd Smart LED",
    sub: "Verified",
    preferredIds: ["project:P-L03"],
    tone: "ok",
  },
];

function matchesFilter(feature: MapFeature, filter: FeatureFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "issues":
      return feature.kind === "issue";
    case "active":
      return feature.kind === "project" && feature.state === "active";
    case "completed":
      return feature.kind === "project" && feature.state === "completed";
    case "delayed":
      return feature.kind === "project" && feature.state === "delayed";
  }
}

export default function CityExplorer({
  initialFeatureId = null,
  features,
  issues,
  evidence,
}: {
  /** Deep link from another module, e.g. `?feature=issue:ISS-003`. */
  initialFeatureId?: string | null;
  /** Map features built server-side so citizen reports appear immediately. */
  features: MapFeature[];
  /** Live issues including citizen submissions. */
  issues: Issue[];
  /** Live evidence including citizen-uploaded photos. */
  evidence: Evidence[];
}) {
  const [mapId, setMapId] = useState<CityMapId>("metro-twin");
  const [renderMode, setRenderMode] = useState<CityRenderMode>("twin");
  const [selectedId, setSelectedId] = useState<string | null>(initialFeatureId);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [filter, setFilter] = useState<FeatureFilter>("all");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);

  const issuesMap = useMemo(
    () => new Map<string, Issue>(issues.map((issue) => [issue.id, issue])),
    [issues]
  );

  const evidenceMap = useMemo(
    () => new Map<string, Evidence>(evidence.map((item) => [item.id, item])),
    [evidence]
  );

  const visibleFeatures = useMemo(
    () =>
      features.filter(
        (feature) =>
          matchesFilter(feature, filter) &&
          (sectorFilter === null || feature.sectorId === sectorFilter)
      ),
    [features, filter, sectorFilter]
  );

  const sectorFocus: MapPosition | null = useMemo(
    () => (sectorFilter ? (getSector(sectorFilter)?.center ?? null) : null),
    [sectorFilter]
  );

  const selected =
    visibleFeatures.find((feature) => feature.id === selectedId) ?? null;

  const selectedLandmark = useMemo(
    () =>
      selectedLandmarkId
        ? (CIVIC_LANDMARKS.find((item) => item.id === selectedLandmarkId) ?? null)
        : null,
    [selectedLandmarkId]
  );

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSelectedLandmarkId(null);
      setAutoRotate(false);
    }
  }, []);

  const handleSelectLandmark = useCallback((landmarkId: string | null) => {
    setSelectedLandmarkId(landmarkId);
    if (landmarkId) {
      setSelectedId(null);
      setAutoRotate(false);
    }
  }, []);

  const handleSelectMap = useCallback((nextMapId: CityMapId) => {
    setMapId(nextMapId);
    setSectorFilter(null);
    setSelectedId(null);
    setSelectedLandmarkId(null);
    setAutoRotate(nextMapId === "metro-twin");
  }, []);

  const focusQuickTarget = useCallback(
    (preferredIds: string[]) => {
      const match =
        visibleFeatures.find((feature) => preferredIds.includes(feature.id)) ??
        features.find((feature) => preferredIds.includes(feature.id));
      if (!match) return;
      if (!visibleFeatures.some((feature) => feature.id === match.id)) {
        setFilter("all");
        setSectorFilter(null);
      }
      handleSelect(match.id);
    },
    [features, visibleFeatures, handleSelect]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 4-Map 3D District Atlas Switcher */}
      <div
        role="group"
        aria-label="3D District Map Atlas"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
      >
        {CITY_MAPS.map((map) => {
          const active = mapId === map.id;
          return (
            <button
              key={map.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelectMap(map.id)}
              className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                active
                  ? "border-cyan-400/70 bg-cyan-500/15 shadow-[0_0_24px_-10px_rgba(34,211,238,0.65)]"
                  : "border-slate-800 bg-[#08101d] hover:border-cyan-500/40 hover:bg-[#0c182b]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                  <MapIcon className="h-3 w-3" />
                  {map.code}
                </span>
                {active ? (
                  <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-cyan-200 uppercase">
                    Active
                  </span>
                ) : null}
              </div>
              <p className="text-xs font-bold text-slate-100">{map.title}</p>
              <p className="font-mono text-[10px] text-slate-400">{map.subtitle}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-3 xl:col-span-2">
          <div className="flex flex-col gap-2">
            {/* Status & category filters + Render Mode toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTER_OPTIONS.map((option) => {
                  const count = features.filter((feature) =>
                    matchesFilter(feature, option.id)
                  ).length;
                  const active = filter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilter(option.id)}
                      aria-pressed={active}
                      className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors cursor-pointer ${
                        active
                          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                          : "border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
                      }`}
                    >
                      {option.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="3D render layer mode"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#07101d] p-0.5"
              >
                <Eye className="ml-1.5 h-3 w-3 text-cyan-400" aria-hidden="true" />
                {RENDER_MODES.map((mode) => {
                  const active = renderMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRenderMode(mode.id)}
                      className={`rounded-md px-2 py-1 font-mono text-[10px] transition-colors cursor-pointer ${
                        active
                          ? "bg-cyan-500/20 font-semibold text-cyan-200"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sector pills, Quick focus & camera controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
                  Sector
                </span>
                <button
                  type="button"
                  onClick={() => setSectorFilter(null)}
                  aria-pressed={sectorFilter === null}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors cursor-pointer ${
                    sectorFilter === null
                      ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                      : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
                  }`}
                >
                  All
                </button>
                {SECTORS.map((sector) => (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => setSectorFilter(sector.id)}
                    aria-pressed={sectorFilter === sector.id}
                    title={`${sector.name} — ${sector.ward}`}
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors cursor-pointer ${
                      sectorFilter === sector.id
                        ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                        : "border-slate-700 text-slate-300 hover:border-cyan-500/40"
                    }`}
                  >
                    {sector.code}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
                  Quick focus
                </span>
                {QUICK_TARGETS.map((target) => {
                  const isTargetSelected = Boolean(
                    selectedId && target.preferredIds.includes(selectedId)
                  );
                  return (
                    <button
                      key={target.label}
                      type="button"
                      onClick={() => focusQuickTarget(target.preferredIds)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-colors cursor-pointer ${
                        isTargetSelected
                          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                          : "border-slate-700/90 bg-slate-900/60 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${TONES[target.tone].dot}`} />
                      <span>{target.label}</span>
                      <span className="text-slate-500">· {target.sub}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoRotate((current) => !current)}
                  aria-pressed={autoRotate}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-colors cursor-pointer ${
                    autoRotate
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                      : "border-slate-700/80 bg-slate-900/80 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
                  }`}
                >
                  {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {autoRotate ? "Orbit on" : "Orbit off"}
                </button>
                <button
                  type="button"
                  onClick={() => setResetSignal((value) => value + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 font-mono text-[11px] text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-100 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                  Reset view
                </button>
              </div>
            </div>
          </div>

          <CityScene
            mapId={mapId}
            renderMode={renderMode}
            features={visibleFeatures}
            selectedId={selectedId}
            selectedLandmarkId={selectedLandmarkId}
            onSelect={handleSelect}
            onSelectLandmark={handleSelectLandmark}
            autoRotate={autoRotate}
            resetSignal={resetSignal}
            sectorFocus={sectorFocus}
          />
        </div>

        <div className="xl:col-span-1">
          {selectedLandmark ? (
            <LandmarkInspector
              landmark={selectedLandmark}
              issuesMap={issuesMap}
              onSelectFeature={handleSelect}
            />
          ) : !selected ? (
            <Panel className="flex h-full flex-col gap-3 p-4">
              <PanelHeader
                title="Record & Landmark Inspector"
                description="Select any beacon, road corridor, or glowing civic landmark in the 3D scene."
                icon={<MapPin className="h-3.5 w-3.5" />}
              />
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title={
                  visibleFeatures.length === 0
                    ? "No records match these filters"
                    : "No record or landmark selected"
                }
                description={
                  visibleFeatures.length === 0
                    ? "Nothing in the current filter and sector selection is on the map. Widen the filter or choose a different sector."
                    : "Click any glowing beacon (red issues, amber delays, green active/completed), clickable road corridor, or cyan-ringed Dhaka landmark building."
                }
                action={
                  <Link
                    href="/civic-issues"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 font-mono text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
                  >
                    Browse the register <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />

              <div className="rounded-lg border border-slate-800 bg-[#08101d] p-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
                  <Layers className="h-3 w-3" /> Clickable 3D Landmarks ({CIVIC_LANDMARKS.length})
                </p>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {CIVIC_LANDMARKS.slice(0, 4).map((lm) => (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => handleSelectLandmark(lm.id)}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-800/80 bg-[#060d18] px-2.5 py-1.5 text-left transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b] cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold text-slate-200">
                          {lm.name}
                        </span>
                        <span className="block font-mono text-[9px] text-slate-500">
                          {lm.kind} · {lm.sectorId}
                        </span>
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-cyan-400" />
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-auto font-mono text-[10px] leading-relaxed text-slate-500">
                This is a stylised representation of a fictional Dhaka urban district.
                Positions and building blocks are illustrative demonstration models.
              </p>
            </Panel>
          ) : selected.kind === "issue" ? (
            <IssueInspector
              issueId={selected.refId}
              issues={issues}
              issuesMap={issuesMap}
              evidenceMap={evidenceMap}
            />
          ) : (
            <ProjectInspector
              projectId={selected.refId}
              evidenceMap={evidenceMap}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LandmarkInspector({
  landmark,
  issuesMap,
  onSelectFeature,
}: {
  landmark: CivicLandmark;
  issuesMap: Map<string, Issue>;
  onSelectFeature: (featureId: string) => void;
}) {
  const sector = getSector(landmark.sectorId);
  const linkedProjects = landmark.relatedProjectIds
    .map((id) => getProject(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const linkedIssues = landmark.relatedIssueIds
    .map((id) => issuesMap.get(id))
    .filter((i): i is Issue => i !== undefined);

  return (
    <Panel
      glow
      className="ct-scroll flex h-full flex-col gap-3 p-4 xl:max-h-[calc(100vh-290px)] xl:overflow-y-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
          {landmark.code} · LANDMARK
        </span>
        <Badge tone="info" dot>
          {landmark.floors} floors
        </Badge>
      </div>

      <div>
        <h2 className="text-sm font-bold leading-snug text-slate-50">{landmark.name}</h2>
        <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-300">
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span>
            {landmark.kind}
            {sector ? ` · ${sector.name} (${sector.ward})` : ""}
          </span>
        </p>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-300">{landmark.summary}</p>

      {linkedProjects.length > 0 ? (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
            <Wrench className="h-3 w-3" /> Linked public works ({linkedProjects.length})
          </p>
          {linkedProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-slate-800 bg-[#08101d] p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold text-cyan-300">
                  {project.code}
                </span>
                <Badge tone={projectStatusTone(project.status)} dot>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-100">{project.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => onSelectFeature(`project:${project.id}`)}
                  className="text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  Focus beacon
                </button>
                <span className="text-slate-600">·</span>
                <Link
                  href={`/public-projects/${project.id}`}
                  className="text-slate-300 hover:text-cyan-200"
                >
                  Open ledger
                </Link>
                <span className="text-slate-600">·</span>
                <Link
                  href={`/ai-investigation?project=${project.id}`}
                  className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100"
                >
                  <Sparkles className="h-2.5 w-2.5" /> Investigate
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {linkedIssues.length > 0 ? (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
            <ShieldAlert className="h-3 w-3" /> Nearby civic issues ({linkedIssues.length})
          </p>
          <ul className="space-y-1.5">
            {linkedIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/civic-issues/${issue.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2 transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b]"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] text-cyan-300">
                      {issue.code}
                    </span>
                    <span className="block truncate text-[11px] text-slate-200">
                      {issue.title}
                    </span>
                  </span>
                  <Badge tone={issueStatusTone(issue.status)}>
                    {ISSUE_STATUS_LABELS[issue.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

function IssueInspector({
  issueId,
  issues,
  issuesMap,
  evidenceMap,
}: {
  issueId: string;
  issues: Issue[];
  issuesMap: Map<string, Issue>;
  evidenceMap: Map<string, Evidence>;
}) {
  const issue = issuesMap.get(issueId);
  if (!issue) return null;

  const sector = getSector(issue.sectorId);
  const project = issue.projectId ? getProject(issue.projectId) : undefined;
  const evidence = issue.evidenceIds
    .map((id) => evidenceMap.get(id))
    .filter((item): item is Evidence => item !== undefined);
  const atLocation = issues
    .filter((item) => item.locationKey === issue.locationKey)
    .sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
  const others = atLocation.filter((item) => item.id !== issue.id);
  const tone = issueStatusTone(issue.status);

  return (
    <Panel glow className="ct-scroll flex h-full flex-col gap-3 p-4 xl:max-h-[calc(100vh-290px)] xl:overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
          {issue.code}
        </span>
        <div className="flex items-center gap-1.5">
          <Badge tone={severityTone(issue.severity)}>{issue.severity.toUpperCase()}</Badge>
          <Badge tone={tone} dot>
            {ISSUE_STATUS_LABELS[issue.status]}
          </Badge>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold leading-snug text-slate-50">{issue.title}</h2>
        <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-300">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span>
            {issue.location}
            {sector ? ` · ${sector.name}` : ""}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Reported</p>
          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-100">
            {formatDate(issue.reportedAt)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Category</p>
          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-100">
            {CATEGORY_LABELS[issue.category]}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Citizen reports</p>
          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-100">
            {issue.reportCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">Last update</p>
          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-100">
            {formatDate(issue.updatedAt)}
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-300">{issue.description}</p>

      {others.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
            <ShieldAlert className="h-3 w-3" /> Recurring at this location
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/90">
            {atLocation.length} separate reports exist for this physical site.
          </p>
          <ul className="mt-1.5 space-y-1">
            {others.map((item) => (
              <li key={item.id} className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[issueStatusTone(item.status)].dot}`} />
                <span className="text-cyan-300">{item.code}</span>
                <span className="truncate text-slate-400">{formatDate(item.reportedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {project ? (
        <Link
          href={`/public-projects/${project.id}`}
          className="rounded-lg border border-slate-800 bg-[#08101d] p-2.5 transition-colors hover:border-cyan-500/40 hover:bg-[#0c182b]"
        >
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
            <Wrench className="h-3 w-3" /> Related project
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-cyan-300">{project.code}</p>
          <p className="truncate text-[11px] font-semibold text-slate-100">{project.name}</p>
        </Link>
      ) : null}

      <div>
        <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
          <FileText className="h-3 w-3" /> Evidence ({evidence.length})
        </p>
        <div className="mt-1.5">
          <EvidenceGallery items={evidence} compact />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Link
          href={`/civic-issues/${issue.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 font-mono text-[11px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25"
        >
          Open full issue history <ArrowRight className="h-3 w-3" />
        </Link>
        {project ? (
          <Link
            href={`/ai-investigation?project=${project.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-300/50 bg-gradient-to-r from-cyan-500 to-sky-500 px-3 py-2 font-mono text-[11px] font-bold text-slate-950 transition-all hover:brightness-110"
          >
            <Sparkles className="h-3 w-3" /> Investigate with AI
          </Link>
        ) : null}
      </div>
    </Panel>
  );
}

function ProjectInspector({
  projectId,
  evidenceMap,
}: {
  projectId: string;
  evidenceMap: Map<string, Evidence>;
}) {
  const project = getProject(projectId);
  if (!project) return null;

  const sector = getSector(project.sectorId);
  const evidence = project.evidenceIds
    .map((id) => evidenceMap.get(id))
    .filter((item): item is Evidence => item !== undefined);
  const tone = projectStatusTone(project.status);
  const spend = formatPercent(
    (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100,
    1
  );
  const metMilestones = project.milestones.filter((m) => m.status === "met").length;
  const missedMilestones = project.milestones.filter((m) => m.status === "missed").length;

  return (
    <Panel glow className="ct-scroll flex h-full flex-col gap-3 p-4 xl:max-h-[calc(100vh-290px)] xl:overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
          {project.code}
        </span>
        <div className="flex items-center gap-1.5">
          <Badge tone={severityTone(project.severity)}>{project.severity.toUpperCase()}</Badge>
          <Badge tone={tone} dot>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold leading-snug text-slate-50">{project.name}</h2>
        <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-300">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span>
            {project.location}
            {sector ? ` · ${sector.name}` : ""}
          </span>
        </p>
        <p className="mt-1 font-mono text-[10px] text-slate-400">{project.authority}</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-[#07101d] p-2.5">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">
            Reported spend
          </p>
          <p className="font-mono text-[11px] font-semibold text-cyan-200">{spend}</p>
        </div>
        <SpendBar
          allocated={project.allocatedBudgetBdt}
          reported={project.reportedExpenditureBdt}
          verified={project.verifiedExpenditureBdt}
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
          <span className="text-slate-300">
            {formatBdtCompact(project.reportedExpenditureBdt)} of{" "}
            {formatBdtCompact(project.allocatedBudgetBdt)}
          </span>
          <span className={project.verifiedExpenditureBdt === undefined ? TONES.warn.label : TONES.ok.label}>
            {project.verifiedExpenditureBdt === undefined
              ? "No verified spend on file"
              : `${formatBdtCompact(project.verifiedExpenditureBdt)} verified`}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
          <span>Verified physical progress</span>
          <span className="font-semibold text-slate-200">
            {project.verifiedProgressPercent}%
          </span>
        </div>
        <ProgressBar
          value={project.verifiedProgressPercent}
          tone={tone}
          className="mt-1"
          label={`${project.verifiedProgressPercent} percent verified progress`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
          <p className="flex items-center gap-1 font-mono text-[9px] tracking-wider text-slate-400 uppercase">
            <CalendarClock className="h-2.5 w-2.5" /> Planned
          </p>
          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-100">
            {formatDate(project.plannedCompletionDate)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#08101d] px-2.5 py-2">
          <p className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">
            Milestones
          </p>
          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-100">
            {metMilestones} met · {missedMilestones} missed
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-300">{project.description}</p>

      <div>
        <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
          <FileText className="h-3 w-3" /> Evidence ({evidence.length})
        </p>
        <div className="mt-1.5">
          <EvidenceGallery items={evidence} compact />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Link
          href={`/public-projects/${project.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 font-mono text-[11px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25"
        >
          Open project ledger <ArrowRight className="h-3 w-3" />
        </Link>
        <Link
          href={`/ai-investigation?project=${project.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-300/50 bg-gradient-to-r from-cyan-500 to-sky-500 px-3 py-2 font-mono text-[11px] font-bold text-slate-950 transition-all hover:brightness-110"
        >
          <Sparkles className="h-3 w-3" /> Investigate with AI
        </Link>
      </div>
    </Panel>
  );
}
