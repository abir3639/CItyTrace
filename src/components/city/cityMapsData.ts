import { ISSUES } from "@/data/issues";
import { PROJECTS } from "@/data/projects";
import type { MapPosition } from "@/types/citytrace";

export type CityMapId =
  | "metro-twin"
  | "arterial-engineering"
  | "hydrology-basin"
  | "smart-corridor";

export type CityRenderMode = "twin" | "heatmap" | "xray";

export interface CityMapConfig {
  id: CityMapId;
  code: string;
  title: string;
  subtitle: string;
  /** Sectors highlighted on this map. Empty means all six sectors. */
  sectors: string[];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  groundSize: number;
  highlightNote: string;
}

export const CITY_MAPS: CityMapConfig[] = [
  {
    id: "metro-twin",
    code: "MAP 01",
    title: "Dhaka Metro Twin",
    subtitle: "All 6 sectors · full 42×42 urban grid",
    sectors: [],
    cameraPos: [16.5, 13.5, 18.0],
    cameraTarget: [0, 0.4, 0],
    groundSize: 42,
    highlightNote: "Full district twin with elevated Metro viaduct, canal, parks & 96 buildings.",
  },
  {
    id: "arterial-engineering",
    code: "MAP 02",
    title: "Arterial & Sub-base Cutaway",
    subtitle: "S04 & S06 · Link Road & Civic Core",
    sectors: ["S04", "S06"],
    cameraPos: [7.8, 7.6, 9.2],
    cameraTarget: [-0.2, 0.35, 0.8],
    groundSize: 42,
    highlightNote: "Sub-base failure zones, utility clashes & 3× resurfaced arterial corridor.",
  },
  {
    id: "hydrology-basin",
    code: "MAP 03",
    title: "Monsoon Canal & Floodplain",
    subtitle: "S02 & S09 · Canal West & South Market",
    sectors: ["S02", "S09"],
    cameraPos: [-1.2, 9.0, 4.5],
    cameraTarget: [-3.5, 0.3, -4.4],
    groundSize: 42,
    highlightNote: "Western storm canal, box-culvert outfall, pump bay & monsoon waterlogging basins.",
  },
  {
    id: "smart-corridor",
    code: "MAP 04",
    title: "Smart Grid & Civic Campus",
    subtitle: "S11 & S07 · East Blvd & North Gate",
    sectors: ["S11", "S07"],
    cameraPos: [10.8, 8.8, 8.6],
    cameraTarget: [2.4, 0.35, 1.2],
    groundSize: 42,
    highlightNote: "48 underground LED luminaires, school safety zone & North Gate market transfer.",
  },
];

export type BuildingArchetype =
  | "highrise-stepped"
  | "dhaka-apartment"
  | "commercial-plaza"
  | "market-hall"
  | "civic-tower";

export type RoofFeature = "water-tank" | "spire" | "solar" | "helipad" | "dome";

export interface BuildingSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  sectorId: string;
  archetype: BuildingArchetype;
  tone: "primary" | "secondary" | "civic" | "landmark";
  edgeGlow: boolean;
  roofFeature?: RoofFeature;
  landmarkId?: string;
}

export interface CivicLandmark {
  id: string;
  code: string;
  name: string;
  kind: string;
  sectorId: string;
  floors: number;
  summary: string;
  coordinates: MapPosition;
  relatedProjectIds: string[];
  relatedIssueIds: string[];
}

