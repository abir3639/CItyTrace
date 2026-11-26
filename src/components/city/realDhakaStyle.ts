import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapFeatureState } from "@/types/citytrace";

export type RealDhakaTheme = "daylight" | "dark";

export const REAL_DHAKA_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";

export const REAL_DHAKA_CAMERA = {
  defaultPitch: 55,
  flatPitch: 0,
  defaultBearing: -20,
  sectorZoom: 15.5,
  selectedZoom: 16.5,
  minZoom: 11,
  maxZoom: 18.5,
  maxPitch: 70,
  fitPadding: 52,
} as const;

export const REAL_DHAKA_MARKER_COLORS: Record<MapFeatureState, string> = {
  unresolved: "#FF453A",
  delayed: "#FF9F0A",
  active: "#22C55E",
  completed: "#22C55E",
};

type LayerSpec = Parameters<MapLibreMap["addLayer"]>[0];
type FilterSpec = Parameters<MapLibreMap["setFilter"]>[1];
type LightSpec = Parameters<MapLibreMap["setLight"]>[0];
type SkySpec = Parameters<MapLibreMap["setSky"]>[0];

export interface RealDhakaPalette {
  urbanLand: string;
  residential: string;
  commercial: string;
  industrial: string;
  institutional: string;
  aeroway: string;
  water: string;
  waterwayMajor: string;
  parks: string;
  grass: string;
  forest: string;
  motorway: string;
  primaryRoad: string;
  secondaryRoad: string;
  localRoad: string;
  roadOutline: string;
  path: string;
  rail: string;
  boundary: string;
  textPrimary: string;
  textSecondary: string;
  textHalo: string;
  waterText: string;
  buildingStops: ReadonlyArray<readonly [number, string]>;
  light: NonNullable<LightSpec>;
  sky: NonNullable<SkySpec>;
  selectedRing: string;
  selectedFill: string;
  dotStroke: string;
  labelText: string;
  labelHalo: string;
}

export const REAL_DHAKA_THEMES: Record<RealDhakaTheme, RealDhakaPalette> = {
  daylight: {
    urbanLand: "#F0EEE8",
    residential: "#E9E5DD",
    commercial: "#E5DED3",
    industrial: "#DDDDE3",
    institutional: "#EAE4DC",
    aeroway: "#E5E3DD",
    water: "#8CC5E2",
    waterwayMajor: "#7BB8D8",
    parks: "#A5C69A",
    grass: "#C6D9B4",
    forest: "#83AF83",
    motorway: "#DFB262",
    primaryRoad: "#E4BD76",
    secondaryRoad: "#F2DEAE",
    localRoad: "#FFFDF5",
    roadOutline: "#D4CEC2",
    path: "#D8D1C4",
    rail: "#C2BCB0",
    boundary: "rgba(100, 116, 139, 0.24)",
    textPrimary: "#344054",
    textSecondary: "#667085",
    textHalo: "rgba(255, 255, 255, 0.92)",
    waterText: "#3C6E8F",
    buildingStops: [
      [0, "#DDD5C6"],
      [8, "#DDD5C6"],
      [15, "#D0C3AE"],
      [30, "#BFB3A2"],
      [60, "#A8B9CA"],
      [85, "#8FA4B8"],
    ],
    light: {
      anchor: "viewport",
      color: "#FFF6EA",
      intensity: 0.42,
      position: [1.35, 200, 48],
    },
    sky: {
      "sky-color": "#CFE2F5",
      "horizon-color": "#F3F0EA",
      "sky-horizon-blend": 0.65,
    },
    selectedRing: "#007AFF",
    selectedFill: "rgba(0, 122, 255, 0.16)",
    dotStroke: "#FFFFFF",
    labelText: "#1D1D1F",
    labelHalo: "rgba(255, 255, 255, 0.96)",
  },
  dark: {
    urbanLand: "#101827",
    residential: "#152033",
    commercial: "#19253A",
    industrial: "#162030",
    institutional: "#182336",
    aeroway: "#141D2E",
    water: "#142F49",
    waterwayMajor: "#1A3D5E",
    parks: "#234638",
    grass: "#284F3F",
    forest: "#1D3B2F",
    motorway: "#968058",
    primaryRoad: "#82704E",
    secondaryRoad: "#5A5243",
    localRoad: "#283548",
    roadOutline: "#0C1320",
    path: "#222E40",
    rail: "#334155",
    boundary: "rgba(148, 163, 184, 0.25)",
    textPrimary: "#D8E2F0",
    textSecondary: "#AAB8CC",
    textHalo: "rgba(16, 24, 39, 0.92)",
    waterText: "#7BB3D6",
    buildingStops: [
      [0, "#29384D"],
      [8, "#29384D"],
      [15, "#30415A"],
      [30, "#384C67"],
      [60, "#435873"],
      [85, "#4E6684"],
    ],
    light: {
      anchor: "viewport",
      color: "#B8D0F0",
      intensity: 0.38,
      position: [1.35, 210, 45],
    },
    sky: {
      "sky-color": "#0A111F",
      "horizon-color": "#1A273B",
      "sky-horizon-blend": 0.65,
    },
    selectedRing: "#38BDF8",
    selectedFill: "rgba(56, 189, 248, 0.2)",
    dotStroke: "#0F172A",
    labelText: "#F8FAFC",
    labelHalo: "rgba(15, 23, 42, 0.94)",
  },
};

