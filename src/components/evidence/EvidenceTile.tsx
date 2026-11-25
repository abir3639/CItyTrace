import { Camera, FileText, Radio, Ruler, Satellite } from "lucide-react";
import type { Evidence, EvidenceKind } from "@/types/citytrace";
import { formatDate } from "@/utils/formatters";

/**
 * Evidence thumbnails.
 *
 * Each tile is a clean architectural placeholder (or uploaded citizen image)
 * with explicit Simulated and Verified / Unverified state pills.
 */

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

export function evidenceKindLabel(kind: EvidenceKind): string {
  return KIND_META[kind].label;
}

export function EvidenceTile({
  item,
  compact = false,
}: {
  item: Evidence;
  /** Smaller variant for floating inspector panels. */
  compact?: boolean;
}) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const hash = hashOf(item.id);
  const hue = (meta.hue + (hash % 18) - 9 + 360) % 360;

  return (
    <figure className="overflow-hidden rounded-[14px] border border-black/[0.06] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: compact ? "16 / 7" : "16 / 10",
          background: `linear-gradient(135deg var(--in-oklab), hsl(${hue} 45% 94%) 0%, hsl(${(hue + 12) % 360} 38% 89%) 100%)`,
        }}
        aria-hidden={item.dataUrl ? undefined : true}
      >
        {item.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.dataUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {/* Subtle architectural blueprint lines */}
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:20px_20px]" />

        <Icon className="absolute right-2.5 bottom-2.5 h-6 w-6 text-[#1D1D1F]/15" />

        <span className="absolute top-2 left-2 rounded-full border border-black/[0.07] bg-white/88 px-2 py-0.5 text-[10px] font-medium text-[#1D1D1F] backdrop-blur-sm">
          {meta.label}
        </span>

        <span className="absolute top-2 right-2 rounded-full border border-black/[0.06] bg-white/80 px-2 py-0.5 text-[10px] font-medium text-[#6E6E73] backdrop-blur-sm">
          Simulated
        </span>

        <span
          className={`absolute bottom-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
            item.verified
              ? "border-[#34C759]/25 bg-white/92 text-[#1A7F37]"
              : "border-[#FF9500]/30 bg-white/92 text-[#B25000]"
          }`}
        >
          {item.verified ? "Verified" : "Unverified"}
        </span>
      </div>

      <figcaption className={`px-3 ${compact ? "py-2" : "py-2.5"}`}>
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#1D1D1F]">
          {item.title}
        </p>
        <p className="mt-0.5 text-[11px] text-[#6E6E73] tabular-nums">
          {item.source} · {formatDate(item.capturedAt)}
          {item.ref ? ` · ${item.ref}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}

/** Grid of evidence tiles with a calm empty fallback. */
export function EvidenceGallery({
  items,
  compact = false,
}: {
  items: Evidence[];
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-[14px] border border-[#FF9500]/25 bg-[#FF9500]/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-[#B25000]">
        No evidence has been filed for this record yet.
      </p>
    );
  }

  return (
    <div className={`grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
      {items.map((item) => (
        <EvidenceTile key={item.id} item={item} compact={compact} />
      ))}
    </div>
  );
}
