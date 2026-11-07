import "server-only";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import {
  checkLoginAllowed,
  registerLoginFailure,
  resetLoginAttempts,
} from "./rate-limit";
import { loginSchema } from "./validation";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        if (!checkLoginAllowed(email)) {
          throw new Error("Too many failed attempts. Please try again in 15 minutes.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) {
          registerLoginFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          registerLoginFailure(email);
          return null;
        }

        resetLoginAttempts(email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          canOverridePrice: user.canOverridePrice,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.canOverridePrice = user.canOverridePrice;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = token.role ?? "STAFF";
        session.user.canOverridePrice = Boolean(token.canOverridePrice);
      }
      return session;
    },
  },
};
