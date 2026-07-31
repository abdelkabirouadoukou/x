/**
 * The x mark: two routes crossing at a waypoint. It's a literal crossroads —
 * "x marks the spot" — standing in for the framework's core idea, a file path
 * resolving to a route. The dot is the resolved point; the two lines are the
 * paths that lead to it.
 */
export function Logo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <title>x</title>
      <path d="M4 4L20 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M20 4L4 20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
