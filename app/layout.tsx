import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "@/auth";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "ShopFlow", template: "%s · ShopFlow" },
};

async function SessionShell({ children }: { children: ReactNode }) {
  const session = await auth();
  return <Providers session={session}>{children}</Providers>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-canvas font-sans text-sm text-ink antialiased">
        <Suspense fallback={null}>
          <SessionShell>{children}</SessionShell>
        </Suspense>
      </body>
    </html>
  );
}
