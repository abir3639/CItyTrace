"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Box,
  Building2,
  CalendarClock,
  Check,
  Clock,
  Compass,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Landmark,
  MapPin,
  MapPinPlus,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Share2,
  ShieldAlert,
  Sparkles,
  Sun,
  Wrench,
  X,
} from "lucide-react";
import CityScene from "./CityScene";
import {
  REAL_DHAKA_MARKER_COLORS,
  type RealDhakaTheme,
} from "./realDhakaStyle";

const RealDhakaMap = dynamic(() => import("./RealDhakaMap"), {
  ssr: false,
  loading: () => <div className="ct-skeleton absolute inset-0" aria-hidden="true" />,
});
import {
  CITY_MAPS,
  CIVIC_LANDMARKS,
  DHAKA_BUILDINGS,
  type CityMapId,
  type CityRenderMode,
  type CivicLandmark,
} from "./cityMapsData";
import { EvidenceGallery } from "@/components/evidence/EvidenceTile";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar, SpendBar } from "@/components/ui/Data";
import { PROJECTS, SECTORS, getProject, getSector } from "@/data";
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
  mapFeatureTone,
  projectStatusTone,
  severityTone,
} from "@/utils/formatters";

type FeatureFilter = "all" | "issues" | "delayed" | "active" | "completed";

const FILTER_OPTIONS: { id: FeatureFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "issues", label: "Issues" },
  { id: "delayed", label: "Delayed" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Done" },
];

const RENDER_MODES: { id: CityRenderMode; label: string }[] = [
  { id: "twin", label: "Map" },
  { id: "heatmap", label: "Heatmap" },
  { id: "xray", label: "X-Ray" },
];

