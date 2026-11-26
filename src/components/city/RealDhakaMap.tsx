"use client";

import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapFeature, MapPosition } from "@/types/citytrace";
import {
  DHAKA_MAX_BOUNDS,
  DHAKA_RECORDS_BOUNDS,
  nearestSectorForLngLat,
  sectorLngLat,
  toLngLat,
} from "@/lib/geo";
import {
  REAL_DHAKA_CAMERA,
  REAL_DHAKA_MARKER_COLORS,
  REAL_DHAKA_STYLE_URL,
  REAL_DHAKA_THEMES,
  applyBaseMapStyling,
  getBuildingsLayerSpec,
  getLocalNeighbourhoodLayerSpec,
  type RealDhakaTheme,
} from "./realDhakaStyle";

export interface RealDhakaMapProps {
  features: MapFeature[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  sectorFocus: string | null;
  resetSignal: number;
  zoomSignal: { delta: number; seq: number } | null;
  autoRotate: boolean;
  pitchMode: "3d" | "flat";
  mapTheme: RealDhakaTheme;
  reportPinMode?: boolean;
  onPickReportLocation?: (picked: {
    sectorId: string;
    coordinates: MapPosition;
    locationLabel: string;
  }) => void;
}

type LayerSpec = Parameters<MapLibreMap["addLayer"]>[0];
type SourceSpec = Parameters<MapLibreMap["addSource"]>[1];
type FilterSpec = Parameters<MapLibreMap["setFilter"]>[1];

const pitchFor = (mode: "3d" | "flat") =>
  mode === "3d" ? REAL_DHAKA_CAMERA.defaultPitch : REAL_DHAKA_CAMERA.flatPitch;

interface FeaturePointProperties {
  id: string;
  kind: MapFeature["kind"];
  state: MapFeature["state"];
  label: string;
  color: string;
  pulse: boolean;
}

interface FeatureCollectionGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: FeaturePointProperties;
  }>;
}

function buildGeoJson(features: MapFeature[]): FeatureCollectionGeoJson {
  return {
    type: "FeatureCollection",
    features: features.map((f) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: toLngLat(f.sectorId, f.coordinates),
      },
      properties: {
        id: f.id,
        kind: f.kind,
        state: f.state,
        label: f.label,
        color: REAL_DHAKA_MARKER_COLORS[f.state],
        pulse: f.kind === "issue" && (f.severity === "critical" || f.severity === "high"),
      },
    })),
  };
}

function buildLabelOpacity(selectedId: string | null) {
  const sel = selectedId ?? "";
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    13.2,
    ["case", ["==", ["get", "id"], sel], 1, 0],
    13.8,
    ["case", ["==", ["get", "id"], sel], 1, 0.25],
    14.6,
    1,
  ];
}

