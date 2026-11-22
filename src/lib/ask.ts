import { ISSUES, PROJECTS, SECTORS } from "@/data";
import type { Issue, IssueCategory, Project, Sector } from "@/types/citytrace";
import { CATEGORY_LABELS, ISSUE_CATEGORIES, ISSUE_STATUS_LABELS } from "@/types/citytrace";
import {
  clusterByLocation,
  getBlockedProjects,
  getBudgetTotals,
  getCategoryStats,
  getCivicHealth,
  getEvidenceCoverage,
  getProjectOverdueDays,
  getSectorStats,
} from "./stats";
import { formatBdtCompact, formatDate, formatPercent } from "@/utils/formatters";

/**
 * Civic question answering.
 *
 * Answers are assembled from the dataset by intent — every figure is read from
 * a stored record, and every claim carries citations back to those records.
 * This runs without any API key, and doubles as the fallback when Gemini is
 * unavailable.
 */

export interface AskCitation {
  label: string;
  href: string;
}

export interface AskAnswer {
  question: string;
  answer: string;
  citations: AskCitation[];
  intent: string;
  source: "rules" | "gemini";
}

export const SUGGESTED_QUESTIONS: string[] = [
  "Why has the link road been repaired three times?",
  "Which projects are delayed in Canal West?",
  "How much money was allocated to drainage projects?",
  "Which sector has the most unresolved issues?",
  "Which projects are missing verified spending?",
];

/* ------------------------------------------------------------------ */
/* Citations                                                           */
/* ------------------------------------------------------------------ */

export function projectCitation(project: Project): AskCitation {
  return { label: `${project.code} · ${project.name}`, href: `/public-projects/${project.id}` };
}

export function issueCitation(issue: Issue): AskCitation {
  return { label: `${issue.code} · ${issue.title}`, href: `/civic-issues/${issue.id}` };
}

export function sectorCitation(sector: Sector): AskCitation {
  return { label: `${sector.code} · ${sector.name}`, href: `/civic-issues?sector=${sector.id}` };
}

/** Resolves AI-supplied record ids into real links, dropping anything unknown. */
export function citationsForRefs(refs: unknown): AskCitation[] {
  if (!Array.isArray(refs)) return [];
  const citations: AskCitation[] = [];
  for (const raw of refs) {
    if (typeof raw !== "string") continue;
    const project = PROJECTS.find((item) => item.id === raw);
    if (project) {
      citations.push(projectCitation(project));
      continue;
    }
    const issue = ISSUES.find((item) => item.id === raw);
    if (issue) citations.push(issueCitation(issue));
  }
  return citations.slice(0, 6);
}

/* ------------------------------------------------------------------ */
/* Intent detection                                                    */
/* ------------------------------------------------------------------ */

function detectSector(question: string): Sector | undefined {
  return SECTORS.find(
    (sector) =>
      question.includes(sector.name.toLowerCase()) ||
      question.includes(sector.ward.toLowerCase()) ||
      new RegExp(`\\b${sector.code.toLowerCase()}\\b`).test(question)
  );
}

function detectCategory(question: string): IssueCategory | undefined {
  return ISSUE_CATEGORIES.find(
    (category) =>
      question.includes(category.replace("-", " ")) ||
      question.includes(CATEGORY_LABELS[category].toLowerCase())
  );
}

/* ------------------------------------------------------------------ */
/* Answer builders                                                     */
/* ------------------------------------------------------------------ */

/** Words that carry no location signal when matching a question to a place. */
const LOCATION_STOPWORDS = new Set([
  "why", "has", "have", "been", "this", "that", "which", "with", "from", "they",
  "what", "were", "there", "repaired", "repair", "again", "three", "times",
  "twice", "still", "about", "does", "many", "much", "most", "show", "shows",
  "problem", "problems", "issue", "issues", "project", "projects", "location",
  "locations", "same", "spot", "area", "district", "money", "spent", "spend",
  "work", "works", "been", "over",
]);

