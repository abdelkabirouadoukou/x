/**
 * The official Stardance mark ships in pale cream/pastel tones meant to sit on a dark
 * or colorful backdrop — on this site's light background it was reading as almost
 * blank white-on-white. Rather than touch Hack Club's artwork, we give it the dark
 * "night sky" stage it was designed for, plus a couple of hand-placed sparkles and a
 * slow-drifting star field so it reads as a badge, not a stray image tag.
 */
export function StardanceBadge({
  variant = "chip",
  className = "",
}: {
  variant?: "chip" | "inline";
  className?: string;
}) {
  const img = (
    <img
      src="/_x/image?url=https%3A%2F%2Fstardance.hackclub.com%2Fassets%2Flanding%2Fheader%2Fstardance-logo-df399a7f.png"
      alt="Stardance — Hack Club"
      className={variant === "chip" ? "relative z-10 h-4 w-auto" : "relative z-10 h-3 w-auto"}
    />
  );

  return (
    <span
      className={`stardance-stage relative inline-flex items-center overflow-hidden rounded-md ${
        variant === "chip" ? "px-2.5 py-1.5" : "px-1.5 py-1"
      } ${className}`}
    >
      <span className="stardance-sparkle stardance-sparkle-a" />
      <span className="stardance-sparkle stardance-sparkle-b" />
      {variant === "chip" && <span className="stardance-sparkle stardance-sparkle-c" />}
      {img}
    </span>
  );
}
