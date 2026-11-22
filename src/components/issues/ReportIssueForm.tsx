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
    "w-full rounded-lg border border-slate-800 bg-[#07101d] px-2.5 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Issue title *
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Deep pothole blocking the left lane"
            className={fieldClasses}
          />
          {errors.title ? (
            <span className="text-[10px] text-red-300">{errors.title}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Category *
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as IssueCategory)}
            className={fieldClasses}
          >
            {ISSUE_CATEGORIES.map((value) => (
              <option key={value} value={value} className="bg-[#07101d]">
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          {errors.category ? (
            <span className="text-[10px] text-red-300">{errors.category}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Sector *
          </span>
          <select
            value={sectorId}
            onChange={(event) => setSectorId(event.target.value)}
            className={fieldClasses}
          >
            {SECTORS.map((sector) => (
              <option key={sector.id} value={sector.id} className="bg-[#07101d]">
                {sector.code} — {sector.name} ({sector.ward})
              </option>
            ))}
          </select>
          {errors.sectorId ? (
            <span className="text-[10px] text-red-300">{errors.sectorId}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Street or landmark *
          </span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={200}
            placeholder="e.g. Begum Rokeya Sarani Link Road, near the junction"
            className={fieldClasses}
          />
          {errors.location ? (
            <span className="text-[10px] text-red-300">{errors.location}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            What is wrong? *
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Describe what you can see, how long it has been like this, and who it affects."
            className={`${fieldClasses} resize-y`}
          />
          <span className="flex items-center justify-between font-mono text-[9px] text-slate-500">
            <span>{errors.description ? <span className="text-red-300">{errors.description}</span> : "Be specific — this becomes the permanent record."}</span>
            <span>{description.length}/2000</span>
          </span>
        </label>
      </div>

      {/* Photo attachment */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Photograph (optional)
        </span>

        {photo ? (
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#08101d] p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.dataUrl}
              alt="Attached photograph preview"
              className="h-20 w-32 shrink-0 rounded border border-slate-700 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-slate-100">{photo.name}</p>
              <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                Stored with the report as unverified citizen evidence.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-1.5 inline-flex items-center gap-1 rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:border-red-400/50 hover:text-red-200 cursor-pointer"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-4 font-mono text-[11px] text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-200">
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
          <span className="text-[10px] text-red-300">{errors.photo}</span>
        ) : null}
      </div>

      {formError ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-red-500/40 bg-red-950/30 px-2.5 py-2 text-[11px] text-red-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <p className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Reports are permanent — they cannot be deleted, only updated.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/civic-issues"
            className="rounded-lg border border-slate-700 px-3 py-2 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/60 bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 font-mono text-[11px] font-bold tracking-wider text-slate-950 uppercase shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
