import type { Evidence } from "@/types/citytrace";

/**
 * Simulated evidence archive.
 *
 * Every item is FICTIONAL. Documents carry a made-up archive reference, photos
 * are represented by generated gradient tiles (this demo ships no real
 * imagery), and `verified` marks whether a municipal verifier signed off on
 * the item in the scenario.
 *
 * The deliberate gaps matter as much as the records: several projects have
 * reported spending but no verified financial evidence at all, which is what
 * the Transparency Dashboard and AI Investigation Engine surface.
 */
export const EVIDENCE: Evidence[] = [
  /* ---------------- P-R01 · Arterial road resurfacing ---------------- */
  {
    id: "EV-PR01-01",
    kind: "photo",
    title: "Repair #3 full-width re-carpeting",
    capturedAt: "2025-03-11",
    source: "Municipal field inspection",
    verified: true,
    description:
      "Completed wearing course across the 1.8 km link road, photographed the day the third work order closed.",
    ref: "WO-2025-0311",
  },
  {
    id: "EV-PR01-02",
    kind: "measurement",
    title: "Core-cut asphalt depth log",
    capturedAt: "2025-03-18",
    source: "Independent materials lab",
    verified: false,
    description:
      "Six core samples logged; three measured below the BOQ-specified wearing course thickness.",
    ref: "LAB-2025-0318",
  },
  {
    id: "EV-PR01-03",
    kind: "photo",
    title: "Blocked side drain at main intersection",
    capturedAt: "2025-07-04",
    source: "Citizen upload",
    verified: true,
    description:
      "Standing water and 18+ deep potholes recorded four months after re-carpeting.",
  },
  {
    id: "EV-PR01-04",
    kind: "document",
    title: "Three-item work order ledger",
    capturedAt: "2025-04-02",
    source: "Municipal accounts cell",
    verified: true,
    description:
      "Payment ledger showing three successive surfacing bills totalling 96.9% of corridor allocation.",
    ref: "LEDGER-2025-0402",
  },

  /* ---------------- P-D02 · Storm drainage & box culvert -------------- */
  {
    id: "EV-PD02-01",
    kind: "photo",
    title: "Half-laid precast culvert spans",
    capturedAt: "2024-11-20",
    source: "Municipal field inspection",
    verified: true,
    description:
      "Photograph filed with the November variation order; northern spans still unplaced.",
  },
  {
    id: "EV-PD02-02",
    kind: "document",
    title: "Dewatering & variation order",
    capturedAt: "2024-11-20",
    source: "Municipal accounts cell",
    verified: true,
    description:
      "Variation order raising reported expenditure to 88.0% of allocation before structural completion.",
    ref: "VO-2024-1120",
  },
  {
    id: "EV-PD02-03",
    kind: "satellite",
    title: "North outlet joint exposure",
    capturedAt: "2025-07-15",
    source: "Simulated satellite tile",
    verified: false,
    description:
      "Imagery shows the uncommissioned northern outlet and pump bay six months past handover date.",
  },
  {
    id: "EV-PD02-04",
    kind: "measurement",
    title: "Verified progress survey",
    capturedAt: "2025-07-15",
    source: "Independent quantity surveyor",
    verified: true,
    description:
      "Physical completion measured at 40% against 88.0% reported financial disbursement.",
    ref: "QS-2025-0715",
  },

  /* ---------------- P-L03 · Smart LED streetlight corridor ------------- */
  {
    id: "EV-PL03-01",
    kind: "photo",
    title: "48 LED poles commissioned",
    capturedAt: "2024-12-18",
    source: "Municipal field inspection",
    verified: true,
    description:
      "Full corridor of smart LED luminaires energized and photographed two days ahead of target.",
  },
  {
    id: "EV-PL03-02",
    kind: "document",
    title: "Photometric audit & uptime log",
    capturedAt: "2024-12-20",
    source: "Telemetry export",
    verified: true,
    description:
      "Dusk-to-dawn telemetry confirming 48/48 luminaire uptime across the school zone.",
    ref: "LUX-2024-1220",
  },
  {
    id: "EV-PL03-03",
    kind: "document",
    title: "Reserve reconciliation statement",
    capturedAt: "2024-12-28",
    source: "Municipal accounts cell",
    verified: true,
    description:
      "Final audited spend ৳ 8,50,000 below ceiling; balance returned to municipal reserve.",
    ref: "REC-2024-1228",
  },

  /* ---------------- P-W05 · Waste transfer station -------------------- */
  {
    id: "EV-PW05-01",
    kind: "photo",
    title: "Compactor bay slab in progress",
    capturedAt: "2025-05-02",
    source: "Citizen upload",
    verified: false,
    description:
      "Unverified site photo showing formwork on the compactor bay; no engineer stamp on file.",
  },
  {
    id: "EV-PW05-02",
    kind: "measurement",
    title: "Verified progress survey",
    capturedAt: "2025-06-10",
    source: "Independent quantity surveyor",
    verified: true,
    description:
      "Physical progress measured at 62%, consistent with the reported tranche schedule.",
    ref: "QS-2025-0610",
  },

  /* ---------------- P-WTR06 · Water line rehabilitation --------------- */
  {
    id: "EV-PWTR06-01",
    kind: "document",
    title: "Utility relocation clearance request",
    capturedAt: "2024-09-30",
    source: "Municipal engineering cell",
    verified: false,
    description:
      "Outstanding request to two utility agencies; no clearance response is present in the record.",
  },
  {
    id: "EV-PWTR06-02",
    kind: "photo",
    title: "Open trench on Canal Road",
    capturedAt: "2025-02-14",
    source: "Citizen upload",
    verified: true,
    description:
      "Service trench opened for water main works and left unsurfaced through the monsoon.",
  },

  /* ---------------- P-R07 · Pedestrian crossing retrofit -------------- */
  {
    id: "EV-PR07-01",
    kind: "photo",
    title: "Signal retrofit complete",
    capturedAt: "2024-10-08",
    source: "Municipal field inspection",
    verified: true,
    description:
      "Pedestrian signal heads and high-visibility crossing markings installed at the market junction.",
  },
  {
    id: "EV-PR07-02",
    kind: "sensor",
    title: "Crossing activation sensor log",
    capturedAt: "2024-11-01",
    source: "Signal controller telemetry",
    verified: true,
    description:
      "Thirty days of activation counts showing the retrofit is functioning as designed.",
  },

  /* ---------------- P-D08 · Storm drain desilting --------------------- */
  {
    id: "EV-PD08-01",
    kind: "document",
    title: "Desilting volume ticket",
    capturedAt: "2025-06-01",
    source: "Works contractor",
    verified: false,
    description:
      "Contractor-declared silt volume with no independent weighbridge confirmation attached.",
  },
  {
    id: "EV-PD08-02",
    kind: "photo",
    title: "Partial desilting at south outfall",
    capturedAt: "2025-06-12",
    source: "Citizen upload",
    verified: true,
    description:
      "Outfall partially cleared; upstream sections still silted to within 300 mm of the crown.",
  },

  /* ---------------- P-R10 · Intersection reconstruction --------------- */
  {
    id: "EV-PR10-01",
    kind: "document",
    title: "Utility conflict notice",
    capturedAt: "2024-10-20",
    source: "Municipal engineering cell",
    verified: true,
    description:
      "Formal notice that fibre ducts and a water main cross the proposed intersection footprint.",
    ref: "UC-2024-1020",
  },
  {
    id: "EV-PR10-02",
    kind: "photo",
    title: "Excavated intersection, unshored",
    capturedAt: "2025-03-05",
    source: "Citizen upload",
    verified: false,
    description:
      "Open excavation left unshored and unlit; works visibly suspended at the time of capture.",
  },

  /* ---------------- P-S11 · School safety walkway --------------------- */
  {
    id: "EV-PS11-01",
    kind: "photo",
    title: "Walkway handover",
    capturedAt: "2024-07-19",
    source: "Municipal field inspection",
    verified: true,
    description:
      "Segregated walkway and bollards completed along the school frontage ahead of schedule.",
  },

  /* ---------------- Issue evidence ----------------------------------- */
  {
    id: "EV-ISS-BRS-01",
    kind: "photo",
    title: "Pothole cluster at link road junction",
    capturedAt: "2023-03-14",
    source: "Citizen upload",
    verified: true,
    description:
      "First documented failure: a 2.4 m cluster of potholes at the main intersection approach.",
  },
  {
    id: "EV-ISS-BRS-02",
    kind: "photo",
    title: "Same spot, fourteen months later",
    capturedAt: "2024-05-09",
    source: "Citizen upload",
    verified: true,
    description:
      "Potholes returned at the identical chainage after the January 2024 overlay.",
  },
  {
    id: "EV-ISS-BRS-03",
    kind: "photo",
    title: "Knee-deep water at the junction",
    capturedAt: "2025-07-04",
    source: "Citizen upload",
    verified: true,
    description:
      "Waterlogging four months after the third resurfacing, with side drains blocked.",
  },
  {
    id: "EV-ISS-CAN-01",
    kind: "photo",
    title: "Silted outfall mouth",
    capturedAt: "2022-10-02",
    source: "Citizen upload",
    verified: true,
    description:
      "Western outfall silted almost to the crown before the emergency desilting contract.",
  },
  {
    id: "EV-ISS-CAN-02",
    kind: "satellite",
    title: "Flood extent over Canal West",
    capturedAt: "2025-07-16",
    source: "Simulated satellite tile",
    verified: true,
    description:
      "Standing water across four blocks while the box culvert outfall remains uncommissioned.",
  },
  {
    id: "EV-ISS-NGM-01",
    kind: "photo",
    title: "Overflowing bins, Market Lane",
    capturedAt: "2025-04-11",
    source: "Citizen upload",
    verified: true,
    description:
      "Twelve communal bins unemptied for three days beside the wholesale market.",
  },
  {
    id: "EV-ISS-NGM-02",
    kind: "photo",
    title: "Same bins, still uncollected",
    capturedAt: "2025-06-02",
    source: "Citizen upload",
    verified: false,
    description:
      "Recurrence photograph submitted seven weeks later; not yet reviewed by the municipal desk.",
  },
  {
    id: "EV-ISS-CC-01",
    kind: "measurement",
    title: "Signal controller fault log",
    capturedAt: "2025-01-22",
    source: "Signal controller telemetry",
    verified: true,
    description:
      "Intermittent controller resets logged on eleven days across a three-week window.",
  },
  {
    id: "EV-ISS-CC-02",
    kind: "photo",
    title: "Open manhole beside the crossing",
    capturedAt: "2025-05-19",
    source: "Citizen upload",
    verified: true,
    description:
      "Uncovered chamber within two metres of the pedestrian crossing, unmarked at night.",
  },
  {
    id: "EV-ISS-EB-01",
    kind: "sensor",
    title: "Dark-spot lux reading",
    capturedAt: "2025-02-08",
    source: "Mobile lux survey",
    verified: true,
    description:
      "Four pole positions measured below the corridor lighting standard after commissioning.",
  },
  {
    id: "EV-ISS-SM-01",
    kind: "photo",
    title: "Faded zebra crossing outside school gate",
    capturedAt: "2024-08-11",
    source: "Citizen upload",
    verified: true,
    description:
      "Markings worn to below 40% visibility three weeks after the walkway handover.",
  },
  {
    id: "EV-ISS-FP-01",
    kind: "photo",
    title: "Footpath encroachment at bus stop",
    capturedAt: "2025-05-30",
    source: "Citizen upload",
    verified: false,
    description:
      "Vendor stalls occupying 70% of the footway width, forcing pedestrians onto the carriageway.",
  },
];
