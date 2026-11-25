import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F5F5F7] px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#007AFF] shadow-sm border border-black/[0.06]">
        <Compass className="h-7 w-7" />
      </span>
      <div>
        <p className="text-[12.5px] font-medium text-[#007AFF]">404 · Not found</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.025em] text-[#1D1D1F]">
          This route does not exist
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-[#6E6E73]">
          The page you requested is not part of the CityTrace platform. Return to the overview to
          explore the six civic modules.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-[#007AFF] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-[#0066D6]"
      >
        Return to overview
      </Link>
    </div>
  );
}
