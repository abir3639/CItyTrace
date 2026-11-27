"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { SECTORS } from "@/data";
import { safeNextPath } from "@/lib/auth-helpers";
import { DEPARTMENTS } from "@/lib/departments";
import type { PublicUser, UserRole } from "@/types/citytrace";
import { RolePill, UserAvatar } from "@/components/ui/UserAvatar";
import SignOutButton from "./SignOutButton";

const ROLE_OPTIONS: {
  value: UserRole;
  title: string;
  subtitle: string;
  icon: typeof Users;
}[] = [
  {
    value: "citizen",
    title: "Citizen",
    subtitle: "File reports & verify local issues",
    icon: Users,
  },
  {
    value: "verifier",
    title: "Civic Verifier",
    subtitle: "Inspect evidence & confirm repairs",
    icon: ShieldCheck,
  },
  {
    value: "official",
    title: "Municipal Official",
    subtitle: "Respond & update work status",
    icon: Building2,
  },
];

const DEMO_ACCOUNTS: {
  email: string;
  name: string;
  initials: string;
  color: string;
  role: UserRole;
  sectorLabel: string;
}[] = [
  {
    email: "farhana@citytrace.demo",
    name: "Farhana Rahman",
    initials: "FR",
    color: "#007AFF",
    role: "citizen",
    sectorLabel: "S04 · Citizen",
  },
  {
    email: "nusrat@citytrace.demo",
    name: "Nusrat Jahan",
    initials: "NJ",
    color: "#AF52DE",
    role: "verifier",
    sectorLabel: "S06 · Verifier",
  },
  {
    email: "mahmudul@citytrace.demo",
    name: "Engr. Mahmudul Hasan",
    initials: "MH",
    color: "#FF9500",
    role: "official",
    sectorLabel: "Roads & Safety",
  },
  {
    email: "rafiqul@citytrace.demo",
    name: "Engr. Rafiqul Islam",
    initials: "RI",
    color: "#E67E22",
    role: "official",
    sectorLabel: "Drainage & Water",
  },
];

function passwordStrength(password: string): {
  level: 0 | 1 | 2 | 3;
  label: string;
  color: string;
} {
  if (!password) return { level: 0, label: "", color: "bg-black/[0.08]" };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password)) score += 1;
  if (score <= 1) return { level: 1, label: "Weak", color: "bg-[#FF3B30]" };
  if (score === 2) return { level: 2, label: "Fair", color: "bg-[#FF9500]" };
  return { level: 3, label: "Strong", color: "bg-[#34C759]" };
}

