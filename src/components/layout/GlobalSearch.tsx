"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Compass,
  FolderKanban,
  MapPin,
  PlusCircle,
  Search,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { PROJECTS, SECTORS } from "@/data";
import type { SearchIssue } from "@/lib/search";
import {
  CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/types/citytrace";
import {
  issueStatusTone,
  projectStatusTone,
  type Tone,
} from "@/utils/formatters";

type ResultKind = "issue" | "project" | "sector" | "action";

interface SearchResult {
  key: string;
  kind: ResultKind;
  code: string;
  title: string;
  subtitle: string;
  href: string;
  tone: Tone;
}

const KIND_LABEL: Record<ResultKind, string> = {
  issue: "Civic Issue",
  project: "Project",
  sector: "Sector",
  action: "Quick Action",
};

const QUICK_ACTIONS: SearchResult[] = [
  {
    key: "action:city-explorer",
    kind: "action",
    code: "3D MAP",
    title: "Explore 3D Dhaka",
    subtitle: "Inspect streets, 3D corridors, and live status pins",
    href: "/city-explorer",
    tone: "info",
  },
  {
    key: "action:report-issue",
    kind: "action",
    code: "REPORT",
    title: "Report a Civic Issue",
    subtitle: "Log a new citizen report directly on the district register",
    href: "/civic-issues/report",
    tone: "warn",
  },
  {
    key: "action:money-tracker",
    kind: "action",
    code: "LEDGER",
    title: "Public Money Tracker",
    subtitle: "Compare sanctioned allocation, reported spend & agency scorecards",
    href: "/money-tracker",
    tone: "ok",
  },
  {
    key: "action:ai-investigation",
    kind: "action",
    code: "AUDIT",
    title: "AI Investigation Engine",
    subtitle: "Run evidence-bound discrepancy audits across public works",
    href: "/ai-investigation",
    tone: "info",
  },
];

const FEATURED_CODES = ["CT-DH-R01", "CT-ISS-003", "CT-DH-W06"] as const;

function buildIndex(issues: SearchIssue[]): SearchResult[] {
  return [
    ...PROJECTS.map<SearchResult>((project) => ({
      key: `project:${project.id}`,
      kind: "project",
      code: project.code,
      title: project.name,
      subtitle: `${project.location} · ${PROJECT_STATUS_LABELS[project.status]} · ${CATEGORY_LABELS[project.category]}`,
      href: `/public-projects/${project.id}`,
      tone: projectStatusTone(project.status),
    })),
    ...issues.map<SearchResult>((issue) => ({
      key: `issue:${issue.id}`,
      kind: "issue",
      code: issue.code,
      title: issue.title,
      subtitle: `${issue.location} · ${ISSUE_STATUS_LABELS[issue.status]} · ${CATEGORY_LABELS[issue.category]}`,
      href: `/civic-issues/${issue.id}`,
      tone: issueStatusTone(issue.status),
    })),
    ...SECTORS.map<SearchResult>((sector) => ({
      key: `sector:${sector.id}`,
      kind: "sector",
      code: sector.code,
      title: `${sector.name} — ${sector.ward}`,
      subtitle: `${sector.populationEstimate.toLocaleString("en-IN")} residents`,
      href: `/civic-issues?sector=${sector.id}`,
      tone: "info",
    })),
  ];
}

function searchResults(index: SearchResult[], query: string): SearchResult[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return index
    .filter((entry) => {
      const haystack = `${entry.code} ${entry.title} ${entry.subtitle}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    })
    .slice(0, 12);
}

const KIND_ICON: Record<ResultKind, typeof AlertTriangle> = {
  issue: AlertTriangle,
  project: FolderKanban,
  sector: MapPin,
  action: Compass,
};

function ActionIcon({ item }: { item: SearchResult }) {
  if (item.key === "action:report-issue") return <PlusCircle className="h-3.5 w-3.5" />;
  if (item.key === "action:money-tracker") return <Wallet className="h-3.5 w-3.5" />;
  if (item.key === "action:ai-investigation") return <Sparkles className="h-3.5 w-3.5" />;
  const Icon = KIND_ICON[item.kind];
  return <Icon className="h-3.5 w-3.5" />;
}

export default function GlobalSearch({ issues }: { issues: SearchIssue[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const index = useMemo(() => buildIndex(issues), [issues]);
  const featured = useMemo(() => {
    const matched = FEATURED_CODES.map((code) => index.find((entry) => entry.code === code)).filter(
      (entry): entry is SearchResult => entry !== undefined
    );
    return matched.length > 0 ? matched : index.slice(0, 3);
  }, [index]);

  const isEmptyQuery = query.trim().length === 0;
  const results = useMemo(() => searchResults(index, query), [index, query]);
  const spotlightItems = useMemo(
    () => (isEmptyQuery ? [...QUICK_ACTIONS, ...featured] : results),
    [isEmptyQuery, featured, results]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  const go = (result: SearchResult) => {
    close();
    router.push(result.href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (spotlightItems.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => (idx + 1) % spotlightItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) => (idx - 1 + spotlightItems.length) % spotlightItems.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = spotlightItems[activeIndex];
      if (chosen) go(chosen);
    }
  };

  const renderResultButton = (result: SearchResult, idx: number) => {
    const active = idx === activeIndex;
    return (
      <li key={result.key}>
        <button
          type="button"
          role="option"
          aria-selected={active}
          onMouseEnter={() => setActiveIndex(idx)}
          onClick={() => go(result)}
          className={`flex w-full items-start gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
            active ? "bg-[#007AFF]/[0.10]" : "hover:bg-black/[0.04]"
          }`}
        >
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              active ? "bg-[#007AFF] text-white" : "bg-black/[0.05] text-[#6E6E73]"
            }`}
          >
            <ActionIcon item={result} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-[#0055CC] tabular-nums">
                {result.code}
              </span>
              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-[#6E6E73]">
                {KIND_LABEL[result.kind]}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[13.5px] font-semibold text-[#1D1D1F]">
              {result.title}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-[#6E6E73]">
              {result.subtitle}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex h-9 items-center gap-2 rounded-full border border-black/[0.08] bg-white/85 px-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:bg-white sm:w-64 cursor-pointer"
        aria-label="Search projects, issues and sectors"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-[#86868B] group-hover:text-[#007AFF]" />
        <span className="hidden flex-1 truncate text-[13px] text-[#6E6E73] sm:inline">
          Search records…
        </span>
        <kbd className="hidden shrink-0 rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-medium text-[#6E6E73] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/28 p-4 pt-[12vh] backdrop-blur-[6px]"
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="ct-glass ct-fade-up w-full max-w-xl overflow-hidden rounded-[22px]">
            <div className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-[#007AFF]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search by project, civic issue, code, or sector…"
                aria-label="Search query"
                className="w-full bg-transparent text-[15px] text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none"
              />
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-full p-1.5 text-[#6E6E73] transition-colors hover:bg-black/[0.06] hover:text-[#1D1D1F] cursor-pointer"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="ct-scroll max-h-[54vh] overflow-y-auto p-2">
              {isEmptyQuery ? (
                <div className="space-y-2.5" role="listbox" aria-label="Quick navigation and featured cases">
                  <div>
                    <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#86868B]">
                      Quick navigation
                    </p>
                    <ul className="space-y-0.5">
                      {QUICK_ACTIONS.map((item, idx) => renderResultButton(item, idx))}
                    </ul>
                  </div>
                  <div>
                    <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#86868B]">
                      Featured records ({index.length} total indexed)
                    </p>
                    <ul className="space-y-0.5">
                      {featured.map((item, idx) =>
                        renderResultButton(item, QUICK_ACTIONS.length + idx)
                      )}
                    </ul>
                  </div>
                </div>
              ) : results.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-[#6E6E73]">
                  No record matches “{query.trim()}”.
                </p>
              ) : (
                <ul role="listbox" aria-label="Search results" className="space-y-0.5">
                  {results.map((result, idx) => renderResultButton(result, idx))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] bg-black/[0.02] px-4 py-2 text-[11.5px] text-[#6E6E73]">
              <span className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10.5px] font-medium text-[#1D1D1F]">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10.5px] font-medium text-[#1D1D1F]">
                    ↵
                  </kbd>
                  Open
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10.5px] font-medium text-[#1D1D1F]">
                    Esc
                  </kbd>
                  Close
                </span>
              </span>
              <span className="tabular-nums">
                {!isEmptyQuery && results.length > 0
                  ? `${results.length} match${results.length === 1 ? "" : "es"}`
                  : `${index.length} records`}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
