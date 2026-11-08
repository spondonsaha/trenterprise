import "server-only";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import type { SessionUser } from "@/types/next-auth";
import { authOptions } from "./auth";

export async function getApiSessionUser(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<SessionUser | null> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role ?? "STAFF",
    canOverridePrice: Boolean(session.user.canOverridePrice),
  };
}
