import type { Department, Issue, IssueCategory } from "@/types/citytrace";

/**
 * Municipal departments responsible for executing repairs and field works.
 * Matched against infrastructure categories and project authorities.
 */
export const DEPARTMENTS: readonly Department[] = [
  {
    id: "DEPT-ROADS",
    code: "DRHC",
    name: "Dhaka Metro North Roads & Highways Cell (Simulated)",
    shortName: "Roads & Safety",
    categories: ["road", "public-safety"],
    description:
      "Arterial carriageway resurfacing, junction geometry, footpaths, crosswalks, and roadside safety.",
  },
  {
    id: "DEPT-DRAINAGE",
    code: "DUDW",
    name: "Dhaka Urban Drainage & Canal Works Division (Simulated)",
    shortName: "Drainage & Water",
    categories: ["drainage", "water"],
    description:
      "Stormwater culverts, catch-pit drains, pumping stations, and municipal waterlines.",
  },
  {
    id: "DEPT-LIGHTING",
    code: "DMSU",
    name: "Dhaka Municipal Street Illumination & Sanitation Unit (Simulated)",
    shortName: "Lighting & Waste",
    categories: ["streetlight", "waste"],
    description:
      "Public LED corridors, underground feeder grids, pedestrian subways, and waste transfer yards.",
  },
] as const;

export const departmentsById = new Map<string, Department>(
  DEPARTMENTS.map((dept) => [dept.id, dept])
);

export function getDepartment(id: string | undefined): Department | undefined {
  if (!id) return undefined;
  return departmentsById.get(id);
}

export function defaultDepartmentForCategory(category: IssueCategory): Department {
  return (
    DEPARTMENTS.find((dept) => dept.categories.includes(category)) ?? DEPARTMENTS[0]
  );
}

export function getDepartmentForIssue(
  issue: Pick<Issue, "departmentId" | "category">
): Department {
  return (
    getDepartment(issue.departmentId) ?? defaultDepartmentForCategory(issue.category)
  );
}
