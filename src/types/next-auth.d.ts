import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "STAFF";
      canOverridePrice: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "STAFF";
    canOverridePrice: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "STAFF";
    canOverridePrice?: boolean;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  canOverridePrice: boolean;
};
