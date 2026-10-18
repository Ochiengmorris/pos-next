import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export const APP_NAME = "KhonaMart";

export function Logo({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <span
        className={cn(
          "relative text-2xl font-semibold tracking-tight",
          tone === "light" ? "text-foreground" : "text-foreground",
        )}
      >
        {APP_NAME}
        <span
          className="absolute right-full top-1/2 mr-3 grid size-8 -translate-y-1/2 place-items-center rounded-xl bg-accent shadow-sm"
          aria-hidden
        >
          <ShoppingBag className="size-4" />
        </span>
      </span>
    </div>
  );
}