export function buildBuildingColorExpression(theme: RealDhakaTheme) {
  const stops = REAL_DHAKA_THEMES[theme].buildingStops;
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["to-number", ["get", "render_height"], 6], 6],
    ...stops.flat(),
  ];
}

export function getBuildingsLayerSpec(theme: RealDhakaTheme): LayerSpec {
  return {
    id: "ct-buildings-3d",
    type: "fill-extrusion",
    source: "openmaptiles",
    "source-layer": "building",
    minzoom: 13.5,
    filter: ["!=", ["get", "hide_3d"], true],
    paint: {
      "fill-extrusion-color": buildBuildingColorExpression(theme),
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13.5,
        0,
        15,
        ["coalesce", ["to-number", ["get", "render_height"], 6], 6],
      ],
      "fill-extrusion-base": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13.5,
        0,
        15,
        ["coalesce", ["to-number", ["get", "render_min_height"], 0], 0],
      ],
      "fill-extrusion-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        13.5,
        0,
        14.2,
        0.92,
        15,
        0.96,
      ],
      "fill-extrusion-vertical-gradient": true,
    },
  } as unknown as LayerSpec;
}

const BILINGUAL_PLACE_LABEL = [
  "case",
  ["has", "name:nonlatin"],
  ["concat", ["get", "name:latin"], "\n", ["get", "name:nonlatin"]],
  ["coalesce", ["get", "name:en"], ["get", "name"]],
];

export function getLocalNeighbourhoodLayerSpec(theme: RealDhakaTheme): LayerSpec {
  const t = REAL_DHAKA_THEMES[theme];
  return {
    id: "ct-label-local-neighbourhood",
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "place",
    minzoom: 13.8,
    filter: ["match", ["get", "class"], ["quarter", "neighbourhood"], true, false],
    layout: {
      "text-field": BILINGUAL_PLACE_LABEL,
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 13.8, 10.5, 16, 12],
      "text-max-width": 8.5,
      "text-padding": 4,
    },
    paint: {
      "text-color": t.textSecondary,
      "text-halo-color": t.textHalo,
      "text-halo-width": 1.4,
      "text-halo-blur": 0.4,
    },
  } as unknown as LayerSpec;
}

function setPaint(map: MapLibreMap, id: string, prop: string, val: unknown) {
  if (map.getLayer(id)) {
    map.setPaintProperty(id, prop, val);
  }
}

function setLayout(map: MapLibreMap, id: string, prop: string, val: unknown) {
  if (map.getLayer(id)) {
    map.setLayoutProperty(id, prop, val);
  }
}

