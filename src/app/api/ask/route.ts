import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { answerQuestion, buildAskDigest, citationsForRefs, type AskAnswer } from "@/lib/ask";
import { listAllEvidence, listIssues } from "@/lib/issue-store";

/**
 * Civic Q&A endpoint.
 *
 * The rules engine always runs first and produces a grounded answer. Gemini,
 * when configured, is asked to phrase the answer more naturally within the same
 * constraints — and anything it returns is mapped back to real record ids, so
 * it cannot invent citation links.
 */

const ASK_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    recordRefs: { type: "array", items: { type: "string" } },
  },
  required: ["answer"],
} as const;

const SYSTEM_INSTRUCTION = [
  "You are CITYTRACE, a civic accountability analyst answering a member of the public.",
  "You may only use the JSON dataset supplied in the user message.",
  "Rules:",
  "1. Never invent projects, issues, authorities, dates, costs or evidence.",
  "2. Answer in 1 to 3 sentences, using exact BDT figures and ISO dates from the dataset.",
  "3. Never accuse any person or organisation of corruption, fraud or criminal conduct. Describe record inconsistencies only.",
  "4. If the dataset does not contain the answer, say so plainly.",
  "5. List every project or issue id you relied on in recordRefs. Use only ids present in the dataset.",
].join(" ");

export async function POST(request: Request) {
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body?.question === "string" ? body.question.trim().slice(0, 300) : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (question.length < 3) {
    return NextResponse.json(
      { error: "Ask a question of at least 3 characters." },
      { status: 422 }
    );
  }

  const issues = listIssues();
  const allEvidence = listAllEvidence();
  const baseline = answerQuestion(question, issues, allEvidence);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(baseline);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const digest = buildAskDigest(issues);

    const interaction = await ai.interactions.create({
      model: "gemini-4-hydrogen",
      system_instruction: SYSTEM_INSTRUCTION,
      input: `Question: ${question}\n\nDataset:\n${JSON.stringify(digest)}`,
      store: false,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: ASK_SCHEMA,
      },
    });

    const raw = interaction.output_text;
    if (!raw) return NextResponse.json(baseline);

    const parsed = JSON.parse(raw) as { answer?: string; recordRefs?: unknown };
    if (!parsed.answer || parsed.answer.trim().length === 0) {
      return NextResponse.json(baseline);
    }

    const citations = citationsForRefs(parsed.recordRefs, issues);
    const answer: AskAnswer = {
      question,
      answer: parsed.answer.trim(),
      citations: citations.length > 0 ? citations : baseline.citations,
      intent: "gemini",
      source: "gemini",
    };

    return NextResponse.json(answer);
  } catch (error) {
    console.warn("Gemini Q&A unavailable, serving rules-engine answer:", error);
    return NextResponse.json(baseline);
  }
}
