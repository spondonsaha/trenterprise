import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();

  const customers = await prisma.customer.findMany({
    where: {
      active: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } },
              { contactPerson: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 12,
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      email: true,
      contactPerson: true,
    },
  });

  return Response.json({ items: customers });
}
