"use server";

import { MovementType, Unit } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import { requireActionUser, requireDeletePermission, requirePricePermission } from "@/lib/permissions";
import {
  openingStockSchema,
  productSchema,
  productUpdateSchema,
  type OpeningStockInput,
  type ProductInput,
  type ProductUpdateInput,
} from "@/lib/validation";
import { D, round2, round4 } from "@/lib/money";
import { formatSequence, nextSequence } from "@/lib/sequence";
import { addStock } from "@/lib/stock-service";
import { writeAudit } from "@/lib/audit";

function generateSku(name: string): string {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "ITEM";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

function revalidateProducts(productId?: string) {
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  if (productId) revalidatePath(`/products/${productId}`);
}

export async function createProduct(
  input: ProductInput,
  openingStock?: OpeningStockInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    requirePricePermission(user);
    const data = productSchema.parse(input);
    const opening = openingStock ? openingStockSchema.parse(openingStock) : null;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku ? data.sku.toUpperCase() : generateSku(data.name),
          categoryId: data.categoryId || null,
          brand: data.brand ?? "",
          color: data.color ?? "",
          description: data.description || null,
          active: data.active,
          piecesPerCarton: data.piecesPerCarton,
          cartonPrice: round2(D(data.cartonPrice)),
          piecePrice: round2(D(data.piecePrice)),
          costPrice: round4(D(data.costPrice)),
          lowStockPieces: data.lowStockPieces,
        },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: created.id,
        details: { sku: created.sku, name: created.name },
      });

      if (opening) {
        const totalPieces =
          opening.cartons * created.piecesPerCarton + opening.pieces;
        const costPerCarton =
          opening.costPerCarton != null ? round2(D(opening.costPerCarton)) : null;
        const costPerPiece = costPerCarton
          ? round4(costPerCarton.div(created.piecesPerCarton))
          : null;
        const lineTotal = costPerCarton
          ? round2(
              costPerCarton
                .mul(opening.cartons)
                .add((costPerPiece ?? D(0)).mul(opening.pieces)),
            )
          : D(0);
        const purchaseDate = new Date();
        const sequence = await nextSequence(tx, "purchase");
        const purchaseNumber = formatSequence("PO-", sequence);
        const purchase = await tx.purchase.create({
          data: {
            purchaseNumber,
            purchaseDate,
            note: "Opening stock",
            totalCost: lineTotal,
            createdById: user.id,
            items: {
              create: [
                {
                  productId: created.id,
                  productName: created.name,
                  quantity: opening.cartons > 0 ? opening.cartons : opening.pieces,
                  unit: opening.cartons > 0 ? Unit.CARTON : Unit.PIECE,
                  quantityPieces: totalPieces,
                  unitCost: round4(
                    opening.cartons > 0 ? costPerCarton ?? D(0) : costPerPiece ?? D(0),
                  ),
                  lineTotal,
                },
              ],
            },
          },
        });

        await addStock(tx, created.id, totalPieces);

        if (opening.cartons > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              type: MovementType.STOCK_IN,
              quantity: opening.cartons,
              unit: Unit.CARTON,
              quantityPieces: opening.cartons * created.piecesPerCarton,
              unitCost: costPerPiece,
              referenceType: "PURCHASE",
              referenceId: purchase.id,
              note: "Opening stock",
              userId: user.id,
              createdAt: purchaseDate,
            },
          });
        }

        if (opening.pieces > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              type: MovementType.STOCK_IN,
              quantity: opening.pieces,
              unit: Unit.PIECE,
              quantityPieces: opening.pieces,
              unitCost: costPerPiece,
              referenceType: "PURCHASE",
              referenceId: purchase.id,
              note: "Opening stock",
              userId: user.id,
              createdAt: purchaseDate,
            },
          });
        }

        if (costPerPiece) {
          await tx.product.update({
            where: { id: created.id },
            data: { costPrice: costPerPiece },
          });
        }

        await writeAudit({
          tx,
          userId: user.id,
          action: "STOCK_IN",
          entityType: "Purchase",
          entityId: purchase.id,
          details: {
            purchaseNumber,
            items: 1,
            totalCost: Number(lineTotal),
            product: created.name,
          },
        });
      }

      return created;
    });

    revalidateProducts(product.id);
    return actionOk({ id: product.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProduct(input: ProductUpdateInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    requirePricePermission(user);
    const data = productUpdateSchema.parse(input);

    const existing = await prisma.product.findUnique({ where: { id: data.id } });
    if (!existing) throw new AppError("Product not found.");

    const pricesChanged =
      !round2(D(existing.cartonPrice)).eq(round2(D(data.cartonPrice))) ||
      !round2(D(existing.piecePrice)).eq(round2(D(data.piecePrice)));

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          sku: data.sku ? data.sku.toUpperCase() : existing.sku,
          categoryId: data.categoryId || null,
          brand: data.brand ?? "",
          color: data.color ?? "",
          description: data.description || null,
          active: data.active,
          piecesPerCarton: data.piecesPerCarton,
          cartonPrice: round2(D(data.cartonPrice)),
          piecePrice: round2(D(data.piecePrice)),
          costPrice: round4(D(data.costPrice)),
          lowStockPieces: data.lowStockPieces,
        },
      });
      if (pricesChanged) {
        await tx.priceHistory.create({
          data: {
            productId: data.id,
            oldCartonPrice: round2(D(existing.cartonPrice)),
            newCartonPrice: round2(D(data.cartonPrice)),
            oldPiecePrice: round2(D(existing.piecePrice)),
            newPiecePrice: round2(D(data.piecePrice)),
            note: "Updated from product form",
            changedById: user.id,
          },
        });
      }
      await writeAudit({
        tx,
        userId: user.id,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: data.id,
        details: { sku: data.sku, pricesChanged },
      });
    });

    revalidateProducts(data.id);
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function archiveProduct(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionUser();
    requireDeletePermission(user);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError("Product not found.");

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isArchived: true, active: false },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "PRODUCT_ARCHIVED",
        entityType: "Product",
        entityId: id,
        details: { sku: product.sku, name: product.name },
      });
    });

    revalidateProducts(id);
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}

export async function restoreProduct(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionUser();
    requireDeletePermission(user);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError("Product not found.");

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isArchived: false, active: true },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "PRODUCT_RESTORED",
        entityType: "Product",
        entityId: id,
        details: { sku: product.sku },
      });
    });

    revalidateProducts(id);
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
