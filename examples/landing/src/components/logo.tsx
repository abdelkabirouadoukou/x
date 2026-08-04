/**
 * The x mark: two routes crossing at a waypoint — "x marks the spot."
 * In the monochrome observatory world this is the beacon: a resolved point
 * ringed by the two paths that lead to it, drawn with a diamond-white sheen
 * and a pure white instrument dot.
 */
export function Logo({ className = "h-5 w-5" }: { className?: string }) {
  return <img src="/favicon.ico" alt="x logo" className={className} />;
}
