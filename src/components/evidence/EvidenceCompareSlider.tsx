"use client";

import { useMemo, useState } from "react";
import { Camera, FileText, MoveHorizontal, Radio, Ruler, Satellite } from "lucide-react";
import type { Evidence, EvidenceKind } from "@/types/citytrace";
import { formatDate } from "@/utils/formatters";

const KIND_META: Record<
  EvidenceKind,
  { label: string; icon: typeof Camera; hue: number }
> = {
  photo: { label: "Photograph", icon: Camera, hue: 211 },
  document: { label: "Document", icon: FileText, hue: 36 },
  measurement: { label: "Measurement", icon: Ruler, hue: 145 },
  satellite: { label: "Satellite tile", icon: Satellite, hue: 224 },
  sensor: { label: "Sensor log", icon: Radio, hue: 262 },
};

function hashOf(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100_000;
  }
  return hash;
}

function CompareLayer({ item, side }: { item: Evidence; side: "Before" | "After" }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const hue = (meta.hue + (hashOf(item.id) % 18) - 9 + 360) % 360;

  return (
    <div
      className="relative h-full w-full select-none"
      style={{
        background: `linear-gradient(135deg var(--in-oklab), hsl(${hue} 42% 94%) 0%, hsl(${(hue + 14) % 360} 36% 88%) 100%)`,
      }}
    >
      {item.dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.dataUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:20px_20px]" />

      <div
        className={`absolute bottom-3 max-w-[44%] rounded-2xl border border-black/[0.08] bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md ${
          side === "Before" ? "left-3 text-left" : "right-3 text-right"
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-1.5 ${
            side === "After" ? "justify-end" : "justify-start"
          }`}
        >
          <span className="rounded-full bg-[#1D1D1F] px-2 py-0.5 text-[10px] font-semibold text-white">
            {side}
          </span>
          <span className="text-[10.5px] font-medium text-[#6E6E73] tabular-nums">
            {formatDate(item.capturedAt)}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#1D1D1F]">
          {item.title}
        </p>
        <p
          className={`mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-medium ${
            item.verified ? "text-[#1A7F37]" : "text-[#B25000]"
          }`}
        >
          <Icon className="h-3 w-3" />
          {meta.label} · {item.verified ? "Verified" : "Unverified"}
        </p>
      </div>
    </div>
  );
}

export default function EvidenceCompareSlider({ items }: { items: Evidence[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)),
    [items]
  );

  const [beforeId, setBeforeId] = useState<string>(() => sorted[0]?.id ?? "");
  const [afterId, setAfterId] = useState<string>(() => sorted[sorted.length - 1]?.id ?? "");
  const [split, setSplit] = useState(50);

  if (sorted.length < 2) return null;

  const beforeItem = sorted.find((item) => item.id === beforeId) ?? sorted[0];
  const afterItem = sorted.find((item) => item.id === afterId) ?? sorted[sorted.length - 1];

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-black/[0.06] bg-[#F9FAFB] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-[#1D1D1F]">
          Before &amp; After Timeline Comparison
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <label className="flex items-center gap-1.5 text-[#6E6E73]">
            Before:
            <select
              value={beforeItem.id}
              onChange={(event) => setBeforeId(event.target.value)}
              className="rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none cursor-pointer"
            >
              {sorted.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatDate(item.capturedAt)} · {item.title.slice(0, 26)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[#6E6E73]">
            After:
            <select
              value={afterItem.id}
              onChange={(event) => setAfterId(event.target.value)}
              className="rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none cursor-pointer"
            >
              {sorted.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatDate(item.capturedAt)} · {item.title.slice(0, 26)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="relative aspect-[16/7] min-h-[168px] w-full overflow-hidden rounded-[14px] border border-black/[0.08] bg-white">
        <CompareLayer item={afterItem} side="After" />

        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <CompareLayer item={beforeItem} side="Before" />
        </div>

        {/* Glass divider line + handle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(15,23,42,0.35)]"
          style={{ left: `${split}%` }}
        >
          <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.1] bg-white/95 text-[#1D1D1F] shadow-md backdrop-blur-md">
            <MoveHorizontal className="h-4 w-4 text-[#007AFF]" />
          </span>
        </div>

        <input
          type="range"
          min={5}
          max={95}
          value={split}
          onChange={(event) => setSplit(Number(event.target.value))}
          aria-label="Compare before and after evidence"
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
    </div>
  );
}
