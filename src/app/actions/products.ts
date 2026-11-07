"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import { requireActionUser, requireDeletePermission, requirePricePermission } from "@/lib/permissions";
import { productSchema, productUpdateSchema, type ProductInput, type ProductUpdateInput } from "@/lib/validation";
import { D, round2, round4 } from "@/lib/money";
import { writeAudit } from "@/lib/audit";

function revalidateProducts(productId?: string) {
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  if (productId) revalidatePath(`/products/${productId}`);
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    requirePricePermission(user);
    const data = productSchema.parse(input);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku.toUpperCase(),
          categoryId: data.categoryId || null,
          brand: data.brand,
          color: data.color,
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
          sku: data.sku.toUpperCase(),
          categoryId: data.categoryId || null,
          brand: data.brand,
          color: data.color,
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
