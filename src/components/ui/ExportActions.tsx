"use client";

import { Download, Printer } from "lucide-react";

export interface LedgerExportRow {
  code: string;
  name: string;
  sector: string;
  category: string;
  authority: string;
  status: string;
  allocatedBdt: number;
  reportedBdt: number;
  verifiedBdt: number | null;
  verifiedProgressPercent: number;
  overdueDays: number;
  linkedIssuesCount: number;
}

function escapeCsvCell(value: string | number | null): string {
  if (value === null) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function LedgerCsvExportButton({ rows }: { rows: LedgerExportRow[] }) {
  const handleDownload = () => {
    const headers = [
      "Code",
      "Project",
      "Sector",
      "Category",
      "Authority",
      "Status",
      "Allocated BDT",
      "Reported BDT",
      "Verified BDT",
      "Verified Progress %",
      "Overdue Days",
      "Linked Issues",
    ];
    const lines = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((row) =>
        [
          row.code,
          row.name,
          row.sector,
          row.category,
          row.authority,
          row.status,
          row.allocatedBdt,
          row.reportedBdt,
          row.verifiedBdt === null ? "Missing verification" : row.verifiedBdt,
          row.verifiedProgressPercent,
          row.overdueDays,
          row.linkedIssuesCount,
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];

    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "citytrace-public-money-ledger.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="print-hidden inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] shadow-xs transition-colors hover:bg-[#F5F5F7] cursor-pointer active:scale-[0.98]"
    >
      <Download className="h-3.5 w-3.5 text-[#007AFF]" />
      Export CSV
    </button>
  );
}

export function PrintDossierButton({ label = "Export PDF / Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hidden inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] shadow-xs transition-colors hover:bg-[#F5F5F7] cursor-pointer active:scale-[0.98]"
    >
      <Printer className="h-3.5 w-3.5 text-[#007AFF]" />
      {label}
    </button>
  );
}
