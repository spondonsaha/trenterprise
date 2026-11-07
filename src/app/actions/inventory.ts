"use server";

import { MovementType, Unit } from "@prisma/client";
import type Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import { requireActionUser } from "@/lib/permissions";
import { adjustmentSchema, stockInSchema, stockOutSchema, type AdjustmentInput, type StockInInput, type StockOutInput } from "@/lib/validation";
import { D, round2, round4 } from "@/lib/money";
import { formatSequence, nextSequence } from "@/lib/sequence";
import { addStock, deductStock, setStockExact } from "@/lib/stock-service";
import { formatStock, saleLinePieces } from "@/lib/stock-math";
import { parseDateOnly } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";

function revalidateInventory(productId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (productId) revalidatePath(`/products/${productId}`);
}

export async function createStockIn(input: StockInInput): Promise<ActionResult<{ id: string; purchaseNumber: string }>> {
  try {
    const user = await requireActionUser();
    const data = stockInSchema.parse(input);
    const purchaseDate = parseDateOnly(data.date);
    if (!purchaseDate) throw new AppError("Enter a valid purchase date.");

    const result = await prisma.$transaction(async (tx) => {
      const supplier = data.supplierId
        ? await tx.supplier.findUnique({ where: { id: data.supplierId } })
        : null;
      if (data.supplierId && !supplier) throw new AppError("Selected supplier was not found.");

      const sequence = await nextSequence(tx, "purchase");
      const purchaseNumber = formatSequence("PO-", sequence);

      let totalCost = D(0);
      const prepared: {
        productId: string;
        productName: string;
        cartons: number;
        pieces: number;
        piecesPerCarton: number;
        totalPieces: number;
        costPerCarton: Decimal | null;
        costPerPiece: Decimal;
        lineTotal: Decimal;
        unit: Unit;
        quantity: number;
        unitCost: Decimal;
      }[] = [];

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new AppError("A selected product was not found.");
        if (product.isArchived) throw new AppError(`${product.name} is archived and cannot receive stock.`);

        const totalPieces = item.cartons * product.piecesPerCarton + item.pieces;
        const costPerCarton = item.costPerCarton != null ? round2(D(item.costPerCarton)) : null;
        const costPerPiece = costPerCarton
          ? round4(costPerCarton.div(product.piecesPerCarton))
          : D(0);
        const lineTotal = costPerCarton
          ? round2(costPerCarton.mul(item.cartons).add(costPerPiece.mul(item.pieces)))
          : D(0);

        totalCost = totalCost.add(lineTotal);
        prepared.push({
          productId: product.id,
          productName: product.name,
          cartons: item.cartons,
          pieces: item.pieces,
          piecesPerCarton: product.piecesPerCarton,
          totalPieces,
          costPerCarton,
          costPerPiece,
          lineTotal,
          unit: item.cartons > 0 ? Unit.CARTON : Unit.PIECE,
          quantity: item.cartons > 0 ? item.cartons : item.pieces,
          unitCost: item.cartons > 0 ? costPerCarton ?? D(0) : costPerPiece,
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: data.supplierId || null,
          purchaseDate,
          referenceNumber: data.referenceNumber || null,
          note: data.note || null,
          totalCost: round2(totalCost),
          createdById: user.id,
          items: {
            create: prepared.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              quantityPieces: item.totalPieces,
              unitCost: round4(item.unitCost),
              lineTotal: item.lineTotal,
            })),
          },
        },
      });

      for (const item of prepared) {
        await addStock(tx, item.productId, item.totalPieces);

        if (item.cartons > 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: MovementType.STOCK_IN,
              quantity: item.cartons,
              unit: Unit.CARTON,
              quantityPieces: item.cartons * item.piecesPerCarton,
              unitCost: item.costPerCarton ? round4(item.costPerCarton.div(item.piecesPerCarton)) : null,
              referenceType: "PURCHASE",
              referenceId: purchase.id,
              note: data.note || `Purchase ${purchaseNumber}`,
              userId: user.id,
              createdAt: purchaseDate,
            },
          });
        }

        if (item.pieces > 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: MovementType.STOCK_IN,
              quantity: item.pieces,
              unit: Unit.PIECE,
              quantityPieces: item.pieces,
              unitCost: item.costPerCarton ? round4(item.costPerCarton.div(item.piecesPerCarton)) : null,
              referenceType: "PURCHASE",
              referenceId: purchase.id,
              note: data.note || `Purchase ${purchaseNumber}`,
              userId: user.id,
              createdAt: purchaseDate,
            },
          });
        }

        if (data.updateCost && item.costPerCarton) {
          await tx.product.update({
            where: { id: item.productId },
            data: { costPrice: round4(item.costPerCarton.div(item.piecesPerCarton)) },
          });
        }
      }

      await writeAudit({
        tx,
        userId: user.id,
        action: "STOCK_IN",
        entityType: "Purchase",
        entityId: purchase.id,
        details: {
          purchaseNumber,
          items: prepared.length,
          totalCost: Number(round2(totalCost)),
          supplier: supplier?.name ?? null,
        },
      });

      return { id: purchase.id, purchaseNumber };
    });

    revalidateInventory();
    return actionOk(result);
  } catch (error) {
    return actionError(error);
  }
}