function buildLabelSortKey(selectedId: string | null) {
  return [
    "case",
    ["==", ["get", "id"], selectedId ?? ""],
    0,
    ["get", "pulse"],
    1,
    2,
  ];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function RealDhakaMap({
  features,
  selectedId,
  onSelect,
  sectorFocus,
  resetSignal,
  zoomSignal,
  autoRotate,
  pitchMode,
  mapTheme,
  reportPinMode = false,
  onPickReportLocation,
}: RealDhakaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const latestRef = useRef({
    features,
    pitchMode,
    onSelect,
    selectedId,
    mapTheme,
    reportPinMode,
    onPickReportLocation,
  });
  useEffect(() => {
    latestRef.current = {
      features,
      pitchMode,
      onSelect,
      selectedId,
      mapTheme,
      reportPinMode,
      onPickReportLocation,
    };
  });

  const prevResetRef = useRef(resetSignal);
  const prevZoomSeqRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let loaded = false;

    const map = new MapLibreMap({
      container,
      style: REAL_DHAKA_STYLE_URL,
      bounds: DHAKA_RECORDS_BOUNDS,
      fitBoundsOptions: { padding: REAL_DHAKA_CAMERA.fitPadding },
      pitch: REAL_DHAKA_CAMERA.defaultPitch,
      bearing: REAL_DHAKA_CAMERA.defaultBearing,
      maxBounds: DHAKA_MAX_BOUNDS,
      minZoom: REAL_DHAKA_CAMERA.minZoom,
      maxZoom: REAL_DHAKA_CAMERA.maxZoom,
      maxPitch: REAL_DHAKA_CAMERA.maxPitch,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");

    const ensureCustomLayers = () => {
      const activeTheme = latestRef.current.mapTheme;
      const palette = REAL_DHAKA_THEMES[activeTheme];
      const currentSelected = latestRef.current.selectedId;

      applyBaseMapStyling(map, activeTheme);

      const firstSymbolId = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      if (!map.getLayer("ct-buildings-3d")) {
        map.addLayer(getBuildingsLayerSpec(activeTheme), firstSymbolId);
      }

      if (!map.getLayer("ct-label-local-neighbourhood")) {
        const beforePlace = map.getLayer("label_other") ? "label_other" : undefined;
        map.addLayer(getLocalNeighbourhoodLayerSpec(activeTheme), beforePlace);
      }

      if (!map.getSource("ct-features")) {
        map.addSource("ct-features", {
          type: "geojson",
          promoteId: "id",
          data: buildGeoJson(latestRef.current.features),
        } as unknown as SourceSpec);
      }

      if (!map.getLayer("ct-feature-halo")) {
        map.addLayer({
          id: "ct-feature-halo",
          type: "circle",
          source: "ct-features",
          filter: ["==", ["get", "pulse"], true],
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": 13,
            "circle-opacity": 0.24,
            "circle-blur": 0.45,
            "circle-pitch-alignment": "viewport",
          },
        } as unknown as LayerSpec);
      }

      if (!map.getLayer("ct-feature-selected")) {
        map.addLayer({
          id: "ct-feature-selected",
          type: "circle",
          source: "ct-features",
          filter: ["==", ["get", "id"], currentSelected ?? ""],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 11, 14, 15, 17, 19],
            "circle-color": palette.selectedFill,
            "circle-stroke-color": palette.selectedRing,
            "circle-stroke-width": 2.75,
            "circle-pitch-alignment": "viewport",
          },
        } as unknown as LayerSpec);
      }

      if (!map.getLayer("ct-feature-dot")) {
        map.addLayer({
          id: "ct-feature-dot",
          type: "circle",
          source: "ct-features",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11,
              ["+", 5.5, ["case", ["boolean", ["feature-state", "hover"], false], 2.2, 0]],
              14,
              ["+", 8, ["case", ["boolean", ["feature-state", "hover"], false], 2.2, 0]],
              16.5,
              ["+", 10.5, ["case", ["boolean", ["feature-state", "hover"], false], 2.2, 0]],
            ],
            "circle-radius-transition": { duration: 180 },
            "circle-color": ["get", "color"],
            "circle-stroke-color": palette.dotStroke,
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              3.2,
              2.5,
            ],
            "circle-pitch-alignment": "viewport",
          },
        } as unknown as LayerSpec);
      }

      if (!map.getLayer("ct-feature-label")) {
        map.addLayer({
          id: "ct-feature-label",
          type: "symbol",
          source: "ct-features",
          minzoom: 13.2,
          layout: {
            "text-field": ["get", "label"],
            "text-font": ["Noto Sans Bold"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 13.2, 10.5, 16.5, 12],
            "text-offset": [0, 1.3],
            "text-anchor": "top",
            "text-optional": true,
            "text-padding": 4,
            "symbol-sort-key": buildLabelSortKey(currentSelected),
          },
          paint: {
            "text-color": palette.labelText,
            "text-halo-color": palette.labelHalo,
            "text-halo-width": 1.6,
            "text-opacity": buildLabelOpacity(currentSelected),
          },
        } as unknown as LayerSpec);
      }
    };

    map.on("error", (e) => {
      console.warn("Real Dhaka map error", e?.error);
      if (!loaded) {
        setLoadError(true);
      }
    });

    map.on("style.load", () => {
      loaded = true;
      ensureCustomLayers();
      setReady(true);
    });

    map.on("click", "ct-feature-dot", (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        latestRef.current.onSelect(id);
      }
    });

    map.on("click", (e) => {
      if (!latestRef.current.reportPinMode || !latestRef.current.onPickReportLocation) return;
      const hit = map.queryRenderedFeatures(e.point, { layers: ["ct-feature-dot"] });
      if (hit.length > 0) return;

      const resolved = nearestSectorForLngLat([e.lngLat.lng, e.lngLat.lat]);
      latestRef.current.onPickReportLocation({
        sectorId: resolved.sectorId,
        coordinates: resolved.coordinates,
        locationLabel: `${resolved.neighbourhood} (${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)})`,
      });
    });

    map.on("mousemove", "ct-feature-dot", (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id !== "string") return;

      if (hoveredIdRef.current && hoveredIdRef.current !== id) {
        map.setFeatureState(
          { source: "ct-features", id: hoveredIdRef.current },
          { hover: false }
        );
      }
      hoveredIdRef.current = id;
      map.setFeatureState({ source: "ct-features", id }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "ct-feature-dot", () => {
      if (hoveredIdRef.current) {
        map.setFeatureState(
          { source: "ct-features", id: hoveredIdRef.current },
          { hover: false }
        );
        hoveredIdRef.current = null;
      }
      map.getCanvas().style.cursor = latestRef.current.reportPinMode ? "crosshair" : "";
    });

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      hoveredIdRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getCanvas().style.cursor = reportPinMode ? "crosshair" : "";
  }, [reportPinMode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    applyBaseMapStyling(map, mapTheme);
  }, [mapTheme, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (
      map.getSource("ct-features") as { setData(data: unknown): void } | undefined
    )?.setData(buildGeoJson(features));
  }, [features, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    if (map.getLayer("ct-feature-selected")) {
      map.setFilter(
        "ct-feature-selected",
        ["==", ["get", "id"], selectedId ?? ""] as unknown as FilterSpec
      );
    }
    if (map.getLayer("ct-feature-label")) {
      map.setLayoutProperty("ct-feature-label", "symbol-sort-key", buildLabelSortKey(selectedId));
      map.setPaintProperty("ct-feature-label", "text-opacity", buildLabelOpacity(selectedId));
    }

    if (!selectedId) return;
    const feature = latestRef.current.features.find((f) => f.id === selectedId);
    if (!feature) return;

    const reduced = prefersReducedMotion();
    const hasDesktopInspector = window.matchMedia("(min-width: 1024px)").matches;
    map.flyTo({
      center: toLngLat(feature.sectorId, feature.coordinates),
      zoom: Math.max(map.getZoom(), REAL_DHAKA_CAMERA.selectedZoom),
      pitch: pitchFor(latestRef.current.pitchMode),
      bearing: REAL_DHAKA_CAMERA.defaultBearing,
      offset: [hasDesktopInspector ? -172 : 0, 0],
      duration: reduced ? 0 : 1200,
    });
  }, [selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !sectorFocus) return;
    const anchor = sectorLngLat(sectorFocus);
    if (!anchor) return;

    const reduced = prefersReducedMotion();
    map.flyTo({
      center: anchor,
      zoom: REAL_DHAKA_CAMERA.sectorZoom,
      pitch: pitchFor(latestRef.current.pitchMode),
      bearing: REAL_DHAKA_CAMERA.defaultBearing,
      duration: reduced ? 0 : 1000,
    });
  }, [sectorFocus, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (prevResetRef.current === resetSignal) return;
    prevResetRef.current = resetSignal;

    const reduced = prefersReducedMotion();
    map.fitBounds(DHAKA_RECORDS_BOUNDS, {
      padding: REAL_DHAKA_CAMERA.fitPadding,
      pitch: pitchFor(latestRef.current.pitchMode),
      bearing: REAL_DHAKA_CAMERA.defaultBearing,
      duration: reduced ? 0 : 1000,
    });
  }, [resetSignal, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !zoomSignal) return;
    if (prevZoomSeqRef.current === zoomSignal.seq) return;
    prevZoomSeqRef.current = zoomSignal.seq;

    const reduced = prefersReducedMotion();
    map.easeTo({
      zoom: map.getZoom() + (zoomSignal.delta < 0 ? 1 : -1),
      duration: reduced ? 0 : 300,
    });
  }, [zoomSignal, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const reduced = prefersReducedMotion();
    map.easeTo({
      pitch: pitchFor(pitchMode),
      duration: reduced ? 0 : 600,
    });
  }, [pitchMode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !autoRotate || prefersReducedMotion()) return;

    let rafId = 0;
    const tick = () => {
      map.setBearing((map.getBearing() + 0.05) % 360);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [autoRotate, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || prefersReducedMotion()) return;

    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = ((now - start) % 1600) / 1600;
      if (map.getLayer("ct-feature-halo")) {
        map.setPaintProperty("ct-feature-halo", "circle-radius", 9 + 12 * p);
        map.setPaintProperty("ct-feature-halo", "circle-opacity", 0.3 * (1 - p));
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [ready]);

  return (
    <div className="ct-real-map absolute inset-0" data-map-theme={mapTheme}>
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Real-world 3D map of Dhaka"
      />
      {!ready && !loadError ? (
        <div className="ct-skeleton pointer-events-none absolute inset-0" aria-hidden="true" />
      ) : null}
      {loadError ? (
        <div className="absolute inset-0 z-10 grid place-items-center p-6">
          <div className="ct-glass max-w-sm rounded-[20px] p-5 text-center">
            <p className="text-[14px] font-semibold text-[#1D1D1F]">
              Real-world map unavailable
            </p>
            <p className="mt-1 text-[12.5px] text-[#6E6E73]">
              Map tiles could not be loaded — check your connection, or switch back to the Digital
              Twin view.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
