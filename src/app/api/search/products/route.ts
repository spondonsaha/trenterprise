import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();

  const products = await prisma.product.findMany({
    where: {
      active: true,
      isArchived: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { sku: { contains: query, mode: "insensitive" as const } },
              { brand: { contains: query, mode: "insensitive" as const } },
              { color: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 12,
    select: {
      id: true,
      name: true,
      sku: true,
      brand: true,
      color: true,
      piecesPerCarton: true,
      cartonPrice: true,
      piecePrice: true,
      stockPieces: true,
      lowStockPieces: true,
    },
  });

  return Response.json({
    items: products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      color: product.color,
      piecesPerCarton: product.piecesPerCarton,
      cartonPrice: product.cartonPrice.toString(),
      piecePrice: product.piecePrice.toString(),
      stockPieces: product.stockPieces,
      lowStockPieces: product.lowStockPieces,
    })),
  });
}
