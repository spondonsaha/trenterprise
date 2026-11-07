import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/next-auth";
import { authOptions } from "./auth";
import { AppError, PermissionError } from "./errors";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role ?? "STAFF",
    canOverridePrice: Boolean(session.user.canOverridePrice),
  };
}

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePageAdmin(): Promise<SessionUser> {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requireActionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError("You must be signed in to do that.");
  return user;
}

export async function requireActionAdmin(): Promise<SessionUser> {
  const user = await requireActionUser();
  if (user.role !== "ADMIN") throw new PermissionError("Only admins can perform this action.");
  return user;
}

export function canOverridePrice(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.canOverridePrice;
}

export function requirePricePermission(user: SessionUser): void {
  if (!canOverridePrice(user)) {
    throw new PermissionError("You do not have permission to change prices.");
  }
}

export function requireDeletePermission(user: SessionUser): void {
  if (user.role !== "ADMIN") {
    throw new PermissionError("Only admins can archive, cancel or delete records.");
  }
}