export default function AuthForm({
  mode,
  initialNext,
  currentUser,
}: {
  mode: "login" | "register";
  initialNext?: string;
  currentUser: PublicUser | null;
}) {
  const router = useRouter();
  const nextHref = safeNextPath(initialNext, mode === "register" ? "/profile" : "/");
  const nextQuery = initialNext ? `?next=${encodeURIComponent(safeNextPath(initialNext))}` : "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("citizen");
  const [sectorId, setSectorId] = useState(SECTORS[0].id);
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0].id);

  const [submitting, setSubmitting] = useState(false);
  const [demoBusyEmail, setDemoBusyEmail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (currentUser) {
    return (
      <div className="ct-glass ct-fade-up rounded-[26px] p-6 sm:p-8">
        <div className="flex items-center gap-3.5 border-b border-black/[0.06] pb-5">
          <UserAvatar
            initials={currentUser.initials}
            color={currentUser.avatarColor}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[17px] font-semibold text-[#1D1D1F]">
                {currentUser.name}
              </p>
              <RolePill role={currentUser.role} />
            </div>
            <p className="mt-0.5 truncate text-[13px] text-[#6E6E73]">
              {currentUser.email}
            </p>
          </div>
        </div>

        <p className="mt-5 text-[14px] leading-relaxed text-[#48484A]">
          Your civic session is active. Every complaint you file, confirmation vote you cast,
          and status note you submit is attributed to your public identity.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(0,122,255,0.5)] transition-all hover:bg-[#0066D6] active:scale-[0.98]"
          >
            <UserCheck className="h-4 w-4" />
            Open My Profile
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2.5 text-[13.5px] font-medium text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7]"
          >
            Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <SignOutButton label="Switch account" />
        </div>
      </div>
    );
  }

  const strength = passwordStrength(password);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : {
              name,
              email,
              password,
              role,
              sectorId,
              ...(role === "official" ? { departmentId } : {}),
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as {
        user?: PublicUser;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok || !payload.user) {
        setFieldErrors(payload.fields ?? {});
        setFormError(payload.error ?? `Request failed with HTTP ${response.status}.`);
        return;
      }

      router.push(nextHref);
      router.refresh();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const signInDemo = async (demoEmail: string) => {
    setDemoBusyEmail(demoEmail);
    setFormError(null);
    setFieldErrors({});
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "citytrace123" }),
      });
      const payload = (await response.json()) as { user?: PublicUser; error?: string };
      if (!response.ok || !payload.user) {
        setFormError(payload.error ?? "Demo sign-in failed.");
        return;
      }
      router.push(safeNextPath(initialNext, "/"));
      router.refresh();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      setDemoBusyEmail(null);
    }
  };

  const inputClasses =
    "w-full rounded-[13px] border border-black/[0.08] bg-[#F5F5F7]/90 px-3.5 py-2.5 text-[14px] text-[#1D1D1F] placeholder:text-[#86868B] transition-all focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#007AFF]/12";

  return (
    <div className="ct-glass ct-fade-up rounded-[28px] p-6 sm:p-8">
      {/* Mode switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="ct-segmented">
          <Link
            href={`/login${nextQuery}`}
            aria-current={mode === "login" ? "page" : undefined}
            className="ct-segmented-item px-4"
          >
            Sign in
          </Link>
          <Link
            href={`/register${nextQuery}`}
            aria-current={mode === "register" ? "page" : undefined}
            className="ct-segmented-item px-4"
          >
            Create account
          </Link>
        </div>
        <span className="hidden text-[11.5px] font-medium text-[#6E6E73] sm:inline">
          Attributed civic access
        </span>
      </div>

      <div className="mt-5">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
          {mode === "login" ? "Welcome back" : "Join the Civic Register"}
        </h1>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#6E6E73]">
          {mode === "login"
            ? "Sign in so your complaints, site confirmations, and timeline updates show under your name."
            : "Create a public civic identity so every complaint, confirmation vote, and audit entry stays transparent."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        {mode === "register" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-name" className="text-[12.5px] font-medium text-[#1D1D1F]">
              Full name *
            </label>
            <input
              id="auth-name"
              type="text"
              required
              autoComplete="name"
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Amina Karim"
              className={inputClasses}
            />
            {fieldErrors.name ? (
              <span className="text-[12px] text-[#C9241B]">{fieldErrors.name}</span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-[12.5px] font-medium text-[#1D1D1F]">
            Email address *
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className={inputClasses}
          />
          {fieldErrors.email ? (
            <span className="text-[12px] text-[#C9241B]">{fieldErrors.email}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-[12.5px] font-medium text-[#1D1D1F]">
            Password *
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "register" ? 6 : 1}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "register" ? "At least 6 characters" : "Enter your password"}
              className={`${inputClasses} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1.5 text-[#6E6E73] transition-colors hover:bg-black/[0.06] hover:text-[#1D1D1F] cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {mode === "register" && password.length > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="grid flex-1 grid-cols-3 gap-1">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`h-1 rounded-full transition-colors ${
                      strength.level >= step ? strength.color : "bg-black/[0.08]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-[#6E6E73]">{strength.label}</span>
            </div>
          ) : null}

          {fieldErrors.password ? (
            <span className="text-[12px] text-[#C9241B]">{fieldErrors.password}</span>
          ) : null}
        </div>

        {mode === "register" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-[#1D1D1F]">Civic role</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ROLE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      aria-pressed={active}
                      className={`flex flex-col items-start rounded-[14px] border p-3 text-left transition-all cursor-pointer ${
                        active
                          ? "border-[#007AFF] bg-[#007AFF]/[0.08] shadow-[0_2px_10px_-4px_rgba(0,122,255,0.3)]"
                          : "border-black/[0.07] bg-white/75 hover:border-black/[0.15] hover:bg-white"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? "text-[#007AFF]" : "text-[#6E6E73]"}`}
                      />
                      <span className="mt-1.5 text-[12.5px] font-semibold text-[#1D1D1F]">
                        {option.title}
                      </span>
                      <span className="mt-0.5 text-[11px] leading-snug text-[#6E6E73]">
                        {option.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-sector" className="text-[12.5px] font-medium text-[#1D1D1F]">
                Home sector
              </label>
              <select
                id="auth-sector"
                value={sectorId}
                onChange={(event) => setSectorId(event.target.value)}
                className={inputClasses}
              >
                {SECTORS.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.code} — {sector.name} ({sector.ward})
                  </option>
                ))}
              </select>
            </div>

            {role === "official" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-dept" className="text-[12.5px] font-medium text-[#1D1D1F]">
                  Authorized department
                </label>
                <select
                  id="auth-dept"
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  className={inputClasses}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.code} — {dept.shortName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        ) : null}

        {formError ? (
          <p className="flex items-start gap-2 rounded-[14px] border border-[#FF3B30]/20 bg-[#FF3B30]/[0.08] px-3.5 py-2.5 text-[13px] text-[#C9241B]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || demoBusyEmail !== null}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_18px_-4px_rgba(0,122,255,0.5)] transition-all hover:bg-[#0066D6] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "login" ? "Signing in…" : "Creating account…"}
            </>
          ) : (
            <>
              {mode === "login" ? "Sign in to CityTrace" : "Create Civic Account"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {mode === "login" ? (
        <div className="mt-6 border-t border-black/[0.06] pt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1D1D1F]">
              <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
              Quick Demo Access
            </p>
            <span className="text-[11px] text-[#6E6E73] tabular-nums">
              Pass: citytrace123
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((demo) => {
              const busy = demoBusyEmail === demo.email;
              return (
                <button
                  key={demo.email}
                  type="button"
                  disabled={submitting || demoBusyEmail !== null}
                  onClick={() => void signInDemo(demo.email)}
                  className="group flex items-center gap-2.5 rounded-[14px] border border-black/[0.07] bg-white/85 px-3 py-2.5 text-left transition-all hover:-translate-y-[1px] hover:border-[#007AFF]/30 hover:bg-white hover:shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  <UserAvatar
                    initials={demo.initials}
                    color={demo.color}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold text-[#1D1D1F]">
                        {demo.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <RolePill role={demo.role} />
                      <span className="truncate text-[10.5px] text-[#6E6E73]">
                        {demo.sectorLabel}
                      </span>
                    </div>
                  </div>
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#007AFF]" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#86868B] transition-transform group-hover:translate-x-0.5 group-hover:text-[#007AFF]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
