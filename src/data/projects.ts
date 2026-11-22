import type { Project } from "@/types/citytrace";

/**
 * Simulated public infrastructure projects.
 *
 * Money is deliberately split three ways so the UI can never blur the lines:
 *   allocatedBudgetBdt       — sanctioned ceiling
 *   reportedExpenditureBdt   — what the executing office says it spent
 *   verifiedExpenditureBdt   — what independent evidence actually supports
 *                              (`undefined` = no verified financial evidence)
 *
 * Authorities are FICTIONAL stand-ins, suffixed "(Simulated)".
 */
export const PROJECTS: Project[] = [
  /* ------------------------------------------------------------------ */
  /* 1 · Arterial road resurfacing — the flagship recurring-failure case */
  /* ------------------------------------------------------------------ */
  {
    id: "P-R01",
    code: "CT-DH-R01",
    name: "Sector 04 Arterial Road Resurfacing & Pothole Rehabilitation",
    description:
      "Rehabilitate a 1.8 km high-traffic arterial link road. Three successive surfacing work orders have been billed against the same corridor within fifteen months, with recurring potholes and waterlogged sub-base subsidence at the main intersection.",
    category: "road",
    sectorId: "S04",
    location: "Begum Rokeya Sarani Link Road, Ward 14",
    locationKey: "begum-rokeya-sarani-junction",
    authority: "Dhaka Metro North Roads & Highways Cell (Simulated)",
    status: "delayed",
    severity: "critical",
    coordinates: [-2.9, 1.0],
    startDate: "2024-01-14",
    plannedCompletionDate: "2024-11-30",
    allocatedBudgetBdt: 48_000_000,
    reportedExpenditureBdt: 46_500_000,
    verifiedExpenditureBdt: 27_500_000,
    verifiedProgressPercent: 35,
    milestones: [
      {
        id: "P-R01-M1",
        title: "Sub-base investigation & design approval",
        plannedDate: "2024-02-15",
        actualDate: "2024-02-28",
        status: "missed",
        note: "Geotechnical survey delivered two weeks late.",
      },
      {
        id: "P-R01-M2",
        title: "First surface overlay complete",
        plannedDate: "2024-04-01",
        actualDate: "2024-01-28",
        status: "met",
        note: "Delivered early, but without deep base reconstruction.",
      },
      {
        id: "P-R01-M3",
        title: "Drainage & catch-pit works",
        plannedDate: "2024-06-30",
        status: "missed",
        note: "No catch-pit drainage appears in any work order.",
      },
      {
        id: "P-R01-M4",
        title: "Final wearing course & handover",
        plannedDate: "2024-11-30",
        status: "missed",
        note: "Third re-carpeting billed in March 2025, four months after target.",
      },
    ],
    evidenceIds: ["EV-PR01-01", "EV-PR01-02", "EV-PR01-03", "EV-PR01-04"],
    issueIds: ["ISS-001", "ISS-002", "ISS-003"],
    workNote:
      "96.9% of the corridor allocation exhausted across three repair cycles.",
  },

  /* ------------------------------------------------------------------ */
  /* 2 · Storm drainage & box culvert                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "P-D02",
    code: "CT-DH-D02",
    name: "Sector 04 West Storm Drainage & Box Culvert Expansion",
    description:
      "Reinforced concrete box culvert and stormwater pump chamber expansion to relieve chronic ankle-to-knee monsoon waterlogging. Roughly six months past the contractual deadline with open trench barricades and an incomplete northern outfall.",
    category: "drainage",
    sectorId: "S02",
    location: "Canal Crossing & Storm Conduit, West Sector 04",
    locationKey: "west-canal-outfall",
    authority: "Dhaka Urban Drainage & Canal Works Division (Simulated)",
    status: "delayed",
    severity: "critical",
    coordinates: [-7.5, -5.0],
    startDate: "2024-03-01",
    plannedCompletionDate: "2025-01-31",
    allocatedBudgetBdt: 65_000_000,
    reportedExpenditureBdt: 57_200_000,
    verifiedExpenditureBdt: 34_000_000,
    verifiedProgressPercent: 40,
    milestones: [
      {
        id: "P-D02-M1",
        title: "Excavation & dewatering mobilization",
        plannedDate: "2024-05-31",
        actualDate: "2024-07-12",
        status: "missed",
        note: "Underground fibre-duct clash halted the north wall.",
      },
      {
        id: "P-D02-M2",
        title: "Precast culvert slabs laid",
        plannedDate: "2024-10-31",
        status: "in-progress",
        note: "Half-laid when the November variation order was raised.",
      },
      {
        id: "P-D02-M3",
        title: "Pump chamber commissioning",
        plannedDate: "2024-12-31",
        status: "missed",
      },
      {
        id: "P-D02-M4",
        title: "Outfall joints & handover",
        plannedDate: "2025-01-31",
        status: "missed",
        note: "Northern outlet and pump bay uncommissioned at audit.",
      },
    ],
    evidenceIds: ["EV-PD02-01", "EV-PD02-02", "EV-PD02-03", "EV-PD02-04"],
    issueIds: ["ISS-004", "ISS-005"],
    workNote: "Cited utility line relocation delays and monsoon pump stoppage.",
  },

  /* ------------------------------------------------------------------ */
  /* 3 · Smart LED streetlight corridor — the clean benchmark            */
  /* ------------------------------------------------------------------ */
  {
    id: "P-L03",
    code: "CT-DH-L03",
    name: "Sector 04 Smart LED Streetlight & Underground Grid Corridor",
    description:
      "Replaced 48 ageing overhead sodium lamps and exposed feeder cables along the Civic Boulevard school corridor with surge-protected underground cabling and smart dusk-to-dawn dimming LED luminaires.",
    category: "streetlight",
    sectorId: "S11",
    location: "Civic Boulevard & School Zone Perimeter",
    locationKey: "east-boulevard-school-zone",
    authority: "Dhaka Municipal Street Illumination Unit (Simulated)",
    status: "completed",
    severity: "low",
    coordinates: [6.4, 0.9],
    startDate: "2024-08-01",
    plannedCompletionDate: "2024-12-20",
    actualCompletionDate: "2024-12-18",
    allocatedBudgetBdt: 18_000_000,
    reportedExpenditureBdt: 17_150_000,
    verifiedExpenditureBdt: 17_150_000,
    verifiedProgressPercent: 100,
    milestones: [
      {
        id: "P-L03-M1",
        title: "Utility mapping & trench permit",
        plannedDate: "2024-08-20",
        actualDate: "2024-08-18",
        status: "met",
      },
      {
        id: "P-L03-M2",
        title: "HDPE ducting complete",
        plannedDate: "2024-09-15",
        actualDate: "2024-09-10",
        status: "met",
        note: "Installed along 1.4 km without traffic closure.",
      },
      {
        id: "P-L03-M3",
        title: "48 luminaires energized",
        plannedDate: "2024-11-30",
        actualDate: "2024-11-22",
        status: "met",
      },
      {
        id: "P-L03-M4",
        title: "Photometric audit & handover",
        plannedDate: "2024-12-20",
        actualDate: "2024-12-18",
        status: "met",
        note: "Two days ahead of target, 4.7% under ceiling.",
      },
    ],
    evidenceIds: ["EV-PL03-01", "EV-PL03-02", "EV-PL03-03"],
    issueIds: ["ISS-010"],
    workNote: "Zero variation claims above sanctioned BOQ unit rates.",
  },

  /* ------------------------------------------------------------------ */
  /* 4 · Waste transfer station                                          */
  /* ------------------------------------------------------------------ */
  {
    id: "P-W05",
    code: "CT-DH-W05",
    name: "North Gate Solid Waste Transfer Station Upgrade",
    description:
      "Modernise the wholesale-market transfer station with a covered compactor bay, leachate collection line, and sealed wash-down apron to replace open tipping.",
    category: "waste",
    sectorId: "S07",
    location: "Market Lane Depot, North Gate",
    locationKey: "north-gate-market-lane",
    authority: "Dhaka North Waste Management Cell (Simulated)",
    status: "active",
    severity: "moderate",
    coordinates: [-2.0, 4.2],
    startDate: "2025-01-15",
    plannedCompletionDate: "2025-10-30",
    allocatedBudgetBdt: 32_000_000,
    reportedExpenditureBdt: 21_400_000,
    verifiedExpenditureBdt: 18_900_000,
    verifiedProgressPercent: 62,
    milestones: [
      {
        id: "P-W05-M1",
        title: "Site clearance & bay layout",
        plannedDate: "2025-03-01",
        actualDate: "2025-03-09",
        status: "missed",
      },
      {
        id: "P-W05-M2",
        title: "Compactor bay slab",
        plannedDate: "2025-05-15",
        actualDate: "2025-06-04",
        status: "missed",
        note: "Concrete pour delayed by monsoon groundwater.",
      },
      {
        id: "P-W05-M3",
        title: "Leachate collection line",
        plannedDate: "2025-08-01",
        status: "in-progress",
      },
      {
        id: "P-W05-M4",
        title: "Commission transfer station",
        plannedDate: "2025-10-30",
        status: "pending",
      },
    ],
    evidenceIds: ["EV-PW05-01", "EV-PW05-02"],
    issueIds: ["ISS-006", "ISS-007"],
    workNote: "Progress broadly consistent with reported tranche schedule.",
  },

  /* ------------------------------------------------------------------ */
  /* 5 · Water line rehabilitation — the missing-evidence case           */
  /* ------------------------------------------------------------------ */
  {
    id: "P-WTR06",
    code: "CT-DH-W06",
    name: "Canal West Water Line Rehabilitation (Phase 2)",
    description:
      "Replace 2.4 km of corroded 300 mm cast-iron distribution main serving four blocks of Canal West, with household reconnection and pressure zoning.",
    category: "water",
    sectorId: "S02",
    location: "Canal Road, West Sector 02",
    locationKey: "canal-road-trench",
    authority: "Dhaka Water Supply & Sewerage Authority — Zone 4 (Simulated)",
    status: "delayed",
    severity: "high",
    coordinates: [-6.4, -5.4],
    startDate: "2024-06-01",
    plannedCompletionDate: "2025-04-30",
    allocatedBudgetBdt: 41_000_000,
    reportedExpenditureBdt: 39_800_000,
    verifiedExpenditureBdt: undefined,
    verifiedProgressPercent: 45,
    milestones: [
      {
        id: "P-WTR06-M1",
        title: "Utility relocation clearances",
        plannedDate: "2024-09-30",
        status: "missed",
        note: "No clearance response from either utility agency on file.",
      },
      {
        id: "P-WTR06-M2",
        title: "Main line replacement (2.4 km)",
        plannedDate: "2025-01-31",
        status: "missed",
      },
      {
        id: "P-WTR06-M3",
        title: "Pressure testing & chlorination",
        plannedDate: "2025-03-31",
        status: "pending",
      },
      {
        id: "P-WTR06-M4",
        title: "Household reconnection",
        plannedDate: "2025-04-30",
        status: "pending",
      },
    ],
    evidenceIds: ["EV-PWTR06-01", "EV-PWTR06-02"],
    issueIds: ["ISS-012", "ISS-013"],
    workNote:
      "Reported spend at 97.1% with no independent financial verification attached.",
  },

  /* ------------------------------------------------------------------ */
  /* 6 · Pedestrian crossing retrofit                                    */
  /* ------------------------------------------------------------------ */
  {
    id: "P-R07",
    code: "CT-DH-S07",
    name: "South Market Pedestrian Crossing & Signal Retrofit",
    description:
      "High-visibility crossing markings, pedestrian signal heads, and countdown timers at the four approaches to the South Market bus interchange.",
    category: "public-safety",
    sectorId: "S09",
    location: "South Market Bus Interchange Junction",
    locationKey: "south-market-crossing",
    authority: "Dhaka Metropolitan Traffic & Safety Cell (Simulated)",
    status: "completed",
    severity: "low",
    coordinates: [1.2, -6.2],
    startDate: "2024-07-01",
    plannedCompletionDate: "2024-10-15",
    actualCompletionDate: "2024-10-08",
    allocatedBudgetBdt: 9_500_000,
    reportedExpenditureBdt: 9_120_000,
    verifiedExpenditureBdt: 9_120_000,
    verifiedProgressPercent: 100,
    milestones: [
      {
        id: "P-R07-M1",
        title: "Signal design approval",
        plannedDate: "2024-07-20",
        actualDate: "2024-07-18",
        status: "met",
      },
      {
        id: "P-R07-M2",
        title: "Crossing retrofit works",
        plannedDate: "2024-09-10",
        actualDate: "2024-09-06",
        status: "met",
      },
      {
        id: "P-R07-M3",
        title: "Signal activation & safety audit",
        plannedDate: "2024-10-15",
        actualDate: "2024-10-08",
        status: "met",
        note: "Delivered inside allocation with verified activation telemetry.",
      },
    ],
    evidenceIds: ["EV-PR07-01", "EV-PR07-02"],
    issueIds: [],
    workNote: "Telemetry confirms the retrofit is operating as designed.",
  },

  /* ------------------------------------------------------------------ */
  /* 7 · Storm drain desilting                                           */
  /* ------------------------------------------------------------------ */
  {
    id: "P-D08",
    code: "CT-DH-D08",
    name: "South Market Storm Drain Desilting Programme",
    description:
      "Mechanical desilting of 3.6 km of secondary storm drains and the south outfall, with independent silt-volume verification before payment.",
    category: "drainage",
    sectorId: "S09",
    location: "Lane 4 & South Outfall, South Market",
    locationKey: "south-market-lane-4",
    authority: "Dhaka Urban Drainage & Canal Works Division (Simulated)",
    status: "active",
    severity: "high",
    coordinates: [2.4, -6.6],
    startDate: "2025-04-01",
    plannedCompletionDate: "2025-09-30",
    allocatedBudgetBdt: 12_000_000,
    reportedExpenditureBdt: 11_700_000,
    verifiedExpenditureBdt: 6_000_000,
    verifiedProgressPercent: 55,
    milestones: [
      {
        id: "P-D08-M1",
        title: "Pre-desilting condition survey",
        plannedDate: "2025-04-20",
        actualDate: "2025-04-24",
        status: "missed",
      },
      {
        id: "P-D08-M2",
        title: "Main outfall desilting",
        plannedDate: "2025-07-31",
        status: "in-progress",
        note: "Silt declared by contractor; no weighbridge ticket attached.",
      },
      {
        id: "P-D08-M3",
        title: "Silt disposal verification",
        plannedDate: "2025-09-15",
        status: "pending",
      },
    ],
    evidenceIds: ["EV-PD08-01", "EV-PD08-02"],
    issueIds: ["ISS-014"],
    workNote: "Volume ticket unverified — payment still pending audit.",
  },

  /* ------------------------------------------------------------------ */
  /* 8 · Feeder cable replacement (not started)                          */
  /* ------------------------------------------------------------------ */
  {
    id: "P-L09",
    code: "CT-DH-L09",
    name: "North Gate Feeder Cable Replacement",
    description:
      "Replace corroded overhead feeder cable on four market-lane spans with armoured underground conductors and surge protection.",
    category: "streetlight",
    sectorId: "S07",
    location: "Market Lane Spans 3–7, North Gate",
    locationKey: "north-gate-feeder",
    authority: "Dhaka Municipal Street Illumination Unit (Simulated)",
    status: "planned",
    severity: "moderate",
    coordinates: [-1.0, 6.6],
    startDate: "2025-09-01",
    plannedCompletionDate: "2026-01-31",
    allocatedBudgetBdt: 7_800_000,
    reportedExpenditureBdt: 0,
    verifiedExpenditureBdt: undefined,
    verifiedProgressPercent: 0,
    milestones: [
      {
        id: "P-L09-M1",
        title: "Design & BOQ approval",
        plannedDate: "2025-10-15",
        status: "pending",
      },
      {
        id: "P-L09-M2",
        title: "Cable replacement works",
        plannedDate: "2025-12-15",
        status: "pending",
      },
      {
        id: "P-L09-M3",
        title: "Energization & handover",
        plannedDate: "2026-01-31",
        status: "pending",
      },
    ],
    evidenceIds: [],
    issueIds: ["ISS-016"],
    workNote: "Sanctioned but not yet mobilized.",
  },

  /* ------------------------------------------------------------------ */
  /* 9 · Intersection reconstruction — stalled                           */
  /* ------------------------------------------------------------------ */
  {
    id: "P-R10",
    code: "CT-DH-R10",
    name: "Civic Core Intersection Reconstruction",
    description:
      "Full-depth reconstruction of the Civic Core junction with channelised turning lanes, a raised pedestrian refuge, and new signal ducting.",
    category: "road",
    sectorId: "S06",
    location: "Civic Core Main Intersection, Ward 12",
    locationKey: "civic-core-junction",
    authority: "Dhaka Metro North Roads & Highways Cell (Simulated)",
    status: "stalled",
    severity: "critical",
    coordinates: [0.2, -1.2],
    startDate: "2024-09-01",
    plannedCompletionDate: "2025-06-30",
    allocatedBudgetBdt: 27_000_000,
    reportedExpenditureBdt: 24_300_000,
    verifiedExpenditureBdt: 12_100_000,
    verifiedProgressPercent: 30,
    milestones: [
      {
        id: "P-R10-M1",
        title: "Utility conflict resolution",
        plannedDate: "2024-11-30",
        status: "missed",
        note: "Fibre ducts and a water main cross the junction footprint.",
      },
      {
        id: "P-R10-M2",
        title: "Intersection base course",
        plannedDate: "2025-02-28",
        status: "missed",
      },
      {
        id: "P-R10-M3",
        title: "Signals & final paving",
        plannedDate: "2025-05-31",
        status: "pending",
      },
      {
        id: "P-R10-M4",
        title: "Handover",
        plannedDate: "2025-06-30",
        status: "pending",
      },
    ],
    evidenceIds: ["EV-PR10-01", "EV-PR10-02"],
    issueIds: ["ISS-008", "ISS-009"],
    workNote: "Works suspended pending utility relocation; excavation left open.",
  },

  /* ------------------------------------------------------------------ */
  /* 10 · School safety walkway                                          */
  /* ------------------------------------------------------------------ */
  {
    id: "P-S11",
    code: "CT-DH-S11",
    name: "East Boulevard School Safety Walkway",
    description:
      "Segregated walkway, bollards, and drop-off lay-by along the school frontage to separate children from the carriageway at peak hours.",
    category: "public-safety",
    sectorId: "S11",
    location: "Civic Boulevard School Frontage",
    locationKey: "east-boulevard-school-zone",
    authority: "Dhaka Metropolitan Traffic & Safety Cell (Simulated)",
    status: "completed",
    severity: "low",
    coordinates: [7.4, -4.4],
    startDate: "2024-04-01",
    plannedCompletionDate: "2024-07-31",
    actualCompletionDate: "2024-07-19",
    allocatedBudgetBdt: 15_600_000,
    reportedExpenditureBdt: 15_100_000,
    verifiedExpenditureBdt: 15_100_000,
    verifiedProgressPercent: 100,
    milestones: [
      {
        id: "P-S11-M1",
        title: "School zone traffic survey",
        plannedDate: "2024-04-20",
        actualDate: "2024-04-17",
        status: "met",
      },
      {
        id: "P-S11-M2",
        title: "Walkway construction",
        plannedDate: "2024-06-30",
        actualDate: "2024-06-28",
        status: "met",
      },
      {
        id: "P-S11-M3",
        title: "Handover & bollard installation",
        plannedDate: "2024-07-31",
        actualDate: "2024-07-19",
        status: "met",
        note: "Handed over twelve days early.",
      },
    ],
    evidenceIds: ["EV-PS11-01"],
    issueIds: ["ISS-011"],
    workNote: "Crossing markings required repainting within one month of handover.",
  },
];
