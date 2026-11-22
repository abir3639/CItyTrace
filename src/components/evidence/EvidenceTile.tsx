import { Camera, FileText, Radio, Ruler, Satellite } from "lucide-react";
import type { Evidence, EvidenceKind } from "@/types/citytrace";
import { formatDate } from "@/utils/formatters";

/**
 * Evidence thumbnails.
 *
 * The demo ships no real imagery, so nothing here pretends to be a photograph
 * of a real place. Each tile is a deterministic generated representation of the
 * archived item, labelled as simulated, with the verified state made explicit.
 */

const KIND_META: Record<
  EvidenceKind,
  { label: string; icon: typeof Camera; hue: number }
> = {
  photo: { label: "Photograph", icon: Camera, hue: 196 },
  document: { label: "Document", icon: FileText, hue: 42 },
  measurement: { label: "Measurement", icon: Ruler, hue: 158 },
  satellite: { label: "Satellite tile", icon: Satellite, hue: 220 },
  sensor: { label: "Sensor log", icon: Radio, hue: 268 },
};

/** Stable small hash so the same evidence always renders the same way. */
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
  /** Smaller variant for inspector side panels. */
  compact?: boolean;
}) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const hash = hashOf(item.id);
  const hue = (meta.hue + (hash % 24) - 12 + 360) % 360;
  const shift = 12 + (hash % 18);

  return (
    <figure className="overflow-hidden rounded-lg border border-slate-800 bg-[#08101d]">
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: compact ? "16 / 7" : "16 / 10",
          background: `linear-gradient(135deg, hsl(${hue} 62% 16%) 0%, hsl(${(hue + shift) % 360} 58% 9%) 60%, #060d18 100%)`,
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
        {/* Structural lines that suggest a captured frame, not a fabricated photo. */}
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-cyan-300/25" />
        <div className="absolute inset-y-0 left-1/4 w-px bg-cyan-300/20" />

        <Icon className="absolute right-2.5 bottom-2.5 h-7 w-7 text-white/15" />

        <span className="absolute top-2 left-2 rounded border border-white/15 bg-black/35 px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-[0.1em] text-white/80 uppercase">
          {meta.label}
        </span>

        <span className="absolute top-2 right-2 rounded border border-amber-300/30 bg-black/40 px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-[0.08em] text-amber-200/90 uppercase">
          Simulated
        </span>

        <span
          className={`absolute bottom-2 left-2 rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-[0.06em] uppercase ${
            item.verified
              ? "border border-emerald-400/50 bg-emerald-950/70 text-emerald-200"
              : "border border-amber-400/50 bg-amber-950/70 text-amber-200"
          }`}
        >
          {item.verified ? "Verified" : "Unverified"}
        </span>
      </div>

      <figcaption className={`px-2.5 ${compact ? "py-1.5" : "py-2"}`}>
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-100">
          {item.title}
        </p>
        <p className="mt-0.5 font-mono text-[9px] text-slate-500">
          {item.source} · {formatDate(item.capturedAt)}
          {item.ref ? ` · ${item.ref}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}

/** Grid of evidence tiles with an empty fallback. */
export function EvidenceGallery({
  items,
  compact = false,
}: {
  items: Evidence[];
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-amber-500/30 bg-amber-950/10 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-amber-200/80">
        No evidence has been filed for this record. Nothing here can be
        substantiated from the archive.
      </p>
    );
  }

  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
      {items.map((item) => (
        <EvidenceTile key={item.id} item={item} compact={compact} />
      ))}
    </div>
  );
}
