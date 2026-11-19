export type CaseStatus = "Unresolved" | "Delayed" | "Resolved";

export interface RepairRecord {
  id: string;
  date: string;
  summary: string;
  costBdt: number;
  outcome: string;
  contractorNote: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  detail: string;
  kind: "allocated" | "repair" | "delay" | "inspection" | "completed";
}

export interface KeyMetric {
  label: string;
  value: string;
  flag?: "alert" | "warn" | "ok";
}

export interface InfraCase {
  id: string;
  code: string;
  markerLabel: string;
  projectName: string;
  location: string;
  sector: string;
  status: CaseStatus;
  severity: "critical" | "warning" | "nominal";
  coordinates: [number, number, number];
  problemDescription: string;
  authority: string;
  allocatedBudgetBdt: number;
  reportedExpenditureBdt: number;
  plannedCompletionDate: string;
  actualOrCurrentStatusDate: string;
  verifiedProgressPercent: number;
  repairCount: number;
  repairHistory: RepairRecord[];
  timeline: TimelineEvent[];
  keyMetrics: KeyMetric[];
}

export interface EvidenceCitation {
  label: string;
  fact: string;
  significance: string;
}

export interface InvestigationReport {
  caseId: string;
  source: "gemini" | "demo-fallback";
  model: string;
  generatedAt: string;
  headline: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number;
  executiveSummary: string;
  repairHistoryAnalysis: string;
  delayAnalysis: string;
  budgetAnalysis: string;
  inconsistencies: string[];
  evidenceCitations: EvidenceCitation[];
  recommendedVerifySteps: string[];
}