export const CIVIC_LANDMARKS: CivicLandmark[] = [
  {
    id: "LMD-MRT",
    code: "LMK-01",
    name: "Sector 04 Metro Rail Station & Concourse",
    kind: "Elevated Transit Hub",
    sectorId: "S04",
    floors: 3,
    summary:
      "Elevated metro station straddling the arterial corridor. Commuter egress feeds directly onto Begum Rokeya Sarani Link Road, amplifying peak-hour axle loads across the failed junction.",
    coordinates: [-2.9, 3.4],
    relatedProjectIds: ["P-R01"],
    relatedIssueIds: ["ISS-001", "ISS-002", "ISS-003"],
  },
  {
    id: "LMD-SEC",
    code: "LMK-02",
    name: "Ward 12 Municipal Secretariat Tower",
    kind: "Civic Administration Complex",
    sectorId: "S06",
    floors: 9,
    summary:
      "District engineering & procurement office overseeing intersection signalization and arterial contracts. Adjoins the stalled Civic Core junction reconstruction footprint.",
    coordinates: [1.1, -2.5],
    relatedProjectIds: ["P-R10"],
    relatedIssueIds: ["ISS-008", "ISS-009", "ISS-018"],
  },
  {
    id: "LMD-MOS",
    code: "LMK-03",
    name: "Sector 04 Central Jame Mosque & Courtyard",
    kind: "Community & Religious Landmark",
    sectorId: "S04",
    floors: 3,
    summary:
      "Major Friday congregation hub along the western link-road approach. Worshippers face knee-deep standing water during monsoon surges due to missing catch-pit drains.",
    coordinates: [-4.4, 3.2],
    relatedProjectIds: ["P-R01"],
    relatedIssueIds: ["ISS-003"],
  },
  {
    id: "LMD-MKT",
    code: "LMK-04",
    name: "North Gate Wholesale Market & Compactor Hall",
    kind: "Municipal Market & Transfer Depot",
    sectorId: "S07",
    floors: 2,
    summary:
      "High-volume wholesale produce depot paired with the under-construction covered waste compactor bay and leachate collection apron.",
    coordinates: [-4.6, 7.2],
    relatedProjectIds: ["P-W05", "P-L09"],
    relatedIssueIds: ["ISS-006", "ISS-007", "ISS-016"],
  },
  {
    id: "LMD-SCH",
    code: "LMK-05",
    name: "Civic Boulevard Model School Campus",
    kind: "Public Education Campus",
    sectorId: "S11",
    floors: 4,
    summary:
      "Benchmark public school corridor served by completed underground smart LED lighting (CT-DH-L03) and the segregated pedestrian safety walkway (CT-DH-S11).",
    coordinates: [8.4, -2.4],
    relatedProjectIds: ["P-L03", "P-S11"],
    relatedIssueIds: ["ISS-010", "ISS-011"],
  },
  {
    id: "LMD-CLN",
    code: "LMK-06",
    name: "East Boulevard Community Health Clinic",
    kind: "Primary Healthcare Facility",
    sectorId: "S11",
    floors: 3,
    summary:
      "Ward 21 primary care clinic. Ambulance and patient access is periodically impeded by localized storm ponding outside the main entrance.",
    coordinates: [8.4, -6.5],
    relatedProjectIds: ["P-L03"],
    relatedIssueIds: ["ISS-021"],
  },
  {
    id: "LMD-PMP",
    code: "LMK-07",
    name: "Canal West Stormwater Pump Station",
    kind: "Hydrological Pumping Facility",
    sectorId: "S02",
    floors: 2,
    summary:
      "Primary storm relief pump house along the western canal embankment. Commissioning remains incomplete alongside the delayed box-culvert expansion.",
    coordinates: [-8.9, -5.2],
    relatedProjectIds: ["P-D02", "P-WTR06"],
    relatedIssueIds: ["ISS-004", "ISS-005", "ISS-012"],
  },
  {
    id: "LMD-BUS",
    code: "LMK-08",
    name: "South Market Bus Terminal & Footbridge",
    kind: "Interchange & Mobility Hub",
    sectorId: "S09",
    floors: 2,
    summary:
      "Major bus interchange terminal featuring completed countdown pedestrian signals (CT-DH-S07) alongside active secondary storm-drain desilting.",
    coordinates: [3.9, -6.8],
    relatedProjectIds: ["P-R07", "P-D08"],
    relatedIssueIds: ["ISS-014", "ISS-015"],
  },
];

