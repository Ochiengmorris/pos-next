import { cn } from "@/lib/utils";
import { ShopperIcon } from "@/images/shopper-logo";

// Shown where the store name can't be loaded (login, forced password change)
export const DEFAULT_APP_NAME =
  process.env.NEXT_PUBLIC_STORE_NAME || "RAVEZAPOS";
export const APP_NAME = DEFAULT_APP_NAME; // kept so any old import still works

export function Logo({
  name,
  className,
}: {
  name?: string;
  tone?: "dark" | "light"; // accepted so existing <Logo tone="light" /> calls still compile; unused
  className?: string;
}) {
  const label = name?.trim() || DEFAULT_APP_NAME;
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <span className="relative flex items-center text-2xl font-bold tracking-tight text-foreground">
        <span
          className="absolute right-full top-1/2 mr-2 grid size-8 -translate-y-1/2 place-items-center"
          aria-hidden
        >
          <ShopperIcon className="size-6" />
        </span>
        {/* truncate sits on the inner span so it can't clip the icon */}
        <span className="max-w-40 truncate" title={label}>
          {label}
        </span>
      </span>
    </div>
  );
}