export function applyBaseMapStyling(map: MapLibreMap, theme: RealDhakaTheme) {
  const t = REAL_DHAKA_THEMES[theme];

  try {
    map.setLight(t.light);
    map.setSky(t.sky);
  } catch (err) {
    console.warn("MapLibre light/sky configuration warning:", err);
  }

  // Hide flat 2D building layers and any existing duplicate 3D extrusion layers.
  setLayout(map, "building", "visibility", "none");
  setLayout(map, "building-top", "visibility", "none");
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.id !== "ct-buildings-3d" && layer.type === "fill-extrusion") {
      setLayout(map, layer.id, "visibility", "none");
    }
  }

  // Base terrain & landuse
  setPaint(map, "background", "background-color", t.urbanLand);
  setPaint(map, "landuse-residential", "fill-color", t.residential);
  setPaint(map, "landuse-suburb", "fill-color", t.residential);
  setPaint(map, "landuse-commercial", "fill-color", t.commercial);
  setPaint(map, "landuse-industrial", "fill-color", t.industrial);
  setPaint(map, "landuse-railway", "fill-color", t.industrial);
  setPaint(map, "landuse-hospital", "fill-color", t.institutional);
  setPaint(map, "landuse-school", "fill-color", t.institutional);
  setPaint(map, "landuse-cemetery", "fill-color", t.parks);

  // Vegetation & parks
  setPaint(map, "park", "fill-color", t.parks);
  setPaint(map, "park", "fill-opacity", 0.72);
  setPaint(map, "landcover-grass-park", "fill-color", t.parks);
  setPaint(map, "landcover-grass-park", "fill-opacity", 0.72);
  setPaint(map, "landcover-grass", "fill-color", t.grass);
  setPaint(map, "landcover-grass", "fill-opacity", 0.78);
  setPaint(map, "landcover-wood", "fill-color", t.forest);
  setPaint(map, "landcover-wood", "fill-opacity", 0.85);
  setPaint(map, "landcover-wood", "fill-outline-color", t.forest);
  setPaint(map, "landcover-sand", "fill-color", t.commercial);

  // Water & waterways
  setPaint(map, "water", "fill-color", t.water);
  setPaint(map, "water-intermittent", "fill-color", t.water);
  for (const id of [
    "waterway-river",
    "waterway-river-intermittent",
    "waterway-stream-canal",
    "waterway-stream-canal-intermittent",
    "waterway-other",
    "waterway-other-intermittent",
    "waterway_tunnel",
  ]) {
    setPaint(map, id, "line-color", t.waterwayMajor);
  }

  // Aeroway
  setPaint(map, "aeroway-area", "fill-color", t.aeroway);
  setPaint(map, "aeroway-taxiway", "line-color", t.localRoad);
  setPaint(map, "aeroway-runway", "line-color", t.localRoad);
  setPaint(map, "aeroway-taxiway-casing", "line-color", t.roadOutline);
  setPaint(map, "aeroway-runway-casing", "line-color", t.roadOutline);

  // Roads — Motorways, Primary/Trunk, Secondary/Tertiary, Local & Paths
  for (const id of [
    "highway-motorway",
    "highway-motorway-link",
    "bridge-motorway",
    "bridge-motorway-link",
    "tunnel-motorway",
    "tunnel-motorway-link",
  ]) {
    setPaint(map, id, "line-color", t.motorway);
  }

  for (const id of [
    "highway-trunk",
    "highway-primary",
    "bridge-trunk-primary",
    "tunnel-trunk-primary",
  ]) {
    setPaint(map, id, "line-color", t.primaryRoad);
  }

  for (const id of [
    "highway-secondary-tertiary",
    "highway-link",
    "bridge-secondary-tertiary",
    "bridge-link",
    "tunnel-secondary-tertiary",
    "tunnel-link",
  ]) {
    setPaint(map, id, "line-color", t.secondaryRoad);
  }

  for (const id of [
    "highway-minor",
    "bridge-minor",
    "tunnel-minor",
    "tunnel-service-track",
  ]) {
    setPaint(map, id, "line-color", t.localRoad);
  }
  setPaint(map, "highway-area", "fill-color", t.localRoad);
  setPaint(map, "highway-area", "fill-outline-color", t.roadOutline);

  for (const id of ["highway-path", "bridge-path", "tunnel-path"]) {
    setPaint(map, id, "line-color", t.path);
  }

  for (const id of [
    "highway-motorway-casing",
    "highway-trunk-casing",
    "highway-primary-casing",
    "highway-secondary-tertiary-casing",
    "highway-minor-casing",
    "highway-link-casing",
    "highway-motorway-link-casing",
    "bridge-motorway-casing",
    "bridge-trunk-primary-casing",
    "bridge-secondary-tertiary-casing",
    "bridge-minor-casing",
    "bridge-link-casing",
    "bridge-motorway-link-casing",
    "bridge-path-casing",
    "tunnel-motorway-casing",
    "tunnel-trunk-primary-casing",
    "tunnel-secondary-tertiary-casing",
    "tunnel-minor-casing",
    "tunnel-link-casing",
    "tunnel-motorway-link-casing",
    "tunnel-service-track-casing",
  ]) {
    setPaint(map, id, "line-color", t.roadOutline);
  }

  for (const id of [
    "railway",
    "railway-transit",
    "railway-service",
    "bridge-railway",
    "tunnel-railway",
    "railway-hatching",
    "railway-transit-hatching",
    "railway-service-hatching",
    "bridge-railway-hatching",
  ]) {
    setPaint(map, id, "line-color", t.rail);
  }

  for (const id of ["road_oneway", "road_oneway_opposite"]) {
    if (map.getLayer(id)) {
      map.setLayerZoomRange(id, 16.5, 24);
    }
  }

  for (const id of ["boundary_2", "boundary_3", "boundary_disputed"]) {
    setPaint(map, id, "line-color", t.boundary);
  }

  // Label hierarchy & clutter reduction
  for (const id of ["label_city_capital", "label_city"]) {
    if (map.getLayer(id)) {
      map.setLayerZoomRange(id, 3, 15.2);
      setLayout(map, id, "icon-image", "");
      setLayout(map, id, "text-anchor", "center");
      setLayout(map, id, "text-size", ["interpolate", ["linear"], ["zoom"], 10, 13, 12.5, 14.5, 14.5, 13]);
      setPaint(map, id, "text-color", t.textPrimary);
      setPaint(map, id, "text-halo-color", t.textHalo);
      setPaint(map, id, "text-halo-width", 1.7);
      setPaint(map, id, "text-opacity", ["interpolate", ["linear"], ["zoom"], 13.8, 1, 15.1, 0]);
    }
  }

  if (map.getLayer("label_other")) {
    map.setFilter("label_other", ["==", ["get", "class"], "suburb"] as unknown as FilterSpec);
    map.setLayerZoomRange("label_other", 11.5, 24);
    setLayout(map, "label_other", "text-font", ["Noto Sans Bold"]);
    setLayout(map, "label_other", "text-transform", "none");
    setLayout(map, "label_other", "text-letter-spacing", 0.02);
    setLayout(map, "label_other", "text-size", [
      "interpolate",
      ["linear"],
      ["zoom"],
      11.5,
      11,
      14,
      13,
      16,
      13.5,
    ]);
    setPaint(map, "label_other", "text-color", t.textPrimary);
    setPaint(map, "label_other", "text-halo-color", t.textHalo);
    setPaint(map, "label_other", "text-halo-width", 1.6);
  }

  setPaint(map, "ct-label-local-neighbourhood", "text-color", t.textSecondary);
  setPaint(map, "ct-label-local-neighbourhood", "text-halo-color", t.textHalo);

  for (const id of ["label_town", "label_state", "label_country_1", "label_country_2", "label_country_3", "airport"]) {
    setPaint(map, id, "text-color", t.textPrimary);
    setPaint(map, id, "text-halo-color", t.textHalo);
  }
  setPaint(map, "label_village", "text-color", t.textSecondary);
  setPaint(map, "label_village", "text-halo-color", t.textHalo);

  for (const id of ["water_name_point_label", "water_name_line_label", "waterway_line_label"]) {
    setPaint(map, id, "text-color", t.waterText);
    setPaint(map, id, "text-halo-color", t.textHalo);
  }

  if (map.getLayer("highway-name-major")) {
    map.setLayerZoomRange("highway-name-major", 13.2, 24);
    setLayout(map, "highway-name-major", "text-size", [
      "interpolate",
      ["linear"],
      ["zoom"],
      13.2,
      11,
      16,
      12.5,
    ]);
    setPaint(map, "highway-name-major", "text-color", t.textPrimary);
    setPaint(map, "highway-name-major", "text-halo-color", t.textHalo);
    setPaint(map, "highway-name-major", "text-halo-width", 1.5);
  }

  if (map.getLayer("highway-name-minor")) {
    map.setLayerZoomRange("highway-name-minor", 15.5, 24);
    setLayout(map, "highway-name-minor", "text-size", [
      "interpolate",
      ["linear"],
      ["zoom"],
      15.5,
      10.5,
      17.5,
      11.5,
    ]);
    setPaint(map, "highway-name-minor", "text-color", t.textSecondary);
    setPaint(map, "highway-name-minor", "text-halo-color", t.textHalo);
  }

  if (map.getLayer("highway-name-path")) {
    map.setLayerZoomRange("highway-name-path", 16.8, 24);
    setPaint(map, "highway-name-path", "text-color", t.textSecondary);
    setPaint(map, "highway-name-path", "text-halo-color", t.textHalo);
  }

  setLayout(map, "highway-shield-us-interstate", "visibility", "none");
  setLayout(map, "road_shield_us", "visibility", "none");
  if (map.getLayer("highway-shield-non-us")) {
    map.setLayerZoomRange("highway-shield-non-us", 13.8, 24);
  }

  const poiZooms: Array<[string, number]> = [
    ["poi_transit", 15.6],
    ["poi_r1", 16.2],
    ["poi_r7", 17.0],
    ["poi_r20", 17.8],
  ];
  for (const [id, minzoom] of poiZooms) {
    if (map.getLayer(id)) {
      map.setLayerZoomRange(id, minzoom, 24);
      setPaint(map, id, "text-color", t.textSecondary);
      setPaint(map, id, "text-halo-color", t.textHalo);
      setPaint(map, id, "icon-opacity", theme === "dark" ? 0.78 : 0.85);
    }
  }

  // Update CityTrace custom layers if already mounted
  setPaint(map, "ct-buildings-3d", "fill-extrusion-color", buildBuildingColorExpression(theme));
  setPaint(map, "ct-feature-dot", "circle-stroke-color", t.dotStroke);
  setPaint(map, "ct-feature-selected", "circle-color", t.selectedFill);
  setPaint(map, "ct-feature-selected", "circle-stroke-color", t.selectedRing);
  setPaint(map, "ct-feature-label", "text-color", t.labelText);
  setPaint(map, "ct-feature-label", "text-halo-color", t.labelHalo);
}
