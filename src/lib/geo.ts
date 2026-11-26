import type { MapPosition } from "@/types/citytrace";
import { SECTORS, getSector } from "@/data";

export type LngLat = [number, number];

export interface SectorGeoAnchor {
  lngLat: LngLat;
  neighbourhood: string;
}

/** Approximate real-world anchors for the simulated sectors (demo placement only). */
export const SECTOR_GEO_ANCHORS: Record<string, SectorGeoAnchor> = {
  S04: { lngLat: [90.3757, 23.7895], neighbourhood: "Begum Rokeya Sarani, Shewrapara" },
  S07: { lngLat: [90.3686, 23.8069], neighbourhood: "Mirpur 10" },
  S11: { lngLat: [90.4155, 23.7880], neighbourhood: "Gulshan Avenue" },
  S02: { lngLat: [90.3585, 23.7585], neighbourhood: "Mohammadpur" },
  S09: { lngLat: [90.4128, 23.7236], neighbourhood: "Gulistan" },
  S06: { lngLat: [90.3898, 23.7577], neighbourhood: "Farmgate" },
};

export const DHAKA_CENTER: LngLat = [90.3870, 23.7650];

/** Bounds that frame every anchored record. */
export const DHAKA_RECORDS_BOUNDS: [LngLat, LngLat] = [
  [90.350, 23.716],
  [90.424, 23.814],
];

/** Hard pan limit. */
export const DHAKA_MAX_BOUNDS: [LngLat, LngLat] = [
  [90.28, 23.64],
  [90.52, 23.90],
];

export const DEMO_UNIT_METERS = 85;
const M_PER_DEG_LAT = 111_320;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function sectorLngLat(sectorId: string): LngLat | null {
  return SECTOR_GEO_ANCHORS[sectorId]?.lngLat ?? null;
}

/** Converts a demo-plane [x, z] to [lng, lat]: sector anchor + offset from the sector centre. */
export function toLngLat(sectorId: string, coordinates: MapPosition): LngLat {
  const anchor = SECTOR_GEO_ANCHORS[sectorId];
  const sector = getSector(sectorId);
  const base = anchor?.lngLat ?? DHAKA_CENTER;
  const origin = sector?.center ?? [0, 0];
  const dx = (coordinates[0] - origin[0]) * DEMO_UNIT_METERS; // metres east
  const dz = (coordinates[1] - origin[1]) * DEMO_UNIT_METERS; // metres north
  const lat = base[1] + dz / M_PER_DEG_LAT;
  const lng = base[0] + dx / (M_PER_DEG_LAT * Math.cos((base[1] * Math.PI) / 180));
  return [round6(lng), round6(lat)];
}

/** Finds the closest district sector for a demo-plane [x, z] coordinate. */
export function nearestSectorForPosition(position: MapPosition): string {
  let bestId = SECTORS[0]?.id ?? "S04";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const sector of SECTORS) {
    const dx = position[0] - sector.center[0];
    const dz = position[1] - sector.center[1];
    const dist = dx * dx + dz * dz;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = sector.id;
    }
  }
  return bestId;
}

const clampDemoCoord = (value: number) =>
  Math.max(-14, Math.min(14, Number(value.toFixed(2))));

/** Resolves a clicked [lng, lat] on the Real Dhaka map to the closest sector & demo coordinates. */
export function nearestSectorForLngLat(lngLat: LngLat): {
  sectorId: string;
  coordinates: MapPosition;
  neighbourhood: string;
} {
  let bestSectorId = "S04";
  let bestAnchor = SECTOR_GEO_ANCHORS.S04;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const [sectorId, anchor] of Object.entries(SECTOR_GEO_ANCHORS)) {
    const cosLat = Math.cos((anchor.lngLat[1] * Math.PI) / 180);
    const dlng = (lngLat[0] - anchor.lngLat[0]) * cosLat;
    const dlat = lngLat[1] - anchor.lngLat[1];
    const dist = dlng * dlng + dlat * dlat;
    if (dist < bestDist) {
      bestDist = dist;
      bestSectorId = sectorId;
      bestAnchor = anchor;
    }
  }

  const sector = getSector(bestSectorId);
  const origin = sector?.center ?? [0, 0];
  const cosLat = Math.cos((bestAnchor.lngLat[1] * Math.PI) / 180);
  const dx = (lngLat[0] - bestAnchor.lngLat[0]) * M_PER_DEG_LAT * cosLat;
  const dz = (lngLat[1] - bestAnchor.lngLat[1]) * M_PER_DEG_LAT;

  return {
    sectorId: bestSectorId,
    coordinates: [
      clampDemoCoord(origin[0] + dx / DEMO_UNIT_METERS),
      clampDemoCoord(origin[1] + dz / DEMO_UNIT_METERS),
    ],
    neighbourhood: bestAnchor.neighbourhood,
  };
}
