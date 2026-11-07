import "server-only";
import type { Prisma } from "@prisma/client";
import { StockError } from "./errors";
import { formatStock } from "./stock-math";

export async function addStock(
  tx: Prisma.TransactionClient,
  productId: string,
  pieces: number,
): Promise<number> {
  if (!Number.isInteger(pieces) || pieces <= 0) {
    throw new StockError("Stock quantity must be a positive whole number of pieces.");
  }
  const updated = await tx.product.update({
    where: { id: productId },
    data: { stockPieces: { increment: pieces } },
    select: { stockPieces: true },
  });
  return updated.stockPieces;
}

export async function deductStock(
  tx: Prisma.TransactionClient,
  args: {
    productId: string;
    pieces: number;
    allowNegative: boolean;
    productName?: string;
  },
): Promise<number> {
  const { productId, pieces, allowNegative } = args;
  if (!Number.isInteger(pieces) || pieces <= 0) {
    throw new StockError("Sale quantity must be a positive whole number of pieces.");
  }

  const rows = await tx.$queryRaw<{ stockPieces: number }[]>`
    UPDATE "Product"
    SET "stockPieces" = "stockPieces" - ${pieces},
        "updatedAt" = NOW()
    WHERE "id" = ${productId}
      AND "isArchived" = false
      AND "active" = true
      AND (${allowNegative} = true OR "stockPieces" >= ${pieces})
    RETURNING "stockPieces"
  `;

  if (rows.length === 0) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true, stockPieces: true, piecesPerCarton: true, active: true, isArchived: true },
    });
    if (!product) throw new StockError("Product not found.");
    if (!product.active || product.isArchived) {
      throw new StockError(`${product.name} is not available for sale.`);
    }
    throw new StockError(
      `Insufficient stock for ${product.name}. Available: ${formatStock(
        product.stockPieces,
        product.piecesPerCarton,
      )}; required: ${formatStock(pieces, product.piecesPerCarton)}.`,
    );
  }

  return rows[0].stockPieces;
}

export async function setStockExact(
  tx: Prisma.TransactionClient,
  productId: string,
  targetPieces: number,
): Promise<number> {
  if (!Number.isInteger(targetPieces) || targetPieces < 0) {
    throw new StockError("Counted stock cannot be negative.");
  }
  const rows = await tx.$queryRaw<{ stockPieces: number }[]>`
    UPDATE "Product"
    SET "stockPieces" = ${targetPieces},
        "updatedAt" = NOW()
    WHERE "id" = ${productId}
    RETURNING "stockPieces"
  `;
  if (rows.length === 0) throw new StockError("Product not found.");
  return rows[0].stockPieces;
}