const LANDMARK_BUILDINGS: BuildingSpec[] = [
  {
    id: "lm-b-mrt",
    x: -2.9,
    z: 3.4,
    w: 1.5,
    h: 2.3,
    d: 2.1,
    sectorId: "S04",
    archetype: "civic-tower",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "solar",
    landmarkId: "LMD-MRT",
  },
  {
    id: "lm-b-sec",
    x: 1.1,
    z: -2.5,
    w: 1.9,
    h: 4.3,
    d: 1.7,
    sectorId: "S06",
    archetype: "civic-tower",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "helipad",
    landmarkId: "LMD-SEC",
  },
  {
    id: "lm-b-mos",
    x: -4.4,
    z: 3.2,
    w: 1.6,
    h: 1.9,
    d: 1.6,
    sectorId: "S04",
    archetype: "commercial-plaza",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "dome",
    landmarkId: "LMD-MOS",
  },
  {
    id: "lm-b-mkt",
    x: -4.6,
    z: 7.2,
    w: 2.2,
    h: 1.45,
    d: 1.8,
    sectorId: "S07",
    archetype: "market-hall",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "solar",
    landmarkId: "LMD-MKT",
  },
  {
    id: "lm-b-sch",
    x: 8.4,
    z: -2.4,
    w: 2.0,
    h: 2.2,
    d: 1.8,
    sectorId: "S11",
    archetype: "commercial-plaza",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "solar",
    landmarkId: "LMD-SCH",
  },
  {
    id: "lm-b-cln",
    x: 8.4,
    z: -6.5,
    w: 1.6,
    h: 1.85,
    d: 1.5,
    sectorId: "S11",
    archetype: "commercial-plaza",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "water-tank",
    landmarkId: "LMD-CLN",
  },
  {
    id: "lm-b-pmp",
    x: -8.9,
    z: -5.2,
    w: 1.7,
    h: 1.55,
    d: 1.7,
    sectorId: "S02",
    archetype: "market-hall",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "spire",
    landmarkId: "LMD-PMP",
  },
  {
    id: "lm-b-bus",
    x: 3.9,
    z: -6.8,
    w: 2.1,
    h: 1.5,
    d: 1.6,
    sectorId: "S09",
    archetype: "market-hall",
    tone: "landmark",
    edgeGlow: true,
    roofFeature: "solar",
    landmarkId: "LMD-BUS",
  },
];

/* ------------------------------------------------------------------ */
/* Collision-safe procedural Dhaka urban infill                        */
/* ------------------------------------------------------------------ */

const MARKER_POINTS: MapPosition[] = [
  ...PROJECTS.map((project) => project.coordinates),
  ...ISSUES.map((issue) => issue.coordinates),
];

function overlapsRoadOrCanal(x: number, z: number, halfW: number, halfD: number): boolean {
  const minX = x - halfW;
  const maxX = x + halfW;
  const minZ = z - halfD;
  const maxZ = z + halfD;

  // East-West avenues & ring roads
  const ewBands: [number, number][] = [
    [0.15, 2.25],   // Main E-W Avenue (z=1.2)
    [4.45, 5.95],   // North Gate Avenue (z=5.2)
    [-5.85, -4.25], // South Market Avenue (z=-5.0)
    [8.85, 10.15],  // North Ring Road (z=9.5)
    [-10.15, -8.85], // South Ring Road (z=-9.5)
  ];
  for (const [z0, z1] of ewBands) {
    if (maxZ > z0 && minZ < z1) return true;
  }

  // North-South arterials & western storm canal
  const nsBands: [number, number][] = [
    [-2.55, -0.45],  // N-S Arterial (x=-1.5)
    [4.55, 6.25],    // East Civic Boulevard (x=5.4)
    [-7.35, -5.05],  // Western Storm Canal (x=-6.2)
    [-11.35, -9.85], // Canal West Outer Road (x=-10.6)
    [9.85, 11.35],   // East Outer Road (x=10.6)
  ];
  for (const [x0, x1] of nsBands) {
    if (maxX > x0 && minX < x1) return true;
  }

  return false;
}

function overlapsMarkerOrLandmark(
  x: number,
  z: number,
  halfW: number,
  halfD: number,
  placed: BuildingSpec[]
): boolean {
  for (const [mx, mz] of MARKER_POINTS) {
    if (Math.abs(x - mx) < halfW + 0.72 && Math.abs(z - mz) < halfD + 0.72) {
      return true;
    }
  }
  for (const existing of placed) {
    if (
      Math.abs(x - existing.x) < halfW + existing.w / 2 + 0.32 &&
      Math.abs(z - existing.z) < halfD + existing.d / 2 + 0.32
    ) {
      return true;
    }
  }
  return false;
}

