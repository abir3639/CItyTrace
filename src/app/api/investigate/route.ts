import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import casesData from "@/data/cases.json";
import type { InfraCase, InvestigationReport } from "@/types/citytrace";

const CASES = casesData as InfraCase[];

type FallbackPayload = Omit<
  InvestigationReport,
  "source" | "model" | "generatedAt"
>;

const FALLBACK_REPORTS: Record<string, FallbackPayload> = {
  "case-road-01": {
    caseId: "case-road-01",
    headline:
      "Three Separate Surfacing Bills Consumed 96.9% of Budget Without Sub-Base Fix",
    riskLevel: "HIGH",
    confidenceScore: 91,
    executiveSummary:
      "Simulated records indicate Begum Rokeya Sarani Link Road received three separate asphalt repair interventions between January 2024 and March 2025 totaling ৳ 4,65,00,000 out of ৳ 4,80,00,000 allocated (96.9%), yet remained in an unresolved degraded condition by July 2025. Each repair cycle addressed upper surface layers while leaving recurring water-logging and sub-base instability unresolved.",
    repairHistoryAnalysis:
      "Repair #1 (Jan 2024, ৳ 1,45,00,000) used a thin surface bitumen overlay that stripped within four months. Repair #2 (Aug 2024, ৳ 1,30,00,000) applied emergency monsoon fill without catch-pit drainage and partially washed out within six weeks. Repair #3 (Mar 2025, ৳ 1,90,00,000) performed full-width re-carpeting, after which 18+ deep potholes re-emerged by May 2025.",
    delayAnalysis:
      "Although a 10-month completion target was set for 2024-11-30, major Repair #3 was billed in March 2025—over three months after the planned deadline—and the corridor still logged recurring fractures during the July 4, 2025 civic inspection.",
    budgetAnalysis:
      "Combined repair billing (৳ 1.45 Cr + ৳ 1.30 Cr + ৳ 1.90 Cr) matches the reported ৳ 4,65,00,000 expenditure (96.9% of the ৳ 4,80,00,000 ceiling), leaving only ৳ 15,00,000 unspent while physical progress stands at 35%.",
    inconsistencies: [
      "96.9% financial utilization (৳ 4,65,00,000 of ৳ 4,80,00,000) versus only 35% verified structural condition.",
      "Three consecutive resurfacing payments billed against the same 1.8 km link road within 15 months without documented drainage or deep-base remediation.",
      "Contractual target date (2024-11-30) passed prior to approving the largest single tranche (৳ 1,90,00,000 in Mar 2025).",
    ],
    evidenceCitations: [
      {
        label: "Repair #1 Record · Jan 2024",
        fact: "৳ 1,45,00,000 billed for surface patching without deep aggregate base reconstruction; failed within 4 months.",
        significance:
          "Shows earliest indicator that surface-only work could not withstand corridor loads.",
      },
      {
        label: "Repair #2 Record · Aug 2024",
        fact: "৳ 1,30,00,000 emergency monsoon tender issued with no roadside catch-pit drainage installed.",
        significance:
          "Standing stormwater caused rapid washout within 6 weeks, leading directly to a third repair.",
      },
      {
        label: "Budget vs. Inspection · Mar–Jul 2025",
        fact: "৳ 1,90,00,000 re-carpeting exhausted 96.9% of total budget, yet 18+ deep potholes and blocked side drains remained on 2025-07-04.",
        significance:
          "Highlights mismatch between near-total budget consumption and unresolved road usability.",
      },
    ],
    recommendedVerifySteps: [
      "Review geotechnical sub-base core tests and stormwater catch-pit drawings before sanctioning further surface overlays.",
      "Compare BOQ thickness specifications against core-cut asphalt depth logs from the Jan 2024 and Mar 2025 work orders.",
      "Verify defect-liability warranty terms in all three repair work orders to determine re-work responsibility.",
    ],
  },
  "case-drain-02": {
    caseId: "case-drain-02",
    headline:
      "Financial Disbursement Reached 88.0% While Box Culvert Progress Stalled at 40%",
    riskLevel: "HIGH",
    confidenceScore: 89,
    executiveSummary:
      "Simulated project records for the Sector 04 West Storm Drainage & Box Culvert Expansion indicate ৳ 5,72,00,000 (88.0%) of the ৳ 6,50,00,000 budget has been recorded as spent, even though verified physical progress sits at 40% roughly six months past the January 31, 2025 completion target.",
    repairHistoryAnalysis:
      "Prior emergency desilting in Nov 2022 (৳ 62,00,000) offered temporary relief before silt refilled the western outfall. The active Jul 2024–Present culvert chamber package accounts for ৳ 5,10,00,000 in billed mobilization, dewatering, and partial slab placement, leaving northern outlet joints incomplete.",
    delayAnalysis:
      "Awarded on 2024-03-01 with an 11-month schedule ending 2025-01-31, excavation encountered underground utility line clashes in July 2024 and monsoon pump stoppages, pushing the project ~6 months overdue as of July 15, 2025.",
    budgetAnalysis:
      "Disbursing 88.0% of allocated funding (৳ 5,72,00,000) while only 40% of physical milestones are verified leaves just 12.0% (৳ 78,00,000) remaining to finance the remaining 60% of concrete outfall and pump chamber work.",
    inconsistencies: [
      "48 percentage-point gap between reported expenditure (88.0%) and verified physical completion (40%).",
      "Only ৳ 78,00,000 remains in the sanctioned budget to complete the final 60% of box culvert and pump works.",
      "Contractual deadline of 2025-01-31 lapsed ~6 months ago without an updated commissioned handover date.",
    ],
    evidenceCitations: [
      {
        label: "Variation & Dewatering Tranche · 2024-11-20",
        fact: "Reported expenditure climbed to ৳ 5,72,00,000 (88.0%) while precast culvert spans remained half-laid.",
        significance:
          "Documents heavy front-loaded expenditure prior to structural completion.",
      },
      {
        label: "Deadline Breach · 2025-01-31",
        fact: "Contractual handover date passed with northern outlet and pump bay uncommissioned.",
        significance:
          "Confirms formal schedule slippage entering the 2025 monsoon window.",
      },
      {
        label: "Audit Snapshot · 2025-07-15",
        fact: "40% physical progress verified against ৳ 6,50,00,000 total allocation.",
        significance:
          "Raises funding sufficiency questions for remaining unbuilt sections.",
      },
    ],
    recommendedVerifySteps: [
      "Reconcile dewatering and variation order vouchers from Nov 2024 against daily pump logbooks and site measurement books.",
      "Obtain written utility-relocation clearance schedules from affected fiber and water line agencies.",
      "Prepare an engineering cost-to-complete estimate before authorizing any remaining tranche.",
    ],
  },
  "case-light-03": {
    caseId: "case-light-03",
    headline:
      "Delivered 2 Days Ahead of Target and 4.7% Under Budget with 100% Uptime",
    riskLevel: "LOW",
    confidenceScore: 95,
    executiveSummary:
      "Simulated civic records for the Sector 04 Smart LED Streetlight & Underground Grid Corridor show a clean baseline execution: 48 smart LED poles and armored underground conduits were delivered 2 days ahead of the December 20, 2024 deadline at ৳ 1,71,50,000—saving ৳ 8,50,000 (4.7%) below the ৳ 1,80,00,000 budget.",
    repairHistoryAnalysis:
      "A small legacy ballast intervention in Feb 2023 (৳ 9,50,000) exposed chronic overhead wire corrosion and justified transitioning to armored HDPE underground conduits in Oct 2024 (৳ 1,44,00,000) and final photometric balancing in Dec 2024 (৳ 18,00,000), eliminating repeat fault calls.",
    delayAnalysis:
      "Zero schedule overrun recorded. Tender awarded 2024-08-01, trenching completed by 2024-09-10 without roadway closures, energized by 2024-11-22, and formally commissioned on 2024-12-18—two days ahead of 2024-12-20.",
    budgetAnalysis:
      "Cumulative spend across all three logged entries equals ৳ 1,71,50,000 (95.3% of the ৳ 1,80,00,000 allocation), with zero variation claims above BOQ unit rates and ৳ 8,50,000 returned to municipal reserve.",
    inconsistencies: [
      "No material budget, milestone, or timeline inconsistencies detected in the simulated project record.",
    ],
    evidenceCitations: [
      {
        label: "Conduit & Pole Rollout · Oct 2024",
        fact: "৳ 1,44,00,000 covered HDPE ducting and 48 smart LED poles with zero variation claims above BOQ rates.",
        significance:
          "Demonstrates predictable unit-rate adherence during primary construction.",
      },
      {
        label: "Commissioning Record · 2024-12-18",
        fact: "Completed 2 days ahead of 2024-12-20 target with 100% luminaire uptime verified.",
        significance:
          "Confirms alignment between reported schedule and field handover.",
      },
      {
        label: "Reserve Reconciliation · Dec 2024",
        fact: "Final audited spend settled at ৳ 1,71,50,000, returning ৳ 8,50,000 under the ৳ 1,80,00,000 ceiling.",
        significance:
          "Provides a verifiable public-spending benchmark for Sector 04 projects.",
      },
    ],
    recommendedVerifySteps: [
      "Maintain quarterly dusk-to-dawn smart timer telemetry logs to confirm sustained 48/48 luminaire uptime.",
      "Adopt the corridor's pre-trenching utility mapping template for adjacent Sector 04 road and drainage works.",
    ],
  },
};

