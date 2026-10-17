// proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PUBLIC_PATHS, ROUTE_ROLES, canAccess, homeFor } from "@/lib/access";

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;
  const loggedIn = !!session && !session.error; // an expired backend token counts as logged out
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!loggedIn) {
    if (isPublic) return NextResponse.next();
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  // a temporary password must be replaced before anything else
  if (
    session.user.mustChangePassword &&
    !pathname.startsWith("/change-password")
  ) {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  // already signed in: skip the login page
  if (pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL(homeFor(session.user.role), req.url));
  }

  const rule = ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));
  if (rule && !canAccess(session.user.role, rule.roles)) {
    return NextResponse.redirect(new URL(homeFor(session.user.role), req.url));
  }
  return NextResponse.next();
});

export const config = {
  // everything except Auth.js routes, Next internals and files with an extension
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