function sectorForCoord(x: number, z: number): string {
  if (x < -5.8) return "S02";
  if (x > 4.9) return "S11";
  if (z > 3.2) return "S07";
  if (z < -3.2) return "S09";
  if (x >= -0.6) return "S06";
  return "S04";
}

function hashSeed(ix: number, iz: number): number {
  let h = (ix * 73856093) ^ (iz * 19349663) ^ 0x9e3779b9;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  return Math.abs((h >> 16) ^ h);
}

function buildDistrictBuildings(): BuildingSpec[] {
  const placed: BuildingSpec[] = [...LANDMARK_BUILDINGS];

  // Candidate urban parcel grid across the 42x42 district
  const xCoords = [
    -15.4, -13.6, -12.1, -9.0, -7.8, -4.3, -3.1, 0.4, 2.0, 3.6, 7.1, 8.7, 12.2, 13.8, 15.5,
  ];
  const zCoords = [
    -13.2, -11.4, -7.8, -6.4, -3.3, -1.6, -0.3, 3.0, 3.8, 6.7, 7.9, 11.2, 13.0,
  ];

  const archetypes: BuildingArchetype[] = [
    "dhaka-apartment",
    "highrise-stepped",
    "commercial-plaza",
    "dhaka-apartment",
    "civic-tower",
  ];
  const roofPool: (RoofFeature | undefined)[] = [
    "water-tank",
    "water-tank",
    "solar",
    "spire",
    undefined,
  ];

  let idx = 1;
  for (let xi = 0; xi < xCoords.length; xi += 1) {
    for (let zi = 0; zi < zCoords.length; zi += 1) {
      const h = hashSeed(xi + 11, zi + 29);
      const x = xCoords[xi] + ((h % 7) - 3) * 0.08;
      const z = zCoords[zi] + (((h >> 3) % 7) - 3) * 0.08;
      const w = 1.05 + ((h >> 5) % 5) * 0.14;
      const d = 1.0 + ((h >> 8) % 5) * 0.14;

      if (overlapsRoadOrCanal(x, z, w / 2 + 0.14, d / 2 + 0.14)) continue;
      if (overlapsMarkerOrLandmark(x, z, w / 2, d / 2, placed)) continue;

      const sectorId = sectorForCoord(x, z);
      const isCore = Math.abs(x) < 6 && Math.abs(z) < 6;
      const baseHeight = isCore ? 1.85 : 1.15;
      const height = Number((baseHeight + ((h >> 11) % 24) * 0.12).toFixed(2));
      const archetype =
        height > 3.1
          ? "highrise-stepped"
          : archetypes[(h >> 14) % archetypes.length];
      const tone =
        sectorId === "S06" && height > 2.8
          ? "civic"
          : height > 2.2
            ? "primary"
            : "secondary";

      placed.push({
        id: `b-${idx}`,
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        w: Number(w.toFixed(2)),
        h: height,
        d: Number(d.toFixed(2)),
        sectorId,
        archetype,
        tone,
        edgeGlow: h % 3 === 0 || height > 2.9,
        roofFeature: roofPool[(h >> 17) % roofPool.length],
      });
      idx += 1;
    }
  }

  return placed;
}

export const DHAKA_BUILDINGS: BuildingSpec[] = buildDistrictBuildings();

/* ------------------------------------------------------------------ */
/* Urban greenery, subsurface utilities & risk heatmap zones           */
/* ------------------------------------------------------------------ */

export interface TreeSpec {
  id: string;
  x: number;
  z: number;
  scale: number;
  sectorId: string;
}

