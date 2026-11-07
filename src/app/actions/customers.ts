"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, AppError, type ActionResult } from "@/lib/errors";
import { requireActionAdmin, requireActionUser } from "@/lib/permissions";
import { customerSchema, customerUpdateSchema, type CustomerInput, type CustomerUpdateInput } from "@/lib/validation";
import { D, round2 } from "@/lib/money";
import { writeAudit } from "@/lib/audit";
import { PermissionError } from "@/lib/errors";

export async function createCustomer(input: CustomerInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    const data = customerSchema.parse(input);
    if (user.role !== "ADMIN" && !data.active) {
      throw new PermissionError("Only admins can create an inactive customer.");
    }
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name: data.name,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
          openingBalance: round2(D(data.openingBalance)),
          active: data.active,
        },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "CUSTOMER_CREATED",
        entityType: "Customer",
        entityId: created.id,
        details: { name: created.name, openingBalance: Number(created.openingBalance) },
      });
      return created;
    });
    revalidatePath("/customers");
    revalidatePath("/invoices/new");
    return actionOk({ id: customer.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCustomer(input: CustomerUpdateInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    const data = customerUpdateSchema.parse(input);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { id: data.id } });
      if (!existing) throw new AppError("Customer not found.");
      if (user.role !== "ADMIN" && data.active !== existing.active) {
        throw new PermissionError("Only admins can activate or deactivate customers.");
      }
      await tx.customer.update({
        where: { id: data.id },
        data: {
          name: data.name,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
          openingBalance: round2(D(data.openingBalance)),
          active: data.active,
        },
      });
      await writeAudit({
        tx,
        userId: user.id,
        action: "CUSTOMER_UPDATED",
        entityType: "Customer",
        entityId: data.id,
        details: { name: data.name, openingBalance: Number(round2(D(data.openingBalance))) },
      });
    });
    revalidatePath("/customers");
    revalidatePath(`/customers/${data.id}`);
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(error);
  }
}

export async function setCustomerActive(id: string, active: boolean): Promise<ActionResult<undefined>> {
  try {
    const user = await requireActionAdmin();
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({ where: { id }, data: { active } });
      await writeAudit({
        tx,
        userId: user.id,
        action: active ? "CUSTOMER_ACTIVATED" : "CUSTOMER_DEACTIVATED",
        entityType: "Customer",
        entityId: id,
        details: { name: customer.name },
      });
    });
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return actionOk(undefined);
  } catch (error) {
    return actionError(error);
  }
}
