import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { auth } from "@/auth";
import { Providers } from "./providers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
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
    <html lang="en-KE" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-background font-sans text-sm text-foreground antialiased">
        {" "}
        <Suspense fallback={null}>
          <SessionShell>{children}</SessionShell>
        </Suspense>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