export const URBAN_TREES: TreeSpec[] = [
  { id: "t-1", x: -4.9, z: 2.6, scale: 1.0, sectorId: "S04" },
  { id: "t-2", x: -4.9, z: 3.9, scale: 0.9, sectorId: "S04" },
  { id: "t-3", x: 6.6, z: -1.4, scale: 1.1, sectorId: "S11" },
  { id: "t-4", x: 6.6, z: -2.8, scale: 1.0, sectorId: "S11" },
  { id: "t-5", x: 6.6, z: -4.1, scale: 0.95, sectorId: "S11" },
  { id: "t-6", x: 6.6, z: 2.7, scale: 1.05, sectorId: "S11" },
  { id: "t-7", x: 6.6, z: 3.9, scale: 0.9, sectorId: "S11" },
  { id: "t-8", x: -8.0, z: 2.8, scale: 1.1, sectorId: "S02" },
  { id: "t-9", x: -8.0, z: 4.1, scale: 0.95, sectorId: "S02" },
  { id: "t-10", x: 0.1, z: -3.5, scale: 1.0, sectorId: "S06" },
  { id: "t-11", x: 2.4, z: -3.5, scale: 0.9, sectorId: "S06" },
  { id: "t-12", x: -0.2, z: 6.6, scale: 1.0, sectorId: "S07" },
  { id: "t-13", x: 1.8, z: -8.1, scale: 1.0, sectorId: "S09" },
  { id: "t-14", x: 3.3, z: -8.1, scale: 0.9, sectorId: "S09" },
  { id: "t-15", x: -12.6, z: -2.6, scale: 1.1, sectorId: "S02" },
  { id: "t-16", x: 12.6, z: 2.8, scale: 1.05, sectorId: "S11" },
];

export interface UtilityConduit {
  id: string;
  label: string;
  kind: "storm-culvert" | "water-main" | "fiber-duct" | "smart-led";
  points: [number, number][];
  radius: number;
  color: string;
}

export const UTILITY_CONDUITS: UtilityConduit[] = [
  {
    id: "util-storm-brs",
    label: "Missing catch-pit lateral (S04)",
    kind: "storm-culvert",
    points: [
      [-6.2, 1.4],
      [-2.9, 1.4],
      [-0.2, 1.4],
    ],
    radius: 0.11,
    color: "#ef4444",
  },
  {
    id: "util-canal-culvert",
    label: "Western Box Culvert Expansion (CT-DH-D02)",
    kind: "storm-culvert",
    points: [
      [-8.8, -5.2],
      [-6.2, -5.0],
      [-6.2, 1.2],
    ],
    radius: 0.16,
    color: "#f59e0b",
  },
  {
    id: "util-water-cw",
    label: "300mm Cast-Iron Water Main (CT-DH-W06)",
    kind: "water-main",
    points: [
      [-9.2, -5.4],
      [-7.8, -3.0],
      [-6.8, -1.2],
      [-3.5, -1.2],
    ],
    radius: 0.09,
    color: "#38bdf8",
  },
  {
    id: "util-fiber-clash",
    label: "Unmapped Telecom Fibre Clash (Civic Core)",
    kind: "fiber-duct",
    points: [
      [-1.3, -4.5],
      [-1.3, 0.8],
      [0.4, -1.2],
      [4.5, -1.2],
    ],
    radius: 0.06,
    color: "#a855f7",
  },
  {
    id: "util-led-duct",
    label: "Underground HDPE Smart LED Conduit (CT-DH-L03)",
    kind: "smart-led",
    points: [
      [5.9, -7.5],
      [5.9, 0.9],
      [5.9, 7.2],
    ],
    radius: 0.08,
    color: "#10b981",
  },
];

export interface HeatmapZone {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  color: string;
  intensity: number;
}

export const HEATMAP_ZONES: HeatmapZone[] = [
  {
    id: "hm-brs",
    label: "Begum Rokeya Link Rd · 3× Failure",
    x: -1.6,
    z: 1.7,
    radius: 2.6,
    color: "#ef4444",
    intensity: 0.9,
  },
  {
    id: "hm-cw",
    label: "Canal West Culvert · 6mo Overdue",
    x: -7.1,
    z: -3.6,
    radius: 3.1,
    color: "#f59e0b",
    intensity: 0.85,
  },
  {
    id: "hm-cc",
    label: "Civic Core · Stalled Junction",
    x: 0.8,
    z: -0.5,
    radius: 2.1,
    color: "#ef4444",
    intensity: 0.75,
  },
  {
    id: "hm-ng",
    label: "North Gate · Waste & Feeder",
    x: -2.2,
    z: 5.7,
    radius: 2.2,
    color: "#f59e0b",
    intensity: 0.65,
  },
  {
    id: "hm-eb",
    label: "East Boulevard · Verified Benchmark",
    x: 6.4,
    z: -1.4,
    radius: 2.4,
    color: "#10b981",
    intensity: 0.6,
  },
];
