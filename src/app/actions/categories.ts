"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import {
  requireActionUser,
  requireDeletePermission,
  requirePricePermission,
} from "@/lib/permissions";
import {
  categorySchema,
  categoryUpdateSchema,
  type CategoryInput,
  type CategoryUpdateInput,
} from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

function revalidateCategories() {
  revalidatePath("/products");
  revalidatePath("/products/new");
  revalidatePath("/inventory");
}

export async function createCategory(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    requirePricePermission(user);
    const data = categorySchema.parse(input);

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: { name: data.name, description: data.description || null },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "CATEGORY_CREATED",
        entityType: "Category",
        entityId: created.id,
        details: { name: created.name },
      });
      return created;
    });

    revalidateCategories();
    return actionOk({ id: category.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCategory(
  input: CategoryUpdateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    requirePricePermission(user);
    const data = categoryUpdateSchema.parse(input);

    const existing = await prisma.category.findUnique({ where: { id: data.id } });
    if (!existing) throw new AppError("Category not found.");

    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: data.id },
        data: { name: data.name, description: data.description || null },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "CATEGORY_UPDATED",
        entityType: "Category",
        entityId: data.id,
        details: { oldName: existing.name, newName: data.name },
      });
    });

    revalidateCategories();
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionUser();
    requireDeletePermission(user);
    if (!id) throw new AppError("Category is required.");

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new AppError("Category not found.");
    if (existing._count.products > 0) {
      throw new AppError(
        "This category still has products. Move them to another category before deleting it.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await writeAudit({
        tx,
        userId: user.id,
        action: "CATEGORY_DELETED",
        entityType: "Category",
        entityId: id,
        details: { name: existing.name },
      });
    });

    revalidateCategories();
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