const LOCATION_SHORTCUTS: {
  label: string;
  preferredIds: string[];
  tone: "danger" | "warn" | "ok";
}[] = [
  {
    label: "Link Rd 3×",
    preferredIds: ["issue:ISS-003", "project:P-R01"],
    tone: "danger",
  },
  {
    label: "Canal Culvert",
    preferredIds: ["project:P-D02", "issue:ISS-005"],
    tone: "warn",
  },
  {
    label: "Smart LED",
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

export type ExplorerView = "twin" | "real";

export default function CityExplorer({
  initialFeatureId = null,
  initialView = "twin",
  initialMapId = "metro-twin",
  initialRenderMode = "twin",
  features,
  issues,
  evidence,
}: {
  /** Deep link from another module, e.g. `?feature=issue:ISS-003`. */
  initialFeatureId?: string | null;
  /** Active map renderer: stylized Three.js Digital Twin or Real Dhaka 3D map. */
  initialView?: ExplorerView;
  initialMapId?: CityMapId;
  initialRenderMode?: CityRenderMode;
  /** Map features built server-side so citizen reports appear immediately. */
  features: MapFeature[];
  /** Live issues including citizen submissions. */
  issues: Issue[];
  /** Live evidence including citizen-uploaded photos. */
  evidence: Evidence[];
}) {
  const router = useRouter();
  const [view, setView] = useState<ExplorerView>(initialView);
  const [mapId, setMapId] = useState<CityMapId>(initialMapId);
  const [renderMode, setRenderMode] = useState<CityRenderMode>(initialRenderMode);
  const [pitchMode, setPitchMode] = useState<"3d" | "flat">("3d");
  const [mapTheme, setMapTheme] = useState<RealDhakaTheme>("daylight");
  const [selectedId, setSelectedId] = useState<string | null>(initialFeatureId);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [landmarksMenuOpen, setLandmarksMenuOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(
    initialView === "twin" && initialMapId === "metro-twin"
  );
  const [resetSignal, setResetSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState<{ delta: number; seq: number } | null>(null);
  const [showRadar, setShowRadar] = useState(false);
  const [filter, setFilter] = useState<FeatureFilter>("all");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [hudHidden, setHudHidden] = useState(false);
  const [reportPinMode, setReportPinMode] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [timelineStep, setTimelineStep] = useState<number | null>(null);

  const issuesMap = useMemo(
    () => new Map<string, Issue>(issues.map((issue) => [issue.id, issue])),
    [issues]
  );

  const evidenceMap = useMemo(
    () => new Map<string, Evidence>(evidence.map((item) => [item.id, item])),
    [evidence]
  );

  const timelineMonths = useMemo(() => {
    const months = new Set<string>();
    for (const issue of issues) {
      months.add(issue.reportedAt.slice(0, 7));
      if (issue.resolvedAt) months.add(issue.resolvedAt.slice(0, 7));
    }
    for (const project of PROJECTS) {
      months.add(project.startDate.slice(0, 7));
    }
    return [...months].sort();
  }, [issues]);

  const activeMonth =
    timelineStep !== null && timelineStep < timelineMonths.length
      ? timelineMonths[timelineStep]
      : null;

  const timelineFeatures = useMemo(() => {
    if (!activeMonth) return features;
    const cutoff = `${activeMonth}-31`;
    const list: MapFeature[] = [];
    for (const issue of issues) {
      if (issue.reportedAt > cutoff) continue;
      if (issue.resolvedAt && issue.resolvedAt <= cutoff) continue;
      list.push({
        id: `issue:${issue.id}`,
        refId: issue.id,
        kind: "issue",
        state: "unresolved",
        label: issue.code,
        sublabel: issue.title,
        coordinates: issue.coordinates,
        sectorId: issue.sectorId,
        severity: issue.severity,
      });
    }
    for (const project of PROJECTS) {
      if (project.startDate > cutoff) continue;
      const existing = features.find((f) => f.id === `project:${project.id}`);
      if (existing) list.push(existing);
    }
    return list;
  }, [activeMonth, features, issues]);

  const visibleFeatures = useMemo(
    () =>
      timelineFeatures.filter(
        (feature) =>
          matchesFilter(feature, filter) &&
          (sectorFilter === null || feature.sectorId === sectorFilter)
      ),
    [timelineFeatures, filter, sectorFilter]
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
      setLandmarksMenuOpen(false);
      setAutoRotate(false);
    }
  }, []);

  const handleSelectLandmark = useCallback((landmarkId: string | null) => {
    setSelectedLandmarkId(landmarkId);
    if (landmarkId) {
      setSelectedId(null);
      setLandmarksMenuOpen(false);
      setAutoRotate(false);
    }
  }, []);

  const handleSelectMap = useCallback((nextMapId: CityMapId) => {
    setMapId(nextMapId);
    setSectorFilter(null);
    setSelectedId(null);
    setSelectedLandmarkId(null);
    setLandmarksMenuOpen(false);
    setAutoRotate(nextMapId === "metro-twin");
  }, []);

  const handleSelectView = useCallback(
    (next: ExplorerView) => {
      setView(next);
      setSelectedLandmarkId(null);
      setLandmarksMenuOpen(false);
      setAutoRotate(next === "twin" && mapId === "metro-twin");
    },
    [mapId]
  );

  const handlePickReportLocation = useCallback(
    (picked: { sectorId: string; coordinates: MapPosition; locationLabel: string }) => {
      setReportPinMode(false);
      const params = new URLSearchParams({
        sector: picked.sectorId,
        x: String(picked.coordinates[0]),
        z: String(picked.coordinates[1]),
        loc: picked.locationLabel,
      });
      router.push(`/civic-issues/report?${params.toString()}`);
    },
    [router]
  );

  const copyShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in insecure contexts.
    }
  }, []);

  // Synchronize ?view=, ?map=, ?mode=, and ?feature= into the URL without adding history entries.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === "real") url.searchParams.set("view", "real");
    else url.searchParams.delete("view");

    if (view === "twin" && mapId !== "metro-twin") url.searchParams.set("map", mapId);
    else url.searchParams.delete("map");

    if (view === "twin" && renderMode !== "twin") url.searchParams.set("mode", renderMode);
    else url.searchParams.delete("mode");

    if (selectedId) url.searchParams.set("feature", selectedId);
    else url.searchParams.delete("feature");

    window.history.replaceState(null, "", url.toString());
  }, [view, mapId, renderMode, selectedId]);

  // Auto-advance timeline playback when playing.
  useEffect(() => {
    if (!timelineOpen || !timelinePlaying || timelineMonths.length === 0) return;
    const timer = window.setInterval(() => {
      setTimelineStep((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next >= timelineMonths.length) {
          setTimelinePlaying(false);
          return null;
        }
        return next;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [timelineOpen, timelinePlaying, timelineMonths.length]);

  const closeInspector = useCallback(() => {
    setSelectedId(null);
    setSelectedLandmarkId(null);
  }, []);

  const hasInspectorOpen = Boolean(selected || selectedLandmark);

  // Global keyboard shortcuts: Esc closes overlays/modes, 1-4 switch Digital Twin maps, H hides HUD.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        if (reportPinMode) {
          setReportPinMode(false);
        } else if (landmarksMenuOpen) {
          setLandmarksMenuOpen(false);
        } else if (hasInspectorOpen) {
          closeInspector();
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (view === "twin" && ["1", "2", "3", "4"].includes(event.key)) {
        const targetMap = CITY_MAPS[Number(event.key) - 1];
        if (targetMap) handleSelectMap(targetMap.id);
        return;
      }

      if (event.key.toLowerCase() === "h") {
        setHudHidden((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, reportPinMode, landmarksMenuOpen, hasInspectorOpen, closeInspector, handleSelectMap]);

  const focusShortcut = useCallback(
    (preferredIds: string[]) => {
      const match =
        visibleFeatures.find((feature) => preferredIds.includes(feature.id)) ??
        features.find((feature) => preferredIds.includes(feature.id));
      if (!match) return;
      if (!visibleFeatures.some((feature) => feature.id === match.id)) {
        setFilter("all");
        setSectorFilter(null);
        setTimelineStep(null);
      }
      handleSelect(match.id);
    },
    [features, visibleFeatures, handleSelect]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Compact hero header row: title + view & 3D Map switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[#1D1D1F] sm:text-[24px]">
            City Explorer
          </h1>
          <span className="text-[12.5px] text-[#6E6E73] tabular-nums">
            {view === "twin"
              ? `${visibleFeatures.length} records · ${DHAKA_BUILDINGS.length} buildings`
              : `${visibleFeatures.length} records · OpenStreetMap 3D buildings`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div role="group" aria-label="Map type" className="ct-segmented">
            <button
              type="button"
              aria-pressed={view === "twin"}
              onClick={() => handleSelectView("twin")}
              className="ct-segmented-item inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Box className="h-3.5 w-3.5" />
              Digital Twin
            </button>
            <button
              type="button"
              aria-pressed={view === "real"}
              onClick={() => handleSelectView("real")}
              className="ct-segmented-item inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Globe className="h-3.5 w-3.5" />
              Real Dhaka
            </button>
          </div>

          {view === "twin" ? (
            <div
              role="group"
              aria-label="3D District Map Selector"
              className="ct-segmented overflow-x-auto max-w-full"
            >
              {CITY_MAPS.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  aria-pressed={mapId === map.id}
                  onClick={() => handleSelectMap(map.id)}
                  title={`${map.title} — ${map.subtitle}`}
                  className="ct-segmented-item whitespace-nowrap"
                >
                  {map.shortLabel}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Hero Full-Viewport 3D Map Surface */}
      <div
        className={`relative h-[calc(100vh-158px)] min-h-[540px] w-full overflow-hidden rounded-[24px] border border-black/[0.07] shadow-[0_12px_40px_-14px_rgba(15,23,42,0.14)] transition-colors duration-300 ${
          view === "real" && mapTheme === "dark" ? "bg-[#101827]" : "bg-[#EEF1F6]"
        }`}
      >
        {view === "twin" ? (
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
            zoomSignal={zoomSignal}
            sectorFocus={sectorFocus}
            showRadar={showRadar}
            reportPinMode={reportPinMode}
            onPickReportLocation={handlePickReportLocation}
          />
        ) : (
          <RealDhakaMap
            features={visibleFeatures}
            selectedId={selectedId}
            onSelect={handleSelect}
            sectorFocus={sectorFilter}
            resetSignal={resetSignal}
            zoomSignal={zoomSignal}
            autoRotate={autoRotate}
            pitchMode={pitchMode}
            mapTheme={mapTheme}
            reportPinMode={reportPinMode}
            onPickReportLocation={handlePickReportLocation}
          />
        )}

        {/* Crosshair Report Pin Banner */}
        {reportPinMode ? (
          <div className="pointer-events-none absolute top-14 left-1/2 z-30 -translate-x-1/2 px-3">
            <div className="ct-glass-pill pointer-events-auto flex items-center gap-2.5 rounded-full border border-[#007AFF]/35 px-3.5 py-1.5 text-[12px] font-medium text-[#1D1D1F] shadow-md">
              <MapPinPlus className="h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
              <span className="whitespace-nowrap">
                Click anywhere on the map to drop a report pin · Esc to cancel
              </span>
              <button
                type="button"
                onClick={() => setReportPinMode(false)}
                className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold text-[#1D1D1F] hover:bg-black/[0.1] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {!hudHidden ? (
          <>
            {/* Floating Top-Left Consolidated Toolbar: Filters + Sector + Shortcuts + Pin */}
            <div className="pointer-events-none absolute top-3 right-3 left-3 z-20 flex flex-wrap items-start justify-between gap-2">
              <div className="ct-glass-pill pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl px-2.5 py-1.5">
                {/* Status filter pills */}
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter map markers">
                  {FILTER_OPTIONS.map((option) => {
                    const active = filter === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setFilter(option.id)}
                        className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer active:scale-[0.97] ${
                          active
                            ? "bg-[#1D1D1F] text-white shadow-sm"
                            : "text-[#6E6E73] hover:bg-black/[0.05] hover:text-[#1D1D1F]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <span className="hidden h-4 w-px bg-black/[0.1] sm:inline-block" aria-hidden="true" />

                {/* Compact sector dropdown */}
                <label className="sr-only" htmlFor="explorer-sector-select">
                  Filter by sector
                </label>
                <select
                  id="explorer-sector-select"
                  value={sectorFilter ?? ""}
                  onChange={(event) => setSectorFilter(event.target.value || null)}
                  className="rounded-full bg-black/[0.045] px-2.5 py-1 text-[12px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.07] focus:outline-none cursor-pointer"
                >
                  <option value="">All sectors</option>
                  {SECTORS.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.code} · {sector.name}
                    </option>
                  ))}
                </select>

                <span className="hidden h-4 w-px bg-black/[0.1] md:inline-block" aria-hidden="true" />

                {/* Compact location shortcuts */}
                <div className="hidden items-center gap-1 md:flex">
                  {LOCATION_SHORTCUTS.map((shortcut) => {
                    const isSelected = Boolean(
                      selectedId && shortcut.preferredIds.includes(selectedId)
                    );
                    return (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={() => focusShortcut(shortcut.preferredIds)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer active:scale-[0.97] ${
                          isSelected
                            ? "bg-[#007AFF]/[0.12] text-[#0055CC]"
                            : "text-[#1D1D1F]/80 hover:bg-black/[0.05]"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${TONES[shortcut.tone].dot}`} />
                        {shortcut.label}
                      </button>
                    );
                  })}
                </div>

                <span className="hidden h-4 w-px bg-black/[0.1] sm:inline-block" aria-hidden="true" />

                {/* Click-on-map report pin toggle */}
                <button
                  type="button"
                  aria-pressed={reportPinMode}
                  onClick={() => setReportPinMode((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-all cursor-pointer active:scale-[0.97] ${
                    reportPinMode
                      ? "bg-[#007AFF] text-white shadow-sm"
                      : "bg-[#007AFF]/[0.1] text-[#0055CC] hover:bg-[#007AFF]/[0.16]"
                  }`}
                >
                  <MapPinPlus className="h-3.5 w-3.5" />
                  <span>{reportPinMode ? "Cancel pin" : "Report here"}</span>
                </button>
              </div>

              {/* Top-right compact utility pills & Landmarks trigger when inspector is closed */}
              {!hasInspectorOpen ? (
                <div className="pointer-events-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void copyShareUrl()}
                    title="Copy shareable view link"
                    className="ct-glass-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-[#1D1D1F] transition-all hover:bg-white cursor-pointer active:scale-[0.98]"
                  >
                    {shareCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#34C759]" />
                        <span className="hidden sm:inline text-[#1A7F37]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5 text-[#007AFF]" />
                        <span className="hidden sm:inline">Share</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHudHidden(true)}
                    title="Hide map controls (H)"
                    aria-label="Hide map controls"
                    className="ct-glass-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-[#6E6E73] transition-all hover:bg-white hover:text-[#1D1D1F] cursor-pointer active:scale-[0.98]"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>

                  {view === "twin" ? (
                    <div className="relative">
                      <button
                        type="button"
                        aria-expanded={landmarksMenuOpen}
                        onClick={() => setLandmarksMenuOpen((prev) => !prev)}
                        className="ct-glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#1D1D1F] transition-all hover:bg-white cursor-pointer active:scale-[0.98]"
                      >
                        <Landmark className="h-3.5 w-3.5 text-[#007AFF]" />
                        <span>Landmarks ({CIVIC_LANDMARKS.length})</span>
                      </button>

                      {landmarksMenuOpen ? (
                        <div className="ct-glass ct-fade-up absolute right-0 mt-2 w-72 overflow-hidden rounded-[20px] p-1.5">
                          <p className="px-2.5 py-1.5 text-[11.5px] font-semibold text-[#6E6E73]">
                            Jump to a 3D civic landmark
                          </p>
                          <ul className="ct-scroll max-h-72 space-y-0.5 overflow-y-auto">
                            {CIVIC_LANDMARKS.map((lm) => (
                              <li key={lm.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectLandmark(lm.id)}
                                  className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.05] cursor-pointer"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-[12.5px] font-medium text-[#1D1D1F]">
                                      {lm.name}
                                    </span>
                                    <span className="block text-[11px] text-[#6E6E73]">
                                      {lm.kind} · {lm.sectorId}
                                    </span>
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Floating Bottom-Left Legend + Timeline Scrubber + Radar Toggle */}
            <div
              className={`pointer-events-none absolute left-3 z-20 flex max-w-[calc(100%-24px)] flex-col items-start gap-2 ${
                view === "real" ? "bottom-10" : "bottom-3"
              }`}
            >
              {timelineOpen && timelineMonths.length > 0 ? (
                <div className="ct-glass-pill pointer-events-auto flex flex-wrap items-center gap-2.5 rounded-2xl px-3 py-2 text-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (timelineStep === null) setTimelineStep(0);
                      setTimelinePlaying((prev) => !prev);
                    }}
                    aria-label={timelinePlaying ? "Pause timeline" : "Play timeline"}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#007AFF] text-white shadow-xs hover:bg-[#0066D6] cursor-pointer"
                  >
                    {timelinePlaying ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3 translate-x-[0.5px]" />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={timelineMonths.length}
                    value={timelineStep ?? timelineMonths.length}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setTimelinePlaying(false);
                      setTimelineStep(next >= timelineMonths.length ? null : next);
                    }}
                    aria-label="Filter map timeline by month"
                    className="h-1.5 w-32 accent-[#007AFF] sm:w-44 cursor-pointer"
                  />

                  <span className="min-w-[78px] font-semibold text-[#1D1D1F] tabular-nums">
                    {activeMonth ?? "Latest"}
                  </span>

                  {timelineStep !== null ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTimelinePlaying(false);
                        setTimelineStep(null);
                      }}
                      className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#1D1D1F] hover:bg-black/[0.1] cursor-pointer"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <div className="ct-glass-pill pointer-events-auto flex flex-wrap items-center gap-3 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-[#1D1D1F]">
                  {(
                    [
                      ["unresolved", "Issue"],
                      ["delayed", "Delayed"],
                      ["active", "Active / Done"],
                    ] as const
                  ).map(([state, label]) => (
                    <span key={state} className="inline-flex items-center gap-1.5">
                      {view === "real" ? (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: REAL_DHAKA_MARKER_COLORS[state] }}
                        />
                      ) : (
                        <span className={`h-2 w-2 rounded-full ${TONES[mapFeatureTone(state)].dot}`} />
                      )}
                      {label}
                    </span>
                  ))}
                  {view === "twin" ? (
                    <span className="hidden items-center gap-1.5 sm:inline-flex">
                      <span className="h-2 w-2 rounded-full border border-[#007AFF] bg-[#007AFF]/20" />
                      Landmark
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  aria-pressed={timelineOpen}
                  onClick={() => setTimelineOpen((prev) => !prev)}
                  className={`ct-glass-pill pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all cursor-pointer active:scale-[0.98] ${
                    timelineOpen || timelineStep !== null ? "text-[#007AFF]" : "text-[#1D1D1F]"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-[#007AFF]" />
                  Timeline
                </button>

                {view === "twin" ? (
                  <button
                    type="button"
                    aria-pressed={showRadar}
                    onClick={() => setShowRadar((prev) => !prev)}
                    className={`ct-glass-pill pointer-events-auto hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all sm:inline-flex cursor-pointer active:scale-[0.98] ${
                      showRadar ? "text-[#007AFF]" : "text-[#1D1D1F]"
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5 text-[#007AFF]" />
                    Radar
                  </button>
                ) : (
                  <span className="ct-glass-pill pointer-events-auto hidden rounded-full px-3 py-1.5 text-[11.5px] text-[#6E6E73] sm:inline-flex">
                    Approximate locations · simulated records
                  </span>
                )}
              </div>
            </div>

            {/* Floating Bottom-Right Layer Mode & Camera Controls */}
            <div
              className={`pointer-events-none absolute right-3 bottom-3 z-20 flex flex-wrap items-end gap-2 transition-all duration-200 ${
                hasInspectorOpen ? "lg:right-[364px]" : ""
              }`}
            >
              {view === "twin" ? (
                <div
                  role="group"
                  aria-label="3D render mode"
                  className="ct-glass-pill pointer-events-auto inline-flex items-center gap-0.5 rounded-full p-1"
                >
                  {RENDER_MODES.map((mode) => {
                    const active = renderMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setRenderMode(mode.id)}
                        className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                          active
                            ? "bg-[#007AFF] text-white shadow-sm"
                            : "text-[#6E6E73] hover:text-[#1D1D1F]"
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div
                    role="group"
                    aria-label="Map appearance"
                    className="ct-glass-pill pointer-events-auto inline-flex items-center gap-0.5 rounded-full p-1"
                  >
                    <button
                      type="button"
                      aria-label="Daylight map mode"
                      aria-pressed={mapTheme === "daylight"}
                      onClick={() => setMapTheme("daylight")}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                        mapTheme === "daylight"
                          ? "bg-[#1D1D1F] text-white shadow-sm"
                          : "text-[#6E6E73] hover:text-[#1D1D1F]"
                      }`}
                    >
                      <Sun className="h-3 w-3" />
                      Day
                    </button>
                    <button
                      type="button"
                      aria-label="Dark map mode"
                      aria-pressed={mapTheme === "dark"}
                      onClick={() => setMapTheme("dark")}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                        mapTheme === "dark"
                          ? "bg-[#1D1D1F] text-white shadow-sm"
                          : "text-[#6E6E73] hover:text-[#1D1D1F]"
                      }`}
                    >
                      <Moon className="h-3 w-3" />
                      Dark
                    </button>
                  </div>

                  <div
                    role="group"
                    aria-label="Map tilt mode"
                    className="ct-glass-pill pointer-events-auto inline-flex items-center gap-0.5 rounded-full p-1"
                  >
                    {(
                      [
                        ["3d", "3D"],
                        ["flat", "Flat"],
                      ] as const
                    ).map(([mode, label]) => {
                      const active = pitchMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setPitchMode(mode)}
                          className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                            active
                              ? "bg-[#007AFF] text-white shadow-sm"
                              : "text-[#6E6E73] hover:text-[#1D1D1F]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="ct-glass-pill pointer-events-auto flex items-center divide-x divide-black/[0.07] overflow-hidden rounded-full">
                <button
                  type="button"
                  onClick={() =>
                    setZoomSignal((prev) => ({ delta: -3.2, seq: (prev?.seq ?? 0) + 1 }))
                  }
                  aria-label="Zoom in"
                  title="Zoom in"
                  className="p-2 text-[#1D1D1F] transition-colors hover:bg-black/[0.05] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setZoomSignal((prev) => ({ delta: 3.2, seq: (prev?.seq ?? 0) + 1 }))
                  }
                  aria-label="Zoom out"
                  title="Zoom out"
                  className="p-2 text-[#1D1D1F] transition-colors hover:bg-black/[0.05] cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate((current) => !current)}
                  aria-label={autoRotate ? "Pause orbit rotation" : "Start orbit rotation"}
                  title={autoRotate ? "Pause orbit" : "Resume orbit"}
                  className={`p-2 transition-colors hover:bg-black/[0.05] cursor-pointer ${
                    autoRotate ? "text-[#007AFF]" : "text-[#6E6E73]"
                  }`}
                >
                  {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setResetSignal((value) => value + 1)}
                  aria-label="Reset camera view"
                  title="Reset view"
                  className="p-2 text-[#1D1D1F] transition-colors hover:bg-black/[0.05] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setHudHidden(false)}
            className="ct-glass-pill absolute right-3 bottom-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[#1D1D1F] shadow-sm transition-all hover:bg-white cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-[#007AFF]" />
            Show controls (H)
          </button>
        )}

        {/* Floating Apple Maps-style Glass Inspector (Desktop overlay) */}
        {hasInspectorOpen ? (
          <aside
            aria-label="Selected record details"
            className="ct-glass ct-fade-up ct-scroll absolute top-3 right-3 bottom-3 z-30 hidden w-[344px] flex-col overflow-y-auto rounded-[22px] p-4 lg:flex"
          >
            {selectedLandmark ? (
              <LandmarkInspector
                landmark={selectedLandmark}
                issuesMap={issuesMap}
                onSelectFeature={handleSelect}
                onClose={closeInspector}
              />
            ) : selected?.kind === "issue" ? (
              <IssueInspector
                issueId={selected.refId}
                issues={issues}
                issuesMap={issuesMap}
                evidenceMap={evidenceMap}
                onClose={closeInspector}
              />
            ) : selected ? (
              <ProjectInspector
                projectId={selected.refId}
                evidenceMap={evidenceMap}
                onClose={closeInspector}
              />
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* Mobile / tablet floating bottom-sheet inspector */}
      {hasInspectorOpen ? (
        <div
          role="dialog"
          aria-label="Selected record details"
          className="ct-glass ct-fade-up ct-scroll fixed inset-x-3 bottom-3 z-40 max-h-[62vh] overflow-y-auto rounded-[24px] p-4 shadow-2xl lg:hidden"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/[0.18]" aria-hidden="true" />
          {selectedLandmark ? (
            <LandmarkInspector
              landmark={selectedLandmark}
              issuesMap={issuesMap}
              onSelectFeature={handleSelect}
              onClose={closeInspector}
            />
          ) : selected?.kind === "issue" ? (
            <IssueInspector
              issueId={selected.refId}
              issues={issues}
              issuesMap={issuesMap}
              evidenceMap={evidenceMap}
              onClose={closeInspector}
            />
          ) : selected ? (
            <ProjectInspector
              projectId={selected.refId}
              evidenceMap={evidenceMap}
              onClose={closeInspector}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Floating Glass Inspectors                                           */
/* ------------------------------------------------------------------ */

function CloseInspectorButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close details panel"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[#6E6E73] transition-colors hover:bg-black/[0.1] hover:text-[#1D1D1F] cursor-pointer"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function LandmarkInspector({
  landmark,
  issuesMap,
  onSelectFeature,
  onClose,
}: {
  landmark: CivicLandmark;
  issuesMap: Map<string, Issue>;
  onSelectFeature: (featureId: string) => void;
  onClose: () => void;
}) {
  const sector = getSector(landmark.sectorId);
  const linkedProjects = landmark.relatedProjectIds
    .map((id) => getProject(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const linkedIssues = landmark.relatedIssueIds
    .map((id) => issuesMap.get(id))
    .filter((i): i is Issue => i !== undefined);

  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#007AFF]/[0.1] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
            {landmark.code}
          </span>
          <Badge tone="neutral">{landmark.floors} floors</Badge>
        </div>
        <CloseInspectorButton onClose={onClose} />
      </div>

      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] leading-snug text-[#1D1D1F]">
          {landmark.name}
        </h2>
        <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-[#6E6E73]">
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
          <span>
            {landmark.kind}
            {sector ? ` · ${sector.name} (${sector.ward})` : ""}
          </span>
        </p>
      </div>

      <p className="text-[13px] leading-relaxed text-[#48484A]">{landmark.summary}</p>

      {linkedProjects.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
            <Wrench className="h-3.5 w-3.5 text-[#6E6E73]" /> Linked public works ({linkedProjects.length})
          </p>
          {linkedProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-[14px] border border-black/[0.06] bg-white/85 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
                  {project.code}
                </span>
                <Badge tone={projectStatusTone(project.status)} dot>
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </div>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-[#1D1D1F]">
                {project.name}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] font-medium">
                <button
                  type="button"
                  onClick={() => onSelectFeature(`project:${project.id}`)}
                  className="text-[#007AFF] hover:underline cursor-pointer"
                >
                  Focus beacon
                </button>
                <span className="text-black/20">·</span>
                <Link
                  href={`/public-projects/${project.id}`}
                  className="text-[#1D1D1F] hover:text-[#007AFF]"
                >
                  Ledger
                </Link>
                <span className="text-black/20">·</span>
                <Link
                  href={`/ai-investigation?project=${project.id}`}
                  className="inline-flex items-center gap-1 text-[#007AFF] hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> Investigate
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {linkedIssues.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#6E6E73]" /> Nearby civic issues ({linkedIssues.length})
          </p>
          <ul className="space-y-1.5">
            {linkedIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/civic-issues/${issue.id}`}
                  className="flex items-center justify-between gap-2 rounded-[14px] border border-black/[0.06] bg-white/85 px-3 py-2.5 transition-colors hover:bg-white"
                >
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
                      {issue.code}
                    </span>
                    <span className="block truncate text-[12.5px] font-medium text-[#1D1D1F]">
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
    </div>
  );
}

function IssueInspector({
  issueId,
  issues,
  issuesMap,
  evidenceMap,
  onClose,
}: {
  issueId: string;
  issues: Issue[];
  issuesMap: Map<string, Issue>;
  evidenceMap: Map<string, Evidence>;
  onClose: () => void;
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
    <div className="flex flex-1 flex-col gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#007AFF]/[0.1] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
            {issue.code}
          </span>
          <Badge tone={tone} dot>
            {ISSUE_STATUS_LABELS[issue.status]}
          </Badge>
          <Badge tone={severityTone(issue.severity)}>
            {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
          </Badge>
        </div>
        <CloseInspectorButton onClose={onClose} />
      </div>

      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] leading-snug text-[#1D1D1F]">
          {issue.title}
        </h2>
        <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-[#6E6E73]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
          <span>
            {issue.location}
            {sector ? ` · ${sector.name}` : ""}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[12px] bg-black/[0.04] px-3 py-2">
          <p className="text-[11px] text-[#6E6E73]">Reported</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[#1D1D1F] tabular-nums">
            {formatDate(issue.reportedAt)}
          </p>
        </div>
        <div className="rounded-[12px] bg-black/[0.04] px-3 py-2">
          <p className="text-[11px] text-[#6E6E73]">Category</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[#1D1D1F]">
            {CATEGORY_LABELS[issue.category]}
          </p>
        </div>
        <div className="rounded-[12px] bg-black/[0.04] px-3 py-2">
          <p className="text-[11px] text-[#6E6E73]">Citizen reports</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[#1D1D1F] tabular-nums">
            {issue.reportCount}
          </p>
        </div>
        <div className="rounded-[12px] bg-black/[0.04] px-3 py-2">
          <p className="text-[11px] text-[#6E6E73]">Updated</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[#1D1D1F] tabular-nums">
            {formatDate(issue.updatedAt)}
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-[#48484A]">{issue.description}</p>

      {others.length > 0 ? (
        <div className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.08] p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#B25000]">
            <ShieldAlert className="h-3.5 w-3.5" /> Recurring at this location
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#48484A]">
            {atLocation.length} separate reports exist for this physical site.
          </p>
          <ul className="mt-1.5 space-y-1">
            {others.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-[11.5px] tabular-nums">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[issueStatusTone(item.status)].dot}`} />
                <span className="font-semibold text-[#0055CC]">{item.code}</span>
                <span className="truncate text-[#6E6E73]">{formatDate(item.reportedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {project ? (
        <Link
          href={`/public-projects/${project.id}`}
          className="rounded-[14px] border border-black/[0.06] bg-white/85 p-3 transition-colors hover:bg-white"
        >
          <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#6E6E73]">
            <Wrench className="h-3 w-3" /> Related project
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-[#0055CC] tabular-nums">
            {project.code}
          </p>
          <p className="truncate text-[13px] font-semibold text-[#1D1D1F]">{project.name}</p>
        </Link>
      ) : null}

      <div>
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
          <FileText className="h-3.5 w-3.5 text-[#6E6E73]" /> Evidence ({evidence.length})
        </p>
        <div className="mt-2">
          <EvidenceGallery items={evidence} compact />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Link
          href={`/civic-issues/${issue.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.04]"
        >
          Open issue history <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {project ? (
          <Link
            href={`/ai-investigation?project=${project.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0066D6] active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Investigate with AI
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ProjectInspector({
  projectId,
  evidenceMap,
  onClose,
}: {
  projectId: string;
  evidenceMap: Map<string, Evidence>;
  onClose: () => void;
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
    <div className="flex flex-1 flex-col gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#007AFF]/[0.1] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0055CC] tabular-nums">
            {project.code}
          </span>
          <Badge tone={tone} dot>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        </div>
        <CloseInspectorButton onClose={onClose} />
      </div>

      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] leading-snug text-[#1D1D1F]">
          {project.name}
        </h2>
        <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-[#6E6E73]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#007AFF]" />
          <span>
            {project.location}
            {sector ? ` · ${sector.name}` : ""}
          </span>
        </p>
        <p className="mt-1 text-[12px] text-[#6E6E73]">{project.authority}</p>
      </div>

      <div className="rounded-[14px] bg-black/[0.04] p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-medium text-[#6E6E73]">Reported spend</p>
          <p className="text-[13px] font-semibold text-[#0055CC] tabular-nums">{spend}</p>
        </div>
        <div className="mt-1.5">
          <SpendBar
            allocated={project.allocatedBudgetBdt}
            reported={project.reportedExpenditureBdt}
            verified={project.verifiedExpenditureBdt}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] tabular-nums">
          <span className="text-[#48484A]">
            {formatBdtCompact(project.reportedExpenditureBdt)} of{" "}
            {formatBdtCompact(project.allocatedBudgetBdt)}
          </span>
          <span className={project.verifiedExpenditureBdt === undefined ? TONES.warn.label : TONES.ok.label}>
            {project.verifiedExpenditureBdt === undefined
              ? "No verified spend"
              : `${formatBdtCompact(project.verifiedExpenditureBdt)} verified`}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[12px] text-[#6E6E73]">
          <span>Verified physical progress</span>
          <span className="font-semibold text-[#1D1D1F] tabular-nums">
            {project.verifiedProgressPercent}%
          </span>
        </div>
        <ProgressBar
          value={project.verifiedProgressPercent}
          tone={tone}
          className="mt-1.5"
          label={`${project.verifiedProgressPercent} percent verified progress`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[12px] bg-black/[0.04] px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] text-[#6E6E73]">
            <CalendarClock className="h-3 w-3" /> Planned
          </p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[#1D1D1F] tabular-nums">
            {formatDate(project.plannedCompletionDate)}
          </p>
        </div>
        <div className="rounded-[12px] bg-black/[0.04] px-3 py-2">
          <p className="text-[11px] text-[#6E6E73]">Milestones</p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-[#1D1D1F] tabular-nums">
            {metMilestones} met · {missedMilestones} missed
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-[#48484A]">{project.description}</p>

      <div>
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
          <FileText className="h-3.5 w-3.5 text-[#6E6E73]" /> Evidence ({evidence.length})
        </p>
        <div className="mt-2">
          <EvidenceGallery items={evidence} compact />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Link
          href={`/public-projects/${project.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-[#1D1D1F] transition-colors hover:bg-black/[0.04]"
        >
          Open project ledger <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/ai-investigation?project=${project.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0066D6] active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5" /> Investigate with AI
        </Link>
      </div>
    </div>
  );
}
