import { ScanBarcode, Smartphone, TrendingUp } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const POINTS = [
  { icon: ScanBarcode, text: "Scan products and sell in seconds" },
  { icon: Smartphone, text: "Take cash, card and M-Pesa" },
  { icon: TrendingUp, text: "See sales and stock at a glance" },

  { icon: TrendingUp, text: "See sales and stock at a glance" },
];

export function LoginHero() {
  return (
    <section className="relative hidden flex-col justify-center overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex xl:p-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/30 blur-3xl"
      />

      <div className="relative max-w-lg">
        <Logo tone="light" />

        <p className="mt-14 text-4xl font-semibold leading-tight tracking-tight xl:text-[44px]">
          Simple. Fast.
          <br />
          Everywhere.
        </p>
        <p className="mt-5 text-base leading-relaxed text-sidebar-foreground/75">
          A modern POS and business management system for retail shops. Sell,
          track, and grow, all in one place.
        </p>

        {/* <ul className="mt-10 grid gap-3">
          {POINTS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-4 rounded-xl border border-sidebar-border bg-sidebar-accent p-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-base font-medium">{text}</span>
            </li>
          ))}
        </ul> */}
      </div>
    </section>
  );
}
