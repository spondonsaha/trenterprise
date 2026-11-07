"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import { requireActionUser, requirePricePermission } from "@/lib/permissions";
import { bulkRateSchema, rateUpdateSchema, type BulkRateInput, type RateUpdateInput } from "@/lib/validation";
import { D, round2 } from "@/lib/money";
import { writeAudit } from "@/lib/audit";

function revalidateRates(productId?: string) {
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (productId) revalidatePath(`/products/${productId}`);
}

export async function updateRate(input: RateUpdateInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    requirePricePermission(user);
    const data = rateUpdateSchema.parse(input);

    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id: data.productId } });
      if (!existing) throw new AppError("Product not found.");

      const newCartonPrice = round2(D(data.cartonPrice));
      const newPiecePrice = round2(D(data.piecePrice));

      if (
        round2(D(existing.cartonPrice)).eq(newCartonPrice) &&
        round2(D(existing.piecePrice)).eq(newPiecePrice)
      ) {
        throw new AppError("The new rates are the same as the current rates.");
      }

      const updated = await tx.product.update({
        where: { id: data.productId },
        data: { cartonPrice: newCartonPrice, piecePrice: newPiecePrice },
      });

      await tx.priceHistory.create({
        data: {
          productId: data.productId,
          oldCartonPrice: existing.cartonPrice,
          newCartonPrice,
          oldPiecePrice: existing.piecePrice,
          newPiecePrice,
          note: data.note || null,
          changedById: user.id,
        },
      });

      await writeAudit({
        tx,
        userId: user.id,
        action: "RATE_CHANGE",
        entityType: "Product",
        entityId: data.productId,
        details: {
          oldCartonPrice: Number(existing.cartonPrice),
          newCartonPrice: Number(newCartonPrice),
          oldPiecePrice: Number(existing.piecePrice),
          newPiecePrice: Number(newPiecePrice),
          note: data.note ?? null,
        },
      });

      return updated;
    });

    revalidateRates(product.id);
    return actionOk({ id: product.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function bulkUpdateRates(input: BulkRateInput): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await requireActionUser();
    requirePricePermission(user);
    const data = bulkRateSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: data.productIds }, isArchived: false },
      });
      if (products.length === 0) throw new AppError("No active products selected.");

      let updatedCount = 0;

      for (const product of products) {
        const factor = D(1).add(D(data.value).div(100));
        const nextCartonPrice =
          data.field === "PIECE"
            ? round2(D(product.cartonPrice))
            : data.mode === "FIXED"
              ? round2(D(data.value))
              : round2(D(product.cartonPrice).mul(factor));
        const nextPiecePrice =
          data.field === "CARTON"
            ? round2(D(product.piecePrice))
            : data.mode === "FIXED"
              ? round2(D(data.value))
              : round2(D(product.piecePrice).mul(factor));

        if (
          round2(D(product.cartonPrice)).eq(nextCartonPrice) &&
          round2(D(product.piecePrice)).eq(nextPiecePrice)
        ) {
          continue;
        }

        await tx.product.update({
          where: { id: product.id },
          data: { cartonPrice: nextCartonPrice, piecePrice: nextPiecePrice },
        });
        await tx.priceHistory.create({
          data: {
            productId: product.id,
            oldCartonPrice: product.cartonPrice,
            newCartonPrice: nextCartonPrice,
            oldPiecePrice: product.piecePrice,
            newPiecePrice: nextPiecePrice,
            note: data.note || "Bulk rate update",
            changedById: user.id,
          },
        });
        await writeAudit({
          tx,
          userId: user.id,
          action: "RATE_CHANGE",
          entityType: "Product",
          entityId: product.id,
          details: {
            mode: data.mode,
            field: data.field,
            value: data.value,
            oldCartonPrice: Number(product.cartonPrice),
            newCartonPrice: Number(nextCartonPrice),
            oldPiecePrice: Number(product.piecePrice),
            newPiecePrice: Number(nextPiecePrice),
            note: data.note ?? "Bulk rate update",
          },
        });
        updatedCount += 1;
      }

      return { updated: updatedCount };
    });

    revalidateRates();
    return actionOk(result);
  } catch (error) {
    return actionError(error);
  }
}
