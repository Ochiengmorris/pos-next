import type { DefaultSession } from "next-auth";

type Role = "ADMIN" | "MANAGER" | "CASHIER";

declare module "next-auth" {
  interface User {
    role: Role;
    accessToken: string;
    accessTokenExpires: number;
  }
  interface Session {
    accessToken: string;
    error?: string;
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    accessToken: string;
    accessTokenExpires: number;
    error?: string;
  }
}
