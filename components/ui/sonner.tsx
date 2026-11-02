"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          // Base toast styling using design tokens
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",

          // Success (leaf green)
          "--success-bg": "var(--success)",
          "--success-text": "var(--success-foreground)",
          "--success-border": "var(--success)",

          // Error/Destructive (tomato red)
          "--error-bg": "var(--destructive)",
          "--error-text": "var(--destructive-foreground)",
          "--error-border": "var(--destructive)",

          // Warning (mango/amber)
          "--warning-bg": "var(--primary)",
          "--warning-text": "var(--primary-foreground)",
          "--warning-border": "var(--primary)",

          // Info (ink blue-ish)
          "--info-bg": "var(--secondary)",
          "--info-text": "var(--secondary-foreground)",
          "--info-border": "var(--secondary)",

          // Loading
          "--loading-bg": "var(--muted)",
          "--loading-text": "var(--muted-foreground)",
          "--loading-border": "var(--border)",

          // Border radius
          "--border-radius": "var(--radius)",

          // Pop shadow for all toasts
          "--shadow": "var(--pop-shadow)",
          "--shadow-sm": "var(--pop-shadow-sm)",

          // Toast offset/gap
          "--toast-gap": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group relative flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-pop transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
          description: "text-sm opacity-90",
          actionButton: "btn btn-sm",
          cancelButton: "btn btn-sm btn-ghost",
          closeButton: "size-5 opacity-50 hover:opacity-100 transition-opacity",
          icon: "size-4 shrink-0",
          loader: "size-4 animate-spin",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }