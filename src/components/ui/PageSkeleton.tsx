/**
 * Shared loading skeleton for route segments.
 */
export default function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <div className="ct-skeleton h-3 w-28 rounded-full" />
        <div className="ct-skeleton h-7 w-72 max-w-full rounded-xl" />
        <div className="ct-skeleton h-3.5 w-full max-w-xl rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ct-surface flex flex-col gap-3 rounded-[20px] p-5">
            <div className="ct-skeleton h-3 w-24 rounded-full" />
            <div className="ct-skeleton h-7 w-20 rounded-lg" />
            <div className="ct-skeleton h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="ct-surface flex flex-col gap-3 rounded-[20px] p-5 xl:col-span-2">
          <div className="ct-skeleton h-3.5 w-40 rounded-full" />
          <div className="ct-skeleton h-24 w-full rounded-2xl" />
          <div className="ct-skeleton h-3 w-full rounded-full" />
          <div className="ct-skeleton h-3 w-4/5 rounded-full" />
        </div>
        <div className="ct-surface flex flex-col gap-3 rounded-[20px] p-5">
          <div className="ct-skeleton h-3.5 w-32 rounded-full" />
          <div className="ct-skeleton h-28 w-full rounded-2xl" />
          <div className="ct-skeleton h-3 w-full rounded-full" />
        </div>
      </div>

      <span className="sr-only">Loading civic records…</span>
    </div>
  );
}
