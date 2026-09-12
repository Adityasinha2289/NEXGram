/**
 * Loading states with the shape of the thing that is loading.
 *
 * A centred spinner tells the user something is happening and nothing else, then
 * the page snaps into a completely different height when the data lands. These
 * hold the layout still and show roughly what is coming.
 */
export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** A stand-in for a block of prose, with a short last line like real text. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

/** A list of rows, each a title over a caption. */
export function SkeletonList({ rows = 4, className = '' }) {
  return (
    <div className={`panel divide-y divide-border ${className}`} role="status" aria-label="Load ho raha hai">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5" style={{ width: `${64 - i * 6}%` }} />
            <Skeleton className="h-2.5" style={{ width: `${44 - i * 4}%` }} />
          </div>
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** The shape of a dashboard: a heading, a panel of figures, then two sections. */
export function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Load ho raha hai">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-[55%] max-w-[320px]" />
        <Skeleton className="h-3.5 w-[75%] max-w-[420px]" />
      </div>
      <div className="panel grid grid-cols-3 gap-px overflow-hidden bg-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2 bg-surface px-4 py-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <SkeletonList rows={3} />
    </div>
  );
}