/**
 * Narrows recurrence clusters to the place the question actually names.
 * Returns null when no cluster is a clear match, so the caller can fall back
 * to the district-wide answer.
 */
function narrowToAskedLocation(question: string, clusters: Issue[][]): Issue[] | null {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !LOCATION_STOPWORDS.has(word));
  if (words.length === 0) return null;

  const scored = clusters
    .map((group) => {
      const location = group[group.length - 1].location.toLowerCase();
      return {
        group,
        score: words.reduce((total, word) => total + (location.includes(word) ? 1 : 0), 0),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].group;
}

function answerRecurrence(question: string, issues: Issue[], sector?: Sector): AskAnswer {
  const clusters = [...clusterByLocation(issues).values()]
    .filter((group) => group.length > 1)
    .filter((group) => group.some((issue) => issue.status !== "resolved"))
    .filter((group) => !sector || group.some((issue) => issue.sectorId === sector.id));

  if (clusters.length === 0) {
    return {
      question,
      intent: "recurrence",
      source: "rules",
      answer: sector
        ? `No location in ${sector.name} currently has more than one report on file.`
        : "No location in the district currently has repeat reports on file.",
      citations: [],
    };
  }

  // If the question names a place, answer about that place rather than the
  // district as a whole.
  const narrowed = narrowToAskedLocation(question, clusters);
  const candidates: Issue[][] = narrowed ? [narrowed] : clusters;
  const ranked = [...candidates].sort(
    (a, b) =>
      b.reduce((sum, issue) => sum + issue.reportCount, 0) -
      a.reduce((sum, issue) => sum + issue.reportCount, 0)
  );

  const top = narrowed ? ranked : ranked.slice(0, 3);
  const sentences = top.map((group) => {
    const latest = group[group.length - 1];
    const reports = group.reduce((sum, issue) => sum + issue.reportCount, 0);
    return `${group.length} separate issues have been filed at ${latest.location}, drawing ${reports} citizen reports in total — the latest (${latest.code}) is currently ${ISSUE_STATUS_LABELS[latest.status].toLowerCase()}`;
  });

  return {
    question,
    intent: "recurrence",
    source: "rules",
    answer:
      `${top.length === 1 ? "One location shows" : `${top.length} locations show`} a repeat failure pattern. ` +
      `${sentences.join(". ")}. ` +
      "A repeated failure means the earlier intervention did not address the underlying cause — but it is not by itself evidence of any wrongdoing.",
    citations: top.flatMap((group) => group.slice(-2).map(issueCitation)).slice(0, 6),
  };
}

function answerDelay(question: string, sector?: Sector): AskAnswer {
  const blocked = getBlockedProjects().filter(
    (project) => !sector || project.sectorId === sector.id
  );

  if (blocked.length === 0) {
    return {
      question,
      intent: "delay",
      source: "rules",
      answer: sector
        ? `No sanctioned work in ${sector.name} is currently behind its contracted date.`
        : "No sanctioned work is currently behind its contracted date.",
      citations: [],
    };
  }

  const top = blocked.slice(0, 3);
  const detail = top.map((project) => {
    const spend =
      project.allocatedBudgetBdt > 0
        ? (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100
        : 0;
    return `${project.code} is ${getProjectOverdueDays(project)} days past its ${formatDate(
      project.plannedCompletionDate
    )} deadline with ${formatPercent(spend, 0)} of its budget reported spent`;
  });

  return {
    question,
    intent: "delay",
    source: "rules",
    answer:
      `${blocked.length} sanctioned ${blocked.length === 1 ? "work is" : "works are"} behind schedule${
        sector ? ` in ${sector.name}` : " across the district"
      }. ${detail.join("; ")}.`,
    citations: top.map(projectCitation),
  };
}

function answerMoney(question: string, issues: Issue[], category?: IssueCategory): AskAnswer {
  if (category) {
    const stats = getCategoryStats(issues).find((row) => row.category === category);
    const projects = PROJECTS.filter((project) => project.category === category);
    const label = CATEGORY_LABELS[category];

    if (!stats || projects.length === 0) {
      return {
        question,
        intent: "money",
        source: "rules",
        answer: `No ${label.toLowerCase()} project is recorded in this dataset.`,
        citations: [],
      };
    }

    const reportedPct =
      stats.allocatedBdt > 0 ? (stats.reportedBdt / stats.allocatedBdt) * 100 : 0;

    return {
      question,
      intent: "money",
      source: "rules",
      answer:
        `${label} works carry ${formatBdtCompact(stats.allocatedBdt)} across ${projects.length} ` +
        `${projects.length === 1 ? "project" : "projects"}, of which ${formatBdtCompact(
          stats.reportedBdt
        )} is reported as spent (${formatPercent(reportedPct, 0)}). ` +
        `${stats.openIssues} open civic issues are recorded in this category.`,
      citations: projects.map(projectCitation).slice(0, 5),
    };
  }

  const totals = getBudgetTotals();

  return {
    question,
    intent: "money",
    source: "rules",
    answer:
      `The district has ${formatBdtCompact(totals.allocatedBdt)} sanctioned across ` +
      `${totals.projectsTotal} works. ${formatBdtCompact(totals.reportedBdt)} is reported as spent ` +
      `(${formatPercent(totals.reportedUtilisationPercent, 0)} of allocation), but only ` +
      `${formatBdtCompact(totals.verifiedBdt)} is backed by independent verification — leaving ` +
      `${formatBdtCompact(totals.unverifiedBdt)} unverified.`,
    citations: PROJECTS.slice(0, 4).map(projectCitation),
  };
}

function answerEvidence(question: string, issues: Issue[]): AskAnswer {
  const coverage = getEvidenceCoverage(issues);
  const missing = coverage.projectsMissingVerifiedSpend;

  return {
    question,
    intent: "evidence",
    source: "rules",
    answer:
      `${missing.length} of ${coverage.projectsTotal} works report spending with no independent ` +
      `financial verification on file (${missing.map((project) => project.code).join(", ")}). ` +
      `The archive holds ${coverage.evidenceTotal} evidence items, of which ` +
      `${formatPercent(coverage.verifiedPercent, 0)} are verified, and ` +
      `${coverage.issuesWithoutEvidence} of ${coverage.issuesTotal} civic issues carry no evidence at all.`,
    citations: [...missing.map(projectCitation), ...issues.slice(0, 2).map(issueCitation)].slice(0, 6),
  };
}

function answerSectors(question: string, issues: Issue[]): AskAnswer {
  const stats = getSectorStats(issues);
  const top = stats.slice(0, 3);

  return {
    question,
    intent: "sectors",
    source: "rules",
    answer:
      `${top[0].sector.name} (${top[0].sector.code}) carries the most unresolved issues — ` +
      `${top[0].openIssues} of ${top[0].issueCount} records, including ${top[0].recurringClusters} ` +
      `location${top[0].recurringClusters === 1 ? "" : "s"} with repeat reports. ` +
      `${top[1].sector.name} and ${top[2].sector.name} follow with ${top[1].openIssues} and ${top[2].openIssues} open issues.`,
    citations: top.map((row) => sectorCitation(row.sector)),
  };
}

function answerSectorProjects(question: string, sector: Sector): AskAnswer {
  const projects = PROJECTS.filter((project) => project.sectorId === sector.id);

  return {
    question,
    intent: "sector-projects",
    source: "rules",
    answer:
      `${sector.name} (${sector.ward}) has ${projects.length} sanctioned ` +
      `${projects.length === 1 ? "work" : "works"}: ` +
      `${projects
        .map(
          (project) =>
            `${project.code} (${project.status}, ${formatPercent(
              project.allocatedBudgetBdt > 0
                ? (project.reportedExpenditureBdt / project.allocatedBudgetBdt) * 100
                : 0,
              0
            )} spent)`
        )
        .join("; ")}.`,
    citations: projects.map(projectCitation),
  };
}

function answerOverview(question: string, issues: Issue[]): AskAnswer {
  const health = getCivicHealth(issues);

  return {
    question,
    intent: "overview",
    source: "rules",
    answer:
      `The district currently has ${health.openIssues} open civic issues out of ${health.totalIssues} ` +
      `records, ${health.recurringClusters} locations with repeat reports, and ${health.delayedProjects} ` +
      `works behind schedule. Try asking about recurring problems, delays, budgets by category, ` +
      `a specific sector, or missing evidence.`,
    citations: [],
  };
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const RECURRENCE = /(recurr|repeat|again|repaired|repair|returned|same (spot|place)|pothole)/;
const DELAY = /(delay|late|overdue|behind|slip|missed)/;
const MONEY = /(budget|allocat|spend|spent|money|cost|taka|bdt|crore|lakh|expensive)/;
const EVIDENCE = /(missing|evidence|verif|proof|document|paperwork)/;
const RANKING = /(most|worst|highest|top|neighbourhood|neighborhood)/;
const PROJECTS_WORD = /(project|work|scheme|contract)/;

export function answerQuestion(question: string, issues: Issue[] = ISSUES): AskAnswer {
  const q = question.toLowerCase().trim();
  const sector = detectSector(q);
  const category = detectCategory(q);

  if (RECURRENCE.test(q)) return answerRecurrence(question, issues, sector);
  if (EVIDENCE.test(q)) return answerEvidence(question, issues);
  if (DELAY.test(q)) return answerDelay(question, sector);
  if (MONEY.test(q)) return answerMoney(question, issues, category);
  if (RANKING.test(q) && /(issue|problem)/.test(q)) return answerSectors(question, issues);
  if (sector && PROJECTS_WORD.test(q)) return answerSectorProjects(question, sector);
  if (sector && /(issue|problem|report)/.test(q)) return answerSectors(question, issues);
  if (RANKING.test(q)) return answerSectors(question, issues);
  if (PROJECTS_WORD.test(q) && sector) return answerSectorProjects(question, sector);

  return answerOverview(question, issues);
}

/* ------------------------------------------------------------------ */
/* Prompt context for Gemini                                           */
/* ------------------------------------------------------------------ */

/** Compact digest of the dataset so Gemini can answer without inventing data. */
export function buildAskDigest(issues: Issue[] = ISSUES) {
  const totals = getBudgetTotals();
  return {
    snapshotDate: "2025-07-22",
    budget: {
      allocatedBdt: totals.allocatedBdt,
      reportedBdt: totals.reportedBdt,
      verifiedBdt: totals.verifiedBdt,
      unverifiedBdt: totals.unverifiedBdt,
    },
    sectors: SECTORS.map((sector) => ({
      id: sector.id,
      code: sector.code,
      name: sector.name,
      ward: sector.ward,
      populationEstimate: sector.populationEstimate,
    })),
    projects: PROJECTS.map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      sectorId: project.sectorId,
      category: project.category,
      authority: project.authority,
      status: project.status,
      allocatedBudgetBdt: project.allocatedBudgetBdt,
      reportedExpenditureBdt: project.reportedExpenditureBdt,
      verifiedExpenditureBdt: project.verifiedExpenditureBdt ?? null,
      verifiedProgressPercent: project.verifiedProgressPercent,
      plannedCompletionDate: project.plannedCompletionDate,
      overdueDays: getProjectOverdueDays(project),
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      code: issue.code,
      title: issue.title,
      category: issue.category,
      sectorId: issue.sectorId,
      location: issue.location,
      locationKey: issue.locationKey,
      status: issue.status,
      severity: issue.severity,
      reportedAt: issue.reportedAt,
      reportCount: issue.reportCount,
      projectId: issue.projectId ?? null,
    })),
  };
}
