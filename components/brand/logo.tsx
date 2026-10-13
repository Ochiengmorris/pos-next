// components/brand/logo.tsx
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export const APP_NAME = "Shopper";

export function Logo({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-accent shadow-sm">
        <ShoppingBag className="size-5" aria-hidden />
      </span>
      <span
        className={cn(
          "text-2xl font-semibold tracking-tight",
          tone === "light" ? "text-foreground" : "text-foreground",
        )}
      >
        {APP_NAME}
      </span>
    </div>
  );
}
