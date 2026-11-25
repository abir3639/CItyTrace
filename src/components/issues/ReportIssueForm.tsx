"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Camera, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { SECTORS } from "@/data";
import {
  CATEGORY_LABELS,
  ISSUE_CATEGORIES,
  type IssueCategory,
} from "@/types/citytrace";

const MAX_FILE_BYTES = 1_500_000;

const CORRIDOR_PRESETS: {
  label: string;
  location: string;
  sectorId: string;
  locationKey: string;
}[] = [
  {
    label: "Begum Rokeya Link Road",
    location: "Begum Rokeya Sarani Link Road, junction approach",
    sectorId: "S04",
    locationKey: "begum-rokeya-sarani-junction",
  },
  {
    label: "Canal West blocks A–D",
    location: "Canal West blocks A–D",
    sectorId: "S02",
    locationKey: "west-canal-outfall",
  },
  {
    label: "Market Lane, North Gate",
    location: "Market Lane, North Gate",
    sectorId: "S07",
    locationKey: "north-gate-market-lane",
  },
  {
    label: "Civic Core Intersection",
    location: "Civic Core Main Intersection, Ward 12",
    sectorId: "S06",
    locationKey: "civic-core-junction",
  },
];

interface FieldErrors {
  title?: string;
  description?: string;
  location?: string;
  sectorId?: string;
  category?: string;
  photo?: string;
}

export default function ReportIssueForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<IssueCategory>("road");
  const [sectorId, setSectorId] = useState(SECTORS[0].id);
  const [location, setLocation] = useState("");
  const [locationKey, setLocationKey] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<{ name: string; dataUrl: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const onPickFile = (file: File | null) => {
    setErrors((previous) => ({ ...previous, photo: undefined }));
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((previous) => ({ ...previous, photo: "Choose an image file." }));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrors((previous) => ({
        ...previous,
        photo: "That image is larger than 1.5 MB. Choose a smaller file.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto({ name: file.name, dataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          sectorId,
          location,
          locationKey,
          description,
          photoDataUrl: photo?.dataUrl,
        }),
      });

      const payload = (await response.json()) as {
        issue?: { id: string };
        error?: string;
        fields?: FieldErrors;
      };

      if (!response.ok || !payload.issue) {
        setErrors(payload.fields ?? {});
        setFormError(payload.error ?? `Submission failed with HTTP ${response.status}.`);
        return;
      }

      router.push(`/civic-issues/${payload.issue.id}`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Network error while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClasses =
    "w-full rounded-[12px] border border-black/[0.08] bg-[#F5F5F7] px-3.5 py-2.5 text-[13.5px] text-[#1D1D1F] placeholder:text-[#86868B] transition-colors focus:border-[#007AFF] focus:bg-white focus:outline-none";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="issue-title" className="text-[12.5px] font-medium text-[#1D1D1F]">
            Issue title *
          </label>
          <input
            id="issue-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Deep pothole blocking the left lane"
            className={fieldClasses}
          />
          {errors.title ? (
            <span className="text-[12px] text-[#C9241B]">{errors.title}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="issue-category" className="text-[12.5px] font-medium text-[#1D1D1F]">
            Category *
          </label>
          <select
            id="issue-category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value as IssueCategory)}
            className={fieldClasses}
          >
            {ISSUE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          {errors.category ? (
            <span className="text-[12px] text-[#C9241B]">{errors.category}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="issue-sector" className="text-[12.5px] font-medium text-[#1D1D1F]">
            Sector *
          </label>
          <select
            id="issue-sector"
            required
            value={sectorId}
            onChange={(event) => setSectorId(event.target.value)}
            className={fieldClasses}
          >
            {SECTORS.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.code} — {sector.name} ({sector.ward})
              </option>
            ))}
          </select>
          {errors.sectorId ? (
            <span className="text-[12px] text-[#C9241B]">{errors.sectorId}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="issue-location" className="text-[12.5px] font-medium text-[#1D1D1F]">
            Street or landmark *
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-[#6E6E73]">Quick select:</span>
            {CORRIDOR_PRESETS.map((preset) => {
              const active = locationKey === preset.locationKey;
              return (
                <button
                  key={preset.locationKey}
                  type="button"
                  onClick={() => {
                    setLocation(preset.location);
                    setSectorId(preset.sectorId);
                    setLocationKey(preset.locationKey);
                  }}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-[#1D1D1F] text-white"
                      : "bg-[#F0F2F5] text-[#48484A] hover:bg-black/[0.08]"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <input
            id="issue-location"
            required
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
              setLocationKey(undefined);
            }}
            maxLength={200}
            placeholder="e.g. Begum Rokeya Sarani Link Road, near the junction"
            className={fieldClasses}
          />
          {errors.location ? (
            <span className="text-[12px] text-[#C9241B]">{errors.location}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="issue-description" className="text-[12.5px] font-medium text-[#1D1D1F]">
            Description *
          </label>
          <textarea
            id="issue-description"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Describe what you observe, how long it has persisted, and who it affects."
            className={`${fieldClasses} resize-y`}
          />
          <span className="flex items-center justify-between text-[12px] text-[#6E6E73]">
            <span>
              {errors.description ? (
                <span className="text-[#C9241B]">{errors.description}</span>
              ) : (
                "Be specific — this becomes part of the permanent civic record."
              )}
            </span>
            <span className="tabular-nums">{description.length}/2000</span>
          </span>
        </div>
      </div>

      {/* Photo attachment */}
      <div className="flex flex-col gap-2">
        <span className="text-[12.5px] font-medium text-[#1D1D1F]">
          Photograph (optional)
        </span>

        {photo ? (
          <div className="flex items-start gap-3 rounded-[14px] border border-black/[0.06] bg-[#F5F5F7] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.dataUrl}
              alt="Attached photograph preview"
              className="h-20 w-32 shrink-0 rounded-xl border border-black/[0.08] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#1D1D1F]">{photo.name}</p>
              <p className="mt-0.5 text-[12px] text-[#6E6E73]">
                Stored with the report as unverified citizen evidence.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#1D1D1F] shadow-sm hover:text-[#C9241B] cursor-pointer"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed border-black/[0.14] bg-[#F5F5F7]/70 px-4 py-5 text-[13px] font-medium text-[#6E6E73] transition-colors hover:border-[#007AFF]/50 hover:text-[#007AFF]">
            <Camera className="h-4 w-4" />
            Attach a photograph (JPG or PNG, max 1.5 MB)
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
            />
          </label>
        )}
        {errors.photo ? (
          <span className="text-[12px] text-[#C9241B]">{errors.photo}</span>
        ) : null}
      </div>

      {formError ? (
        <p className="flex items-start gap-2 rounded-[14px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.08] px-3.5 py-2.5 text-[13px] text-[#C9241B]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
        <p className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#34C759]" />
          Reports are permanent — updates append rather than overwrite.
        </p>
        <div className="flex items-center gap-2.5">
          <Link
            href="/civic-issues"
            className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)] transition-all hover:bg-[#0066D6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Submit report
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
