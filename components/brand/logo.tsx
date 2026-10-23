import { cn } from "@/lib/utils";
import { ShopperIcon } from "@/images/shopper-logo";

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
          "relative text-2xl font-semibold tracking-tight flex items-center",
          tone === "light" ? "text-foreground" : "text-foreground",
        )}
      >
        {APP_NAME}
        <span
          className="absolute right-full top-1/2 mr-2 grid size-8 -translate-y-1/2 place-items-center rounded-xl bg-none "
          aria-hidden
        >
          {/* <ShoppingBag className="size-4" /> */}
          <ShopperIcon className="size-6" />
        </span>
      </span>
    </div>
  );
}
