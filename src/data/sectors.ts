import type { Sector } from "@/types/citytrace";

/**
 * Sectors of the simulated Dhaka civic district.
 *
 * These are FICTIONAL neighbourhoods modelled on Dhaka's grid pattern — they
 * are not real wards, and nothing here represents an actual government record.
 */
export const SECTORS: Sector[] = [
  {
    id: "S04",
    code: "S04",
    name: "Central-West",
    ward: "Ward 14",
    center: [-1.5, 1.0],
    populationEstimate: 184_000,
    description:
      "Dense mixed-use corridor anchored by Begum Rokeya Sarani Link Road. Heavy commuter traffic, fragmented drainage, and the district's most repaired arterial surface.",
  },
  {
    id: "S07",
    code: "S07",
    name: "North Gate",
    ward: "Ward 09",
    center: [-2.0, 5.5],
    populationEstimate: 142_000,
    description:
      "Northern entry corridor with a wholesale market lane. Waste collection and ageing feeder cabling are the recurring pressure points.",
  },
  {
    id: "S11",
    code: "S11",
    name: "East Boulevard",
    ward: "Ward 21",
    center: [6.5, -2.0],
    populationEstimate: 96_000,
    description:
      "Civic boulevard and school zone. Recently retrofitted with underground conduits and smart lighting; serves as the district benchmark for delivery.",
  },
  {
    id: "S02",
    code: "S02",
    name: "Canal West",
    ward: "Ward 07",
    center: [-7.0, -3.5],
    populationEstimate: 121_000,
    description:
      "Low-lying strip along the western storm canal. Monsoon waterlogging and the box culvert outfall dominate every rainy season.",
  },
  {
    id: "S09",
    code: "S09",
    name: "South Market",
    ward: "Ward 18",
    center: [2.0, -5.5],
    populationEstimate: 158_000,
    description:
      "Retail and transport hub with high pedestrian volumes. Crossing safety and storm drainage upgrades are in flight.",
  },
  {
    id: "S06",
    code: "S06",
    name: "Civic Core",
    ward: "Ward 12",
    center: [1.5, 0.5],
    populationEstimate: 87_000,
    description:
      "Administrative quarter around the main intersection. Intersection reconstruction has been stalled since utility conflicts surfaced.",
  },
];
