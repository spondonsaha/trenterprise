"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, type ActionResult } from "@/lib/errors";
import { requireActionAdmin } from "@/lib/permissions";
import { supplierSchema, supplierUpdateSchema, type SupplierInput, type SupplierUpdateInput } from "@/lib/validation";
import { writeAudit } from "@/lib/audit";

export async function createSupplier(input: SupplierInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionAdmin();
    const data = supplierSchema.parse(input);
    const supplier = await prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({
        data: {
          name: data.name,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
          active: data.active,
        },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "SUPPLIER_CREATED",
        entityType: "Supplier",
        entityId: created.id,
        details: { name: created.name },
      });
      return created;
    });
    revalidatePath("/suppliers");
    revalidatePath("/inventory/stock-in");
    return actionOk({ id: supplier.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function updateSupplier(input: SupplierUpdateInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionAdmin();
    const data = supplierUpdateSchema.parse(input);
    await prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id: data.id },
        data: {
          name: data.name,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
          active: data.active,
        },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "SUPPLIER_UPDATED",
        entityType: "Supplier",
        entityId: data.id,
        details: { name: data.name },
      });
    });
    revalidatePath("/suppliers");
    revalidatePath("/inventory/stock-in");
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(error);
  }
}