const INVESTIGATION_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    riskLevel: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    confidenceScore: { type: "integer" },
    executiveSummary: { type: "string" },
    repairHistoryAnalysis: { type: "string" },
    delayAnalysis: { type: "string" },
    budgetAnalysis: { type: "string" },
    inconsistencies: { type: "array", items: { type: "string" } },
    evidenceCitations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          fact: { type: "string" },
          significance: { type: "string" },
        },
        required: ["label", "fact", "significance"],
      },
    },
    recommendedVerifySteps: { type: "array", items: { type: "string" } },
  },
  required: [
    "headline",
    "riskLevel",
    "confidenceScore",
    "executiveSummary",
    "repairHistoryAnalysis",
    "delayAnalysis",
    "budgetAnalysis",
    "inconsistencies",
    "evidenceCitations",
    "recommendedVerifySteps",
  ],
};

function buildFallbackReport(caseId: string): InvestigationReport {
  const base = FALLBACK_REPORTS[caseId] ?? FALLBACK_REPORTS["case-road-01"];
  return {
    ...base,
    caseId,
    source: "demo-fallback",
    model: "Prewritten Civic Demo Engine (No API Key Configured)",
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  let caseId = "";
  try {
    const body = (await request.json()) as { caseId?: unknown };
    caseId = typeof body?.caseId === "string" ? body.caseId.trim() : "";
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const selectedCase = CASES.find((c) => c.id === caseId);
  if (!selectedCase) {
    return NextResponse.json(
      { error: `Unknown caseId "${caseId}".` },
      { status: 404 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(buildFallbackReport(selectedCase.id));
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = [
      "You are CITYTRACE, an objective municipal civic accountability analyst.",
      "Analyze ONLY the structured simulated JSON record provided by the user.",
      "Rules:",
      "1. Never invent dates, costs, contractors, or evidence outside the provided JSON.",
      "2. Never accuse any person or organization of corruption, fraud, bribery, or criminal conduct.",
      "3. Focus objectively on repair history frequency, schedule delays against plannedCompletionDate, and BDT budget vs. reported expenditure alignment.",
      "4. Keep explanations clear, concise, and backed by exact BDT figures and dates from the JSON.",
    ].join(" ");

    const prompt = `Analyze this simulated Dhaka Sector 04 infrastructure case record and return a structured civic investigation JSON:\n\n${JSON.stringify(
      selectedCase,
      null,
      2
    )}`;

    const interaction = await ai.interactions.create({
      model: "gemini-4-hydrogen",
      system_instruction: systemInstruction,
      input: prompt,
      store: false,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: INVESTIGATION_SCHEMA,
      },
    });

    const rawText = interaction.output_text;
    if (!rawText) {
      return NextResponse.json(buildFallbackReport(selectedCase.id));
    }

    const parsed = JSON.parse(rawText) as Omit<
      InvestigationReport,
      "caseId" | "source" | "model" | "generatedAt"
    >;

    if (
      !parsed.headline ||
      !parsed.executiveSummary ||
      !Array.isArray(parsed.evidenceCitations)
    ) {
      return NextResponse.json(buildFallbackReport(selectedCase.id));
    }

    const report: InvestigationReport = {
      caseId: selectedCase.id,
      source: "gemini",
      model: "gemini-4-hydrogen",
      generatedAt: new Date().toISOString(),
      headline: parsed.headline,
      riskLevel: parsed.riskLevel,
      confidenceScore: Math.min(99, Math.max(50, Number(parsed.confidenceScore) || 88)),
      executiveSummary: parsed.executiveSummary,
      repairHistoryAnalysis: parsed.repairHistoryAnalysis,
      delayAnalysis: parsed.delayAnalysis,
      budgetAnalysis: parsed.budgetAnalysis,
      inconsistencies: parsed.inconsistencies ?? [],
      evidenceCitations: parsed.evidenceCitations ?? [],
      recommendedVerifySteps: parsed.recommendedVerifySteps ?? [],
    };

    return NextResponse.json(report);
  } catch (err) {
    console.warn("Gemini investigation fallback triggered:", err);
    return NextResponse.json(buildFallbackReport(selectedCase.id));
  }
}
