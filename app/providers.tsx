"use client";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider
      key={session?.user?.id ?? session?.user?.email ?? "anon"}
      session={session}
    >
      {children}
    </SessionProvider>
  );
}
