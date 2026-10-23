import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  // base: no shadow, no border color, no press effect
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 text-sm font-bold transition-all " +
    "disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "pop-btn bg-primary text-primary-foreground hover:brightness-95",
        secondary: "pop-btn bg-secondary text-secondary-foreground",
        accent: "pop-btn bg-accent text-accent-foreground",
        outline: "pop-btn bg-card text-foreground hover:bg-muted",
        destructive: "pop-btn bg-destructive text-destructive-foreground",
        // flat variants: no shadow, no visible border, no press shift
        ghost: "border-transparent hover:bg-muted",
        link: "border-transparent text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