export async function createStockOut(input: StockOutInput): Promise<ActionResult<{ stockPieces: number }>> {
  try {
    const user = await requireActionUser();
    const data = stockOutSchema.parse(input);
    const settings = await getSettings();
    const date = parseDateOnly(data.date);
    if (!date) throw new AppError("Enter a valid date.");

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new AppError("Product not found.");
      if (product.isArchived || !product.active) throw new AppError("This product is not active.");

      const pieces = saleLinePieces(data.unit, data.quantity, product.piecesPerCarton);
      const newStock = await deductStock(tx, {
        productId: product.id,
        pieces,
        allowNegative: settings.allowNegativeStock,
        productName: product.name,
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: MovementType.STOCK_OUT,
          quantity: data.quantity,
          unit: data.unit === "CARTON" ? Unit.CARTON : Unit.PIECE,
          quantityPieces: -pieces,
          referenceType: "MANUAL",
          note: data.reason,
          userId: user.id,
          createdAt: date,
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "STOCK_OUT",
        entityType: "Product",
        entityId: product.id,
        details: {
          product: product.name,
          quantity: data.quantity,
          unit: data.unit,
          pieces,
          reason: data.reason,
          remaining: newStock,
        },
      });

      return { stockPieces: newStock };
    });

    revalidateInventory(data.productId);
    return actionOk(result);
  } catch (error) {
    return actionError(error);
  }
}

export async function adjustStock(input: AdjustmentInput): Promise<ActionResult<{ stockPieces: number; difference: number }>> {
  try {
    const user = await requireActionUser();
    const data = adjustmentSchema.parse(input);
    const date = parseDateOnly(data.date);
    if (!date) throw new AppError("Enter a valid date.");

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new AppError("Product not found.");

      const countedPieces = data.countedCartons * product.piecesPerCarton + data.countedPieces;
      const difference = countedPieces - product.stockPieces;
      if (difference === 0) {
        throw new AppError(
          `Counted stock matches the system balance (${formatStock(countedPieces, product.piecesPerCarton)}). No adjustment needed.`,
        );
      }

      const newStock = await setStockExact(tx, product.id, countedPieces);

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: MovementType.ADJUSTMENT,
          quantity: Math.abs(difference),
          unit: Unit.PIECE,
          quantityPieces: difference,
          referenceType: "ADJUSTMENT",
          note: data.reason,
          userId: user.id,
          createdAt: date,
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "STOCK_ADJUSTMENT",
        entityType: "Product",
        entityId: product.id,
        details: {
          product: product.name,
          oldPieces: product.stockPieces,
          countedPieces,
          difference,
          reason: data.reason,
        },
      });

      return { stockPieces: newStock, difference };
    });

    revalidateInventory(data.productId);
    return actionOk(result);
  } catch (error) {
    return actionError(error);
  }
}
