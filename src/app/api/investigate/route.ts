import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { analyzeProject, buildPromptContext } from "@/lib/analysis";
import { listAllEvidence, listIssues } from "@/lib/issue-store";
import type { InvestigationReport } from "@/types/citytrace";

/**
 * AI investigation endpoint.
 *
 * Order of operations on purpose:
 *  1. Validate the request and resolve the record.
 *  2. Compute the deterministic rules-engine baseline.
 *  3. If a Gemini key is configured, ask Gemini to write the narrative within
 *     the same schema. Any failure falls back to the baseline.
 *
 * The API key never leaves the server, and the client always receives a
 * schema-shaped report.
 */

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
          recordRefs: { type: "array", items: { type: "string" } },
        },
        required: ["label", "fact", "significance"],
      },
    },
    recommendedVerifySteps: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
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
} as const;

const SYSTEM_INSTRUCTION = [
  "You are CITYTRACE, an objective municipal civic accountability analyst.",
  "Analyse ONLY the structured simulated record supplied by the user.",
  "Rules:",
  "1. Never invent dates, costs, contractors, authorities, or evidence outside the supplied JSON.",
  "2. Never accuse any person or organisation of corruption, fraud, bribery or criminal conduct.",
  "3. Frame every anomaly as an observation that requires verification, not as a finding of wrongdoing.",
  "4. Distinguish clearly between allocated budget, reported expenditure and independently verified expenditure. If verified expenditure is null, say that verification is missing — never treat reported spend as confirmed.",
  "5. Cite exact BDT figures and ISO dates from the JSON in every analysis paragraph.",
  "6. When you reference a record, include its id in evidenceCitations[].recordRefs.",
  "7. If the record lacks information needed for a conclusion, list it in missingInformation.",
].join(" ");

export async function POST(request: Request) {
  let projectId = "";
  try {
    const body = (await request.json()) as { projectId?: unknown };
    projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const issues = await listIssues();
  const allEvidence = await listAllEvidence();

  const baseline = analyzeProject(projectId, issues, allEvidence);
  if (!baseline) {
    return NextResponse.json(
      { error: `Unknown projectId "${projectId}".` },
      { status: 404 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(baseline);
  }

  const context = buildPromptContext(projectId, issues, allEvidence);
  if (!context) {
    return NextResponse.json(baseline);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const interaction = await ai.interactions.create({
      model: "gemini-4-hydrogen",
      system_instruction: SYSTEM_INSTRUCTION,
      input: `Analyse this simulated Dhaka civic infrastructure record and return the structured investigation JSON.\n\n${JSON.stringify(
        context,
        null,
        2
      )}`,
      store: false,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: INVESTIGATION_SCHEMA,
      },
    });

    const rawText = interaction.output_text;
    if (!rawText) {
      return NextResponse.json(baseline);
    }

    const parsed = JSON.parse(rawText) as Omit<
      InvestigationReport,
      "caseId" | "source" | "model" | "generatedAt"
    >;

    if (!parsed.headline || !parsed.executiveSummary || !Array.isArray(parsed.evidenceCitations)) {
      return NextResponse.json(baseline);
    }

    const report: InvestigationReport = {
      caseId: projectId,
      source: "gemini",
      model: "gemini-4-hydrogen",
      generatedAt: new Date().toISOString(),
      headline: parsed.headline,
      riskLevel: parsed.riskLevel ?? baseline.riskLevel,
      confidenceScore: Math.min(
        96,
        Math.max(50, Number(parsed.confidenceScore) || baseline.confidenceScore)
      ),
      executiveSummary: parsed.executiveSummary,
      repairHistoryAnalysis: parsed.repairHistoryAnalysis || baseline.repairHistoryAnalysis,
      delayAnalysis: parsed.delayAnalysis || baseline.delayAnalysis,
      budgetAnalysis: parsed.budgetAnalysis || baseline.budgetAnalysis,
      inconsistencies:
        Array.isArray(parsed.inconsistencies) && parsed.inconsistencies.length > 0
          ? parsed.inconsistencies
          : baseline.inconsistencies,
      evidenceCitations:
        Array.isArray(parsed.evidenceCitations) && parsed.evidenceCitations.length > 0
          ? parsed.evidenceCitations
          : baseline.evidenceCitations,
      recommendedVerifySteps:
        Array.isArray(parsed.recommendedVerifySteps) && parsed.recommendedVerifySteps.length > 0
          ? parsed.recommendedVerifySteps
          : baseline.recommendedVerifySteps,
      missingInformation:
        Array.isArray(parsed.missingInformation) && parsed.missingInformation.length > 0
          ? parsed.missingInformation
          : baseline.missingInformation,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.warn("Gemini investigation unavailable, serving rules-engine report:", error);
    return NextResponse.json(baseline);
  }
}
