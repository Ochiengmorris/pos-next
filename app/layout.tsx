import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { auth } from "@/auth";
import { Providers } from "./providers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"], // soft, rounded serif like the poster
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: { default: "Shopper", template: "%s · ShopFlow" },
};

async function SessionShell({ children }: { children: ReactNode }) {
  const session = await auth();
  return <Providers session={session}>{children}</Providers>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-KE" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="bg-canvas font-sans text-sm text-ink antialiased">
        <Suspense fallback={null}>
          <SessionShell>{children}</SessionShell>
        </Suspense>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
