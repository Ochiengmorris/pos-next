import type { SVGProps } from "react";

/**
 * Shopper smiling-bag icon, on the Ledger palette.
 * Usage: <ShopperIcon className="size-8" />
 * Colours follow the theme tokens, so light and dark both work.
 * Override with `body`, `ink` (outline + handle) or `face` if needed.
 */
export function ShopperIcon({
  body = "var(--primary)",
  ink = "var(--foreground)",
  face = "var(--primary-foreground)",
  ...props
}: SVGProps<SVGSVGElement> & { body?: string; ink?: string; face?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Shopper"
      {...props}
    >
      <path
        d="M22 28V20a10 10 0 0 1 20 0v8"
        stroke={ink}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x={7}
        y={24}
        width={50}
        height={34}
        rx={9}
        fill={body}
        stroke={ink}
        strokeWidth={4}
      />
      <circle cx={24.5} cy={38} r={2.8} fill={face} />
      <circle cx={39.5} cy={38} r={2.8} fill={face} />
      <path
        d="M23 46q9 8 18 0"
        stroke={face}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
