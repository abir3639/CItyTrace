/**
 * Shared loading skeleton for route segments that take a moment to render
 * (the 3D scene, the anomaly sweep, the chart-heavy ledger).
 *
 * It deliberately lives on leaf routes rather than the group layout: a loading
 * boundary above a dynamic route causes the response to flush before
 * `notFound()` resolves, which turns a genuine 404 into a 200.
 */
export default function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <div className="ct-skeleton h-2.5 w-28 rounded-full" />
        <div className="ct-skeleton h-6 w-72 max-w-full rounded-lg" />
        <div className="ct-skeleton h-2.5 w-full max-w-2xl rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ct-panel flex flex-col gap-2 rounded-xl px-4 py-3.5">
            <div className="ct-skeleton h-2.5 w-24 rounded-full" />
            <div className="ct-skeleton h-6 w-16 rounded-lg" />
            <div className="ct-skeleton h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="ct-panel flex flex-col gap-3 rounded-xl p-4 xl:col-span-2">
          <div className="ct-skeleton h-2.5 w-40 rounded-full" />
          <div className="ct-skeleton h-16 w-full rounded-lg" />
          <div className="ct-skeleton h-2.5 w-full rounded-full" />
          <div className="ct-skeleton h-2.5 w-4/5 rounded-full" />
        </div>
        <div className="ct-panel flex flex-col gap-3 rounded-xl p-4">
          <div className="ct-skeleton h-2.5 w-32 rounded-full" />
          <div className="ct-skeleton h-20 w-full rounded-lg" />
          <div className="ct-skeleton h-2.5 w-full rounded-full" />
        </div>
      </div>

      <span className="sr-only">Loading civic records…</span>
    </div>
  );
}
