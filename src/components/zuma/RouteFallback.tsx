// Shown briefly while a lazy-loaded route chunk is fetched.
// No spinner: a quiet, layout-stable placeholder that matches the
// site's existing archival/document aesthetic instead of a generic loader.
export const RouteFallback = () => (
  <div className="min-h-screen pt-40 px-6 md:px-10" aria-hidden>
    <div className="max-w-[1200px] mx-auto animate-pulse">
      <div className="h-3 w-40 bg-muted mb-10" />
      <div className="grid grid-cols-2 gap-4 max-w-[600px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="aspect-[3/4] bg-muted" />
            <div className="h-3 w-3/4 bg-muted mt-2" />
            <div className="h-2 w-1/3 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
