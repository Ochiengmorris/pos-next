// auth.ts
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@/lib/access";

type AuthToken = {
  id?: string;
  role?: Role; // was string
  accessToken?: string;
  accessTokenExpires?: number;
  error?: "AccessTokenExpired";
};
// Custom codes reach the login page so it can show a specific message
class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}
class ApiUnreachable extends CredentialsSignin {
  code = "api_unreachable";
}

// The backend JWT carries its own expiry; we read it without verifying
// (we just received it from our own API over a server-to-server call)
function jwtExpiryMs(token: string): number {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  return payload.exp * 1000;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // needed when deployed behind your own proxy
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // match backend JWT_EXPIRES_IN
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        let res: Response;
        try {
          res = await fetch(`${process.env.API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            cache: "no-store",
          });
        } catch {
          throw new ApiUnreachable();
        }

        if (res.status === 429) throw new TooManyAttempts();
        if (!res.ok) return null; // 401 etc. becomes "invalid email or password"

        const data = await res.json();
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          accessToken: data.accessToken,
          accessTokenExpires: jwtExpiryMs(data.accessToken),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const jwtToken = token as AuthToken;

      if (user) {
        // first call after sign-in: copy what we need from authorize()
        return {
          ...jwtToken,
          id: user.id!,
          role: user.role,
          accessToken: user.accessToken,
          accessTokenExpires: user.accessTokenExpires,
        };
      }

      // backend token expired (30s margin): flag it; there are no refresh tokens
      if (Date.now() >= (jwtToken.accessTokenExpires ?? 0) - 30_000) {
        return { ...jwtToken, error: "AccessTokenExpired" };
      }
      return jwtToken;
    },
    async session({ session, token }) {
      const t = token as AuthToken;
      // always set at sign-in by the jwt callback above
      session.user.id = t.id!;
      session.user.role = t.role!;
      session.accessToken = t.accessToken!;
      session.error = t.error;
      return session;
    },
  },
});
