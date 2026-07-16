// A single placeholder block with a soft shimmer sweep (see .skeleton-shimmer
// in index.css). Pass it a className with the exact size/shape of the real
// element it stands in for — that's what keeps the layout stable once the
// real content arrives.
export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton-shimmer ${className}`} aria-hidden />
);
