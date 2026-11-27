import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Users } from "lucide-react";

const TRUST_POINTS = [
  {
    icon: Users,
    title: "Named Civic Complaints",
    detail: "Every street report credits the resident or verifier who filed it.",
  },
  {
    icon: CheckCircle2,
    title: "Transparent One-Vote Confirmations",
    detail: "See exactly who verified an unresolved hazard on site — no duplicate ballots.",
  },
  {
    icon: ShieldCheck,
    title: "Permanent Audit Accountability",
    detail: "Status changes record both the municipal actor and individual identity.",
  },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F5F7]">
      {/* Ambient Liquid Glass colour washes */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-28 -left-24 h-[420px] w-[420px] rounded-full bg-[#007AFF]/[0.14] blur-[90px]" />
        <div className="absolute top-[42%] right-[-8%] h-[360px] w-[360px] rounded-full bg-[#34C759]/[0.11] blur-[90px]" />
        <div className="absolute -bottom-24 left-[22%] h-[340px] w-[340px] rounded-full bg-[#FF9500]/[0.11] blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1180px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/85 px-3.5 py-1.5 text-[13px] font-medium text-[#1D1D1F] shadow-2xs backdrop-blur-md transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#007AFF]" />
            Back to CityTrace
          </Link>

          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#007AFF] text-white shadow-[0_2px_8px_-2px_rgba(0,122,255,0.45)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
                <path
                  d="M12 3.5L19.5 7.75V16.25L12 20.5L4.5 16.25V7.75L12 3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.75" fill="currentColor" />
              </svg>
            </span>
            <span className="text-[16px] font-semibold tracking-[-0.025em] text-[#1D1D1F]">
              CityTrace
            </span>
          </Link>
        </header>

        <div className="my-auto grid grid-cols-1 items-center gap-8 py-8 lg:grid-cols-12 lg:gap-10">
          <section className="flex flex-col gap-5 lg:col-span-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#007AFF]/20 bg-[#007AFF]/[0.08] px-3 py-1 text-[12px] font-semibold text-[#0055CC]">
              Dhaka Civic Accountability Network
            </div>
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] leading-[1.15] text-[#1D1D1F] sm:text-[34px]">
              Public issues deserve real voices, never anonymous black holes.
            </h2>
            <p className="text-[14.5px] leading-relaxed text-[#6E6E73]">
              CityTrace connects Dhaka neighbourhoods, 3D infrastructure corridors, and municipal
              budgets to verified citizen participation.
            </p>

            <ul className="mt-1 space-y-3">
              {TRUST_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="flex items-start gap-3 rounded-[18px] border border-white/80 bg-white/65 p-3.5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] backdrop-blur-md"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#007AFF]/[0.1] text-[#007AFF]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#1D1D1F]">{item.title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-[#6E6E73]">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <main className="lg:col-span-7">{children}</main>
        </div>

        <footer className="pt-2 text-center text-[12px] text-[#86868B]">
          Simulated demonstration environment · Passwords are hashed locally with scrypt.
        </footer>
      </div>
    </div>
  );
}
