import type { MapPosition } from "@/types/citytrace";
import { getSector } from "@/data";

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
