import type { DefaultSession } from "next-auth";

type Role = "ADMIN" | "MANAGER" | "CASHIER";

declare module "next-auth" {
  interface User {
    role: Role;
    accessToken: string;
    accessTokenExpires: number;
    mustChangePassword?: boolean;
  }
  interface Session {
    accessToken: string;
    error?: string;
    user: { id: string; role: Role } & DefaultSession["user"];
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    accessToken: string;
    accessTokenExpires: number;
    error?: string;
    mustChangePassword?: boolean;
  }
}
