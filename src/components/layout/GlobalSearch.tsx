"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FolderKanban, MapPin, Search, X } from "lucide-react";
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

type ResultKind = "issue" | "project" | "sector";

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
};

/**
 * Built on the client from the server-supplied issue list (so citizen reports
 * are searchable) plus the static project and sector records.
 */
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
};

export default function GlobalSearch({ issues }: { issues: SearchIssue[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const index = useMemo(() => buildIndex(issues), [issues]);
  const results = useMemo(() => searchResults(index, query), [index, query]);

  // Global keyboard shortcut: ⌘K / Ctrl+K
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

  // Focus the field and lock background scroll while the palette is open.
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
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = results[activeIndex];
      if (chosen) go(chosen);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex w-full items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-left transition-colors hover:border-cyan-400/50 hover:bg-slate-900 sm:w-64 cursor-pointer"
        aria-label="Search projects, issues and sectors"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-cyan-300" />
        <span className="flex-1 truncate font-mono text-[11px] text-slate-400">
          Search civic records…
        </span>
        <kbd className="hidden shrink-0 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#02060d]/80 p-4 pt-[12vh] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="ct-panel ct-panel-glow ct-fade-up w-full max-w-2xl overflow-hidden rounded-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-cyan-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search by project name, issue, code, sector or location…"
                aria-label="Search query"
                className="w-full bg-transparent font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="ct-scroll max-h-[52vh] overflow-y-auto p-2">
              {query.trim().length === 0 ? (
                <p className="px-3 py-6 text-center font-mono text-[11px] text-slate-500">
                  Search {index.length} records — projects, civic issues and
                  sectors.
                </p>
              ) : results.length === 0 ? (
                <p className="px-3 py-6 text-center font-mono text-[11px] text-slate-500">
                  No record matches “{query.trim()}”.
                </p>
              ) : (
                <ul role="listbox" aria-label="Search results">
                  {results.map((result, index) => {
                    const Icon = KIND_ICON[result.kind];
                    const active = index === activeIndex;
                    return (
                      <li key={result.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => go(result)}
                          className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                            active ? "bg-cyan-500/15 ring-1 ring-cyan-400/40" : "hover:bg-slate-800/60"
                          }`}
                        >
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[10px] font-semibold text-cyan-300">
                                {result.code}
                              </span>
                              <span className="rounded border border-slate-700 px-1 font-mono text-[9px] text-slate-400 uppercase">
                                {KIND_LABEL[result.kind]}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-100">
                              {result.title}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
                              {result.subtitle}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-3 py-1.5 font-mono text-[10px] text-slate-500">
              <span>↑ ↓ to move · ↵ to open · esc to close</span>
              <span>{results.length > 0 ? `${results.length} match${results.length === 1 ? "" : "es"}` : ""}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
